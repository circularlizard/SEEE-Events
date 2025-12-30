import type { AuthOptions, DefaultUser } from 'next-auth'
import type { JWT as BaseJWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getMockUser } from '@/mocks/mockSession'
import { setOAuthData, type OAuthData, getSessionVersion } from './redis'
import { DEFAULT_APP_FOR_ROLE, type AppKey } from '@/types/app'

/**
 * Extended JWT type with our custom fields
 */
interface JWT extends BaseJWT {
  roleSelection?: 'admin' | 'standard'
  scopes?: string[]
  sessionVersion?: number
  appSelection?: AppKey
}

/**
 * Extended user type with OSM-specific fields
 */
export interface ExtendedUser extends DefaultUser {
  sections?: OAuthData['sections']
  sectionIds?: number[]
  scopes?: string[]
  roleSelection?: 'admin' | 'standard'
  appSelection?: AppKey
}

/**
 * OSM OAuth profile response shape
 */
interface OsmOAuthProfile {
  status?: boolean
  error?: string
  data?: {
    user_id?: string | number
    full_name?: string
    email?: string
    profile_picture_url?: string
    sections?: Array<{ section_id: number; section_name?: string; [key: string]: unknown }>
    scopes?: string[]
    has_parent_access?: boolean
    has_section_access?: boolean
  }
  meta?: unknown
}

/**
 * Section type from OSM
 */
interface OsmSection {
  section_id: number
  section_name?: string
  [key: string]: unknown
}

/**
 * Role-based scope calculator
 * Determines OAuth scopes based on selected user role
 */
function getScopesForRole(role: 'admin' | 'standard'): string[] {
  if (role === 'admin') {
    return [
      'section:event:read',
      'section:member:read',
      'section:programme:read',
      'section:flexirecord:read',
    ]
  }
  // Standard viewer - minimal scope
  return ['section:event:read']
}

/**
 * NextAuth Configuration for SEEE Expedition Dashboard
 * 
 * Authentication Strategy:
 * - OAuth 2.0 with Online Scout Manager (OSM) as provider
 * - Token rotation to handle 1-hour access token expiry
 * - Refresh tokens are used to obtain new access tokens automatically
 * 
 * Security Notes:
 * - All tokens are stored in encrypted JWT session cookies
 * - Refresh token rotation prevents token replay attacks
 * - Session max age is set to match refresh token lifetime
 */

const OSM_OAUTH_URL = process.env.OSM_OAUTH_URL || 'https://www.onlinescoutmanager.co.uk/oauth'
const MOCK_AUTH_ENABLED = process.env.MOCK_AUTH_ENABLED === 'true'

/**
 * Refresh the access token using the refresh token
 * Called automatically when access token expires
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(`${OSM_OAUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
        client_id: process.env.OSM_CLIENT_ID!,
        client_secret: process.env.OSM_CLIENT_SECRET!,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw new Error('Failed to refresh access token')
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token if new one not provided
    }
  } catch (error) {
    console.error('Error refreshing access token:', error)

    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

/**
 * Build the providers array based on environment configuration
 * - If MOCK_AUTH_ENABLED=true: Use credentials provider with mock data
 * - Otherwise: Use OSM OAuth provider with dynamic scope selection
 */
function getProviders(): AuthOptions['providers'] {
  if (MOCK_AUTH_ENABLED) {
    return [
      CredentialsProvider({
        id: 'credentials',
        name: 'Mock Login',
        credentials: {
          username: { label: 'Username', type: 'text', placeholder: 'admin, standard, readonly, or multiSection' },
          password: { label: 'Password', type: 'password' },
          roleSelection: { label: 'Role Selection', type: 'text', placeholder: 'admin or standard' },
        },
        async authorize(credentials) {
          const username = credentials?.username as string
          const roleSelection = (credentials?.roleSelection || 'standard') as 'admin' | 'standard'
          const mockUser = getMockUser(username)
          
          return {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            image: mockUser.image,
            sections: mockUser.sections,
            scopes: getScopesForRole(roleSelection),
            roleSelection,
            appSelection: DEFAULT_APP_FOR_ROLE[roleSelection],
          }
        },
      }),
    ]
  }

  // Production: OSM OAuth providers - separate provider per role
  // This allows different OAuth scopes to be requested based on user's role selection
  
  const createOAuthProvider = (role: 'admin' | 'standard') => ({
    id: role === 'admin' ? 'osm-admin' : 'osm-standard',
    name: `Online Scout Manager (${role === 'admin' ? 'Administrator' : 'Standard Viewer'})`,
    type: 'oauth' as const,
    version: '2.0',
    authorization: {
      url: `${OSM_OAUTH_URL}/oauth/authorize`,
      params: {
        scope: getScopesForRole(role).join(' '),
      },
    },
    token: {
      url: `${OSM_OAUTH_URL}/oauth/token`,
    },
    userinfo: {
      url: `${OSM_OAUTH_URL}/oauth/resource`,
    },
    clientId: process.env.OSM_CLIENT_ID,
    clientSecret: process.env.OSM_CLIENT_SECRET,
    async profile(profile: OsmOAuthProfile, tokens: { access_token?: string }): Promise<ExtendedUser> {
      // OSM returns { status, error, data: { user_id, full_name, email, sections, ... }, meta }
      const data = profile.data || {}
      const userId = String(data.user_id || 'unknown')
      
      // Store full OAuth data in Redis (avoids JWT size limits)
      if (userId !== 'unknown') {
        try {
          await setOAuthData(userId, {
            sections: data.sections || [],
            scopes: data.scopes || [],
            has_parent_access: data.has_parent_access,
            has_section_access: data.has_section_access,
          }, 86400) // 24 hours
        } catch (error) {
          console.error('[OAuth] Failed to store OAuth data in Redis:', error)
        }
      }
      
      return {
        id: userId,
        name: data.full_name || 'OSM User',
        email: data.email ?? null,
        image: data.profile_picture_url ?? null,
        // Store section IDs and role in user object
        sectionIds: (data.sections || []).map((s: OsmSection) => s.section_id),
        scopes: data.scopes || [],
        roleSelection: role, // Embed role in user profile
        // appSelection will be set in JWT callback from URL params
      }
    },
  })

  return [
    createOAuthProvider('admin'),
    createOAuthProvider('standard'),
  ] as AuthOptions['providers']
}

export function getAuthConfig(): AuthOptions {
  return {
    providers: getProviders(),
    callbacks: {
    /**
     * Redirect callback: Intercept the post-OAuth redirect to preserve app selection
     * Extract appSelection from callback URL and preserve it in the redirect
     */
    async redirect({ url, baseUrl }) {
      // Extract appSelection from callback URL if present
      const callbackUrl = new URL(url.startsWith('http') ? url : `${baseUrl}${url}`)
      const appSelection = callbackUrl.searchParams.get('appSelection')
      
      if (appSelection) {
        // Preserve appSelection in the final redirect URL
        const finalUrl = url.startsWith(baseUrl) ? url : baseUrl
        const finalUrlObj = new URL(finalUrl.startsWith('http') ? finalUrl : `${baseUrl}${finalUrl}`)
        finalUrlObj.searchParams.set('appSelection', appSelection)
        return finalUrlObj.toString()
      }
      
      return url.startsWith(baseUrl) ? url : baseUrl
    },

    /**
     * SignIn callback: Runs during OAuth callback after user authenticates
     */
    async signIn({ account }) {
      if (account?.provider === 'osm') {
        console.log('[SignIn] OSM authentication successful')
      }
      return true
    },

    async jwt({ token, account, user, trigger }) {
      // During OAuth initial sign-in, read role from user profile
      if (account && user && !token.roleSelection) {
        // Role is embedded in user profile by the OAuth provider
        const extUser = user as ExtendedUser
        const roleSelection = extUser.roleSelection || 'standard'
        const scopes = getScopesForRole(roleSelection)
        
        // Get current session version from Redis
        const currentVersion = await getSessionVersion()
        
        token.roleSelection = roleSelection
        token.scopes = scopes
        token.sessionVersion = currentVersion
        
        // appSelection comes from the user object if set (mock auth)
        // or will be set below from trigger data (real OAuth)
        token.appSelection = extUser.appSelection ?? DEFAULT_APP_FOR_ROLE[roleSelection]
        
        console.log(`[JWT] Provider: ${account.provider}, Role: "${roleSelection}", App: "${token.appSelection}", Scopes: ${scopes.join(', ')}`)
      }
      
      // Validate session version on every request
      if (typeof token.sessionVersion === 'number') {
        const currentVersion = await getSessionVersion()
        if (token.sessionVersion < currentVersion) {
          // Session is from before the last restart, invalidate it
          console.log(`[JWT] Session version mismatch: ${token.sessionVersion} < ${currentVersion}, invalidating session`)
          return {
            ...token,
            error: 'SessionExpired',
            accessToken: undefined,
            refreshToken: undefined,
            accessTokenExpires: 0,
            user: undefined,
          }
        }
      }
      // Mock authentication: skip token rotation
      if (MOCK_AUTH_ENABLED) {
        if (account && user) {
          // For mock mode, store full sections in Redis too
          const extUser = user as ExtendedUser
          const userId = extUser.id ?? 'unknown'
          try {
            await setOAuthData(userId, {
              sections: extUser.sections || [],
              scopes: extUser.scopes || [],
            }, 86400)
          } catch (error) {
            console.error('[Mock Auth] Failed to store OAuth data in Redis:', error)
          }
          const currentVersion = await getSessionVersion()
          
          // Initial sign-in: set mock tokens
          return {
            ...token,
            accessToken: 'mock-access-token',
            accessTokenExpires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
            refreshToken: 'mock-refresh-token',
            user,
            sectionIds: (extUser.sections || []).map((s: OsmSection) => s.section_id),
            scopes: extUser.scopes || [],
            roleSelection: extUser.roleSelection || 'standard',
            appSelection: extUser.appSelection ?? DEFAULT_APP_FOR_ROLE[extUser.roleSelection || 'standard'],
            sessionVersion: currentVersion,
          }
        }
        // Subsequent requests: ensure accessToken is always present
        if (!token.accessToken) {
          token.accessToken = 'mock-access-token'
          token.accessTokenExpires = Date.now() + 30 * 24 * 60 * 60 * 1000
          token.refreshToken = 'mock-refresh-token'
        }
        return token
      }

      // Real OAuth: Initial sign in
      if (account && user) {
        const extUser = user as ExtendedUser
        const roleSelection = extUser.roleSelection || 'standard'
        const scopes = getScopesForRole(roleSelection)
        const currentVersion = await getSessionVersion()
        
        return {
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          refreshToken: account.refresh_token,
          user,
          // Store only section IDs in JWT (full data is in Redis)
          sectionIds: extUser.sectionIds || [],
          scopes,
          roleSelection,
          appSelection: extUser.appSelection ?? DEFAULT_APP_FOR_ROLE[roleSelection],
          sessionVersion: typeof token.sessionVersion === 'number' ? token.sessionVersion : currentVersion,
        }
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Access token has expired, try to refresh it
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      if (token.user && typeof token.user === 'object' && 'id' in token.user) {
        const user = token.user as { id: string; name?: string | null; email?: string | null; image?: string | null }
        session.user = {
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          image: user.image ?? null,
          // AdapterUser requires emailVerified; OSM profile doesn't include it
          // Use null to indicate unknown verification status
          emailVerified: null as unknown as Date | null,
        } as unknown as typeof session.user
      }
      session.accessToken = token.accessToken as string
      session.error = token.error as string | undefined
      // Store only section IDs in session (full data fetched from Redis when needed)
      session.sectionIds = token.sectionIds as number[] | undefined
      session.scopes = token.scopes as string[] | undefined
      session.roleSelection = token.roleSelection as 'admin' | 'standard' | undefined
      session.appSelection = (token as JWT).appSelection

      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60, // 30 days (matches typical refresh token lifetime)
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
}

export const authConfig = getAuthConfig()

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { AppKey } from '@/types/app'
import { getDefaultPathForApp, getRequiredAppForPath, getRequiredRoleForPath, isRoleAllowed } from '@/lib/app-route-guards'

/**
 * Middleware for route protection and authentication
 * 
 * Protected Routes:
 * - /dashboard/* - Requires authentication
 * - /api/proxy/* - Requires authentication (already has additional safety checks)
 * 
 * Public Routes:
 * - / - Landing/login page
 * - /api/auth/* - NextAuth.js routes
 * 
 * Unauthenticated users are redirected to the sign-in page
 */

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isAuthenticated = !!token
  const tokenApp = (token as { appSelection?: AppKey } | null)?.appSelection ?? null
  const tokenRoleRaw = (token as { roleSelection?: string; userRole?: string } | null)?.roleSelection ??
    (token as { roleSelection?: string; userRole?: string } | null)?.userRole ??
    null
  const tokenRole =
    tokenRoleRaw === 'admin' || tokenRoleRaw === 'standard' || tokenRoleRaw === 'readonly'
      ? tokenRoleRaw
      : null

  // Protected dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      // Redirect to home page (login) with callback URL
      const signInUrl = new URL('/', req.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    const requiredApp = getRequiredAppForPath(pathname)
    if (requiredApp && tokenApp && requiredApp !== tokenApp) {
      const redirectUrl = new URL(getDefaultPathForApp(tokenApp), req.url)
      redirectUrl.searchParams.set('app', tokenApp)
      redirectUrl.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    const requiredRole = getRequiredRoleForPath(pathname)
    if (requiredRole && !isRoleAllowed(requiredRole, tokenRole)) {
      const forbiddenUrl = new URL('/forbidden', req.url)
      return NextResponse.redirect(forbiddenUrl)
    }

    // Admin-only guard for /dashboard/admin/**
    if (pathname.startsWith('/dashboard/admin')) {
      const role = (token as any)?.roleSelection || (token as any)?.userRole
      if (role !== 'admin') {
        const forbiddenUrl = new URL('/forbidden', req.url)
        return NextResponse.redirect(forbiddenUrl)
      }
    }
  }

  // Protected API routes (proxy)
  if (pathname.startsWith('/api/proxy')) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|mockServiceWorker.js).*)',
  ],
}

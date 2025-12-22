import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  /**
   * Extends the built-in session types with our custom properties
   */
  interface Session {
    accessToken: string
    error?: string
    sectionIds?: number[]
    scopes?: string[]
    roleSelection?: 'admin' | 'standard'
    appSelection?: import('@/types/app').AppKey
  }

  /**
   * Extends the built-in user type
   */
  interface User {
    id: string
    name: string
    email: string
    image?: string | null
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extends the built-in JWT type with token rotation properties
   */
  interface JWT {
    accessToken?: string
    accessTokenExpires?: number
    sectionIds?: number[]
    scopes?: string[]
    roleSelection?: 'admin' | 'standard'
    appSelection?: import('@/types/app').AppKey
    refreshToken?: string
    error?: string
    user?: {
      id: string
      name: string
      email: string
      image?: string | null
    }
  }
}

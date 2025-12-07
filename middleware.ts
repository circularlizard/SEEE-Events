import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

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

  // Protected dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      // Redirect to home page (login) with callback URL
      const signInUrl = new URL('/', req.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
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

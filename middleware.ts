import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // APP-6 fix: Check isActive before allowing access to protected routes
    if (token && token.isActive === false) {
      return NextResponse.redirect(new URL('/login?error=deactivated', req.url))
    }

    const userRole = token?.role

    const roleRoutes: Record<string, string[]> = {
      '/superadmin': ['SUPERADMIN'],
      '/pimpinan': ['PIMPINAN', 'SUPERADMIN'],
      '/manager': ['MANAGER', 'PIMPINAN', 'SUPERADMIN'],
      '/staff': ['STAFF', 'MANAGER', 'PIMPINAN', 'SUPERADMIN'],
    }

    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route)) {
        if (!userRole || !allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL('/unauthorized', req.url))
        }
      }
    }
  },
  {
    pages: { signIn: '/login' }
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/login',
  ]
}

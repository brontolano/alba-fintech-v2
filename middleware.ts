import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const userRole = req.nextauth.token?.role

    const roleRoutes: Record<string, string[]> = {
      '/superadmin': ['SUPERADMIN'],
      '/pimpinan': ['PIMPINAN', 'SUPERADMIN'],
      '/manager': ['MANAGER', 'PIMPINAN', 'SUPERADMIN'],
      '/staff': ['STAFF', 'MANAGER', 'PIMPINAN', 'SUPERADMIN'],
    }

    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(userRole!)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }
  },
  {
    pages: { signIn: '/login' }
  }
)

export const config = {
  matcher: ['/superadmin/:path*', '/pimpinan/:path*', '/manager/:path*', '/staff/:path*']
}
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
  },
  {
    pages: { signIn: '/login' }
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
  ]
}

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth', '/health'];

// Shared paths that all authenticated users can access
const SHARED_PATHS = [
  '/dashboard',
  '/dashboard/transactions',
  '/dashboard/financial-notes',
  '/dashboard/account',
];

// Role-specific paths
const ROLE_PATHS: Record<string, string[]> = {
  '/dashboard/units': ['SUPERADMIN'],
  '/dashboard/users': ['SUPERADMIN'],
  '/dashboard/lembaga': ['SUPERADMIN'],
  '/dashboard/settings': ['SUPERADMIN'],
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    // Allow public paths without token
    if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // All other dashboard paths require authentication
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const userRole = token.role as string;
    const allowedRoles = ROLE_PATHS[pathname];

    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow access to public paths
        if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
          return true;
        }

        // All other paths require a valid token
        return !!token;
      },
    },
  }
);

// Export config
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
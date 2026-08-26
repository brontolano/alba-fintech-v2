import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

type UserRole = 'SUPERADMIN' | 'PIMPINAN' | 'MANAGER' | 'STAFF';

const ROLE_HOMES: Record<UserRole, string> = {
  SUPERADMIN: '/dashboard/superadmin',
  PIMPINAN: '/dashboard/pimpinan',
  MANAGER: '/dashboard/manager',
  STAFF: '/dashboard/staff',
};

// Path di bawah /dashboard yang bisa diakses semua role yang terautentikasi
const SHARED_DASHBOARD_PATHS = ['/dashboard/rekonsiliasi'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Allow public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Protect /dashboard/*
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    const role = token.role as UserRole;

    // /dashboard (no role suffix) → redirect to role home
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return NextResponse.redirect(new URL(ROLE_HOMES[role] ?? '/login', req.url));
    }

    // Shared dashboard paths (accessible by all authenticated roles)
    if (SHARED_DASHBOARD_PATHS.some((shared) => pathname === shared || pathname.startsWith(`${shared}/`))) {
      return NextResponse.next();
    }

    // Role-based gate: each role can only access its own dashboard prefix
    const rolePrefix = `/dashboard/${role.toLowerCase()}`;
    if (!pathname.startsWith(rolePrefix)) {
      return NextResponse.redirect(new URL(ROLE_HOMES[role] ?? '/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};

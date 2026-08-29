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
const SHARED_DASHBOARD_PATHS = [
  '/dashboard/rekonsiliasi',
  '/dashboard/financial-notes',  // Catatan keuangan — akses PIMPINAN (auth check di page)
  '/dashboard/reports',   // Laporan keuangan — akses PIMPINAN (auth check di page)
  '/dashboard/account',   // Halaman akun user — semua role
];

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

    // Fix: redirect malformed URLs like /dashboard/pimpinan/dashboard/xxx → /dashboard/xxx
    const rolePrefix = `/dashboard/${role.toLowerCase()}`;
    if (pathname.startsWith(`${rolePrefix}/dashboard/`)) {
      const fixed = pathname.replace(`${rolePrefix}/dashboard/`, '/dashboard/');
      return NextResponse.redirect(new URL(fixed, req.url));
    }

    // /dashboard (no role suffix) → redirect to role home
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return NextResponse.redirect(new URL(ROLE_HOMES[role] ?? '/login', req.url));
    }

    // Shared dashboard paths (accessible by all authenticated roles)
    if (SHARED_DASHBOARD_PATHS.some((shared) => pathname === shared || pathname.startsWith(`${shared}/`))) {
      return NextResponse.next();
    }

    // Role-based gate: each role can only access its own dashboard prefix
    if (!pathname.startsWith(`/dashboard/${role.toLowerCase()}`)) {
      return NextResponse.redirect(new URL(ROLE_HOMES[role] ?? '/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};

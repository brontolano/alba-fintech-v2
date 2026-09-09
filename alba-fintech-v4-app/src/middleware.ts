import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Role } from '@prisma/client';

// Routes that don't require authentication
const PUBLIC_FILE = [
    /\.(.*)$/,
    /^\/api\/auth/,
    /^\/_next\/static/,
    /^\/_next\/image/,
    /favicon\.ico/,
    /robots\.txt/,
    /sitemap\.xml/,
    /^\/images/,
    /fonts/,
    /sw\.js/,
    /workbox-/,
    /^webpack-/,
    /icon-/,
    /manifest\.json/,
    /apple-touch-icon\.png/,
    /android-chrome-/,
    /site\.webmanifest/,
];

// Role-based route permissions
const ROLE_REQUIRED: Record<string, string[]> = {
    // Admin-only routes
    '/admin': ['SUPERADMIN'],
    // PIMPINAN+ routes
    '/lembaga': ['SUPERADMIN', 'PIMPINAN'],
    // MANAGER+ routes
    '/units': ['SUPERADMIN', 'PIMPINAN', 'MANAGER'],
};

// Get minimum role required for a path
function getRequiredRole(pathname: string): string[] | null {
    for (const [prefix, roles] of Object.entries(ROLE_REQUIRED)) {
        if (pathname.startsWith(prefix)) {
            return roles;
        }
    }
    return null;
}

// Role hierarchy check
const roleHierarchy: Record<Role, number> = {
    STAFF: 0,
    MANAGER: 1,
    PIMPINAN: 2,
    SUPERADMIN: 3,
};

function hasSufficientRole(userRole: Role, requiredRoles: string[]): boolean {
    return requiredRoles.some(r => roleHierarchy[userRole] >= roleHierarchy[r as Role]);
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip static files and API auth routes
    if (PUBLIC_FILE.some(re => re.test(pathname)) || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // For API routes, let the handler do auth checking
    if (pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // Get session token
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // Redirect to login if not authenticated
    if (!token) {
        const signInUrl = new URL('/login', request.url);
        signInUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signInUrl);
    }

    // Check role-based access for protected routes
    const requiredRoles = getRequiredRole(pathname);
    if (requiredRoles) {
        const userRole = (token.role ?? 'STAFF') as Role;
        if (!hasSufficientRole(userRole, requiredRoles)) {
            // Redirect to unauthorized page
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};

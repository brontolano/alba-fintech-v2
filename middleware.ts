import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const isProduction = process.env.NODE_ENV === "production";
const SESSION_COOKIE = isProduction
  ? "__Secure-alba-session-token"
  : "alba-session-token";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Allow login, forgot-password, api/auth, and static assets through
  if (
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/forgot-password") ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname === "/"
  ) {
    return NextResponse.next();
  }

  let token;
  try {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: SESSION_COOKIE,
    });
  } catch {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token.isActive === false) {
    const response = NextResponse.redirect(
      new URL("/login?error=deactivated", req.url),
    );
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  // PIMPINAN: sederhana — blok profil operasional & layanan unit.
  // Halaman/API-nya tetap ada untuk MANAGER/STAFF; pimpinan hanya
  // navigasi tingkat lembaga (menu di Sidebar sudah dipangkas sejalan).
  const UNIT_SERVICE_PATHS = [
    "/dashboard/kpak/",
    "/dashboard/savings",
    "/dashboard/reconciliation",
    "/dashboard/handovers",
  ];
  if (token.role === "PIMPINAN") {
    const blocked = UNIT_SERVICE_PATHS.some((p) =>
      url.pathname.startsWith(p),
    );
    if (blocked) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

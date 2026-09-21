import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAMES = isProduction
  ? ["__Secure-alba-session-token"]
  : ["alba-session-token"];

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
    });
  } catch {
    // JWT decryption failed (secret changed / corrupted cookie) — clear it
    const response = NextResponse.redirect(new URL("/login", req.url));
    for (const name of COOKIE_NAMES) {
      response.cookies.delete(name);
    }
    return response;
  }

  if (!token) {
    // No valid session — redirect to login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token.isActive === false) {
    // User deactivated — clear cookie and redirect with error
    const response = NextResponse.redirect(
      new URL("/login?error=deactivated", req.url),
    );
    for (const name of COOKIE_NAMES) {
      response.cookies.delete(name);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

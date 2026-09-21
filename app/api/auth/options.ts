import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";

// Typed auth user return — avoids `as any` casts
interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  unitId: string | null;
  unitIsRetail: boolean;
  lembagaId: string | null;
  isActive: boolean;
}

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      unitId?: string | null;
      unitIsRetail?: boolean;
      lembagaId?: string | null;
      isActive?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    unitId?: string | null;
    unitIsRetail?: boolean;
    lembagaId?: string | null;
    isActive?: boolean;
  }
}

const loginAttempts = new Map<string, { count: number; last: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_KEYS = 2000; // upper bound before pruning expired keys

type AuthHeaderValue = string | string[] | undefined;

function getClientIp(
  req?: { headers?: Record<string, AuthHeaderValue> },
): string {
  const fwd = req?.headers?.["x-forwarded-for"];
  const realIp = req?.headers?.["x-real-ip"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0]?.trim();
  const fallback = Array.isArray(realIp) ? realIp[0] : realIp;
  return first || fallback || "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;
  if (now - attempt.last > WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return attempt.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  const next =
    attempt && now - attempt.last <= WINDOW_MS ? attempt : { count: 0, last: now };
  next.count += 1;
  next.last = now;
  loginAttempts.set(key, next);
  if (loginAttempts.size > MAX_KEYS) {
    for (const [k, v] of loginAttempts) {
      if (now - v.last > WINDOW_MS) loginAttempts.delete(k);
    }
  }
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key);
}

// Fixed dummy bcrypt hash — always runs bcrypt.compare to keep uniform timing
// regardless of whether the user exists (prevents email enumeration via timing)
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqQ7K9ExnLxKwbdJ5mg0rV5xZ5Z5";

const isProduction = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  useSecureCookies: isProduction,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(
        credentials,
        req?: { headers?: Record<string, AuthHeaderValue> },
      ): Promise<AuthUser | null> {
        if (!credentials?.email || !credentials?.password) return null;

        // Key gabungan email+IP: serangan brute-force karena satu akun dari
        // satu IP sekaligus melindungi dari penyebaran percobaan lintas email.
        const key = `${credentials.email.toLowerCase()}|${getClientIp(req)}`;
        if (isRateLimited(key)) {
          throw new Error(
            "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
          );
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            unitId: true,
            units: { select: { isRetail: true } },
            lembagaId: true,
            isActive: true,
            image: true,
          },
        });

        // APP-4 fix: Always run bcrypt.compare, even for non-existent users.
        // Use dummyHash so timing is uniform whether or not the user exists.
        const passwordToCompare = user ? user.passwordHash : DUMMY_HASH;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          passwordToCompare,
        );

        // Check all conditions AFTER bcrypt call to preserve constant-time
        if (!user || !user.isActive || !isPasswordValid) {
          recordFailure(key);
          return null;
        }

        // Login sukses — reset penghitung percobaan untuk key ini.
        clearAttempts(key);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role ?? "STAFF",
          unitId: user.unitId,
          unitIsRetail: user.units?.isRetail ?? false,
          lembagaId: user.lembagaId,
          isActive: user.isActive ?? false,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  cookies: {
    sessionToken: {
      name: `${isProduction ? "__Secure-" : ""}alba-session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    callbackUrl: {
      name: `${isProduction ? "__Secure-" : ""}alba-callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    csrfToken: {
      name: `${isProduction ? "__Secure-" : ""}alba-csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in: copy auth user fields into token
        const authUser = user as AuthUser;
        token.id = authUser.id;
        token.role = authUser.role;
        token.unitId = authUser.unitId;
        token.unitIsRetail = authUser.unitIsRetail;
        token.lembagaId = authUser.lembagaId;
        token.isActive = authUser.isActive;
      }

      // APP-5 fix: Re-validate role & isActive from DB on each token refresh.
      // This ensures demotion/deactivation takes effect without waiting for JWT expiry.
      // Wrapped in try-catch to prevent DB errors from breaking auth (graceful degradation)
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true,
              isActive: true,
              units: { select: { isRetail: true } },
            },
          });
          if (dbUser) {
            token.role = dbUser.role ?? "STAFF";
            token.isActive = dbUser.isActive ?? false;
            token.unitIsRetail = dbUser.units?.isRetail ?? false;
          } else {
            // User no longer exists — invalidate token
            token.isActive = false;
          }
        } catch (dbErr: unknown) {
          // DB connection/schema error — preserve existing token values
          // This prevents 500 errors when DB is temporarily unavailable
          // prisma:error sudah dicatat oleh Prisma client; cukup satu baris warn tanpa stack panjang.
          console.warn(
            "[Auth] DB unreachable during JWT refresh — keeping cached token role/isActive.",
          );
          // Token expires soon anyway, user will be prompted to login
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.unitId = token.unitId;
        session.user.unitIsRetail = token.unitIsRetail;
        session.user.lembagaId = token.lembagaId;
        session.user.isActive = token.isActive;
      }
      return session;
    },
  },
  debug: process.env.NEXTAUTH_DEBUG === "true",
};

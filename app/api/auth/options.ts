import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import type { NextAuthOptions } from 'next-auth';

// Typed auth user return — avoids `as any` casts
interface AuthUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  unitId: string | null;
  lembagaId: string;
  isActive: boolean;
}

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      unitId?: string | null;
      lembagaId?: string | null;
      isActive?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    unitId?: string | null;
    lembagaId?: string | null;
    isActive?: boolean;
  }
}

const loginAttempts = new Map<string, { count: number; last: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Fixed dummy bcrypt hash — always runs bcrypt.compare to keep uniform timing
// regardless of whether the user exists (prevents email enumeration via timing)
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqQ7K9ExnLxKwbdJ5mg0rV5xZ5Z5';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<AuthUser | null> {
        if (!credentials?.email || !credentials?.password) return null;

        const now = Date.now();
        const attempt = loginAttempts.get(credentials.email) || { count: 0, last: now };
        if (now - attempt.last > WINDOW_MS) {
          attempt.count = 0;
          attempt.last = now;
        }
        attempt.count++;
        loginAttempts.set(credentials.email, attempt);
        if (attempt.count > MAX_ATTEMPTS) {
          throw new Error('Too many login attempts. Please try again later.');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            unitId: true,
            lembagaId: true,
            isActive: true,
            avatarUrl: true,
          },
        });

        // APP-4 fix: Always run bcrypt.compare, even for non-existent users.
        // Use dummyHash so timing is uniform whether or not the user exists.
        const passwordToCompare = user ? user.password : DUMMY_HASH;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          passwordToCompare
        );

        // Check all conditions AFTER bcrypt call to preserve constant-time
        if (!user || !user.isActive || !isPasswordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
          unitId: user.unitId,
          lembagaId: user.lembagaId,
          isActive: user.isActive,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in: copy auth user fields into token
        const authUser = user as AuthUser;
        token.id = authUser.id;
        token.role = authUser.role;
        token.unitId = authUser.unitId;
        token.lembagaId = authUser.lembagaId;
        token.isActive = authUser.isActive;
      }

      // APP-5 fix: Re-validate role & isActive from DB on each token refresh.
      // This ensures demotion/deactivation takes effect without waiting for JWT expiry.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, isActive: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.isActive = dbUser.isActive;
        } else {
          // User no longer exists — invalidate token
          token.isActive = false;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.unitId = token.unitId;
        session.user.lembagaId = token.lembagaId;
        session.user.isActive = token.isActive;
      }
      return session;
    },
  },
  debug: process.env.NEXTAUTH_DEBUG === 'true',
};

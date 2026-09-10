import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import type { NextAuthOptions } from 'next-auth';

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
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    unitId?: string | null;
    lembagaId?: string | null;
  }
}

const loginAttempts = new Map<string, { count: number; last: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
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
          include: { unit: true, lembaga: true },
        });

        if (!user || !user.isActive) return null;

        const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqQ7K9ExnLxKwbdJ5mg0rV5xZ5Z5';
        const passwordToCompare = user ? user.password : dummyHash;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          passwordToCompare
        );

        if (!isPasswordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
          unitId: user.unitId,
          lembagaId: user.lembagaId,
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
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.unitId = (user as any).unitId;
        token.lembagaId = (user as any).lembagaId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.unitId = token.unitId;
        session.user.lembagaId = token.lembagaId;
      }
      return session;
    },
  },
  debug: process.env.NEXTAUTH_DEBUG === 'true',
};
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        // JWT callback: add role and unit info to token
        async jwt({ token, user }) {
            // When user logs in, fetch their role and unit from DB
            if (user) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        unitId: true,
                        lembagaId: true,
                        isActive: true,
                    },
                });

                if (dbUser && dbUser.isActive) {
                    token.role = dbUser.role;
                    token.unitId = dbUser.unitId;
                    token.lembagaId = dbUser.lembagaId;
                }
            }
            return token;
        },
        // Session callback: make role available in session
        async session({ session, token }) {
            // BUG-028: Session role not available on client
            if (session.user) {
                session.user.id = token.sub as string;
                session.user.role = token.role as Role;
                session.user.unitId = token.unitId as string | null;
                session.user.lembagaId = token.lembagaId as string;
            }
            return session;
        },
    },
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.isActive) {
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    pages: {
        signIn: '/login',
        signOut: '/login',
    },
};

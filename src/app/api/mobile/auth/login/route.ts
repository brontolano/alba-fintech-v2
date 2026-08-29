import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encode } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

/**
 * Mobile auth endpoint.
 * Accepts JSON { email, password }, verifies credentials against MySQL,
 * and returns a NextAuth JWT token that can be used as a cookie:
 *   Cookie: next-auth.session-token=<accessToken>
 *
 * This allows the native Android app to authenticate via the same
 * getServerSession() flow as the web app — no separate auth system needed.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Fetch user from database (same logic as NextAuth CredentialsProvider)
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        unitId: true,
        lembagaId: true,
        isActive: true,
      },
    });

    if (!user || !user.passwordHash || !user.isActive) {
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Verify password (same as NextAuth authorize)
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Generate NextAuth JWT token
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('[mobile/auth/login] NEXTAUTH_SECRET not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const token = await encode({
      token: {
        id: user.id,
        role: user.role,
        unitId: user.unitId,
        lembagaId: user.lembagaId,
      },
      secret,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        unitId: user.unitId,
      },
    });
  } catch (error) {
    console.error('[mobile/auth/login]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

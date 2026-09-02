import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Password saat ini tidak sesuai' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        passwordHash: hashedPassword,
      },
    });

    return NextResponse.json({
      message: 'Password berhasil diganti',
    }, { status: 200 });
  } catch (error) {
    console.error('[Change Password API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

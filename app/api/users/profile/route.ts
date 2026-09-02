import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema for updating profile
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').optional(),
  email: z.string().email('Format email tidak valid').optional(),
  unitId: z.string().optional(),
});

// Schema for changing password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
});

// Endpoint to get user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        unit: {
          select: { id: true, name: true, code: true },
        },
        lembaga: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        unitId: user.unitId,
        lembagaId: user.lembagaId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        unit: user.unit,
        lembaga: user.lembaga,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Endpoint to update user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        unitId: parsed.data.unitId,
      },
    });

    return NextResponse.json({
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        unitId: updatedUser.unitId,
        lembagaId: updatedUser.lembagaId,
        isActive: updatedUser.isActive,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

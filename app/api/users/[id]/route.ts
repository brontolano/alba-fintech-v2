import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const idSchema = z.string().min(1, 'ID pengguna tidak valid');

const updateUserSchema = z.object({
  email: z.string().email('Format email tidak valid').optional(),
  name: z.string().min(1, 'Nama wajib diisi').optional(),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
  role: z.enum(['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF']).optional(),
  unitId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = idSchema.safeParse(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        unitId: true,
        lembagaId: true,
        units: {
          select: { id: true, name: true, code: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPERADMIN can update users
    const role = (session.user as any)?.role;
    if (role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Hanya SUPERADMIN yang dapat mengedit pengguna' }, { status: 403 });
    }

    const { id } = await params;
    const result = idSchema.safeParse(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Hash password if provided
    let passwordHash = undefined;
    if (parsed.data.password) {
      passwordHash = await bcrypt.hash(parsed.data.password, 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.email && { email: parsed.data.email }),
        ...(parsed.data.name && { name: parsed.data.name }),
        ...(passwordHash && { passwordHash }),
        ...(parsed.data.role && { role: parsed.data.role }),
        isActive: parsed.data.isActive ?? existing.isActive,
        unitId: parsed.data.unitId ?? existing.unitId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        unitId: true,
        lembagaId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Hanya SUPERADMIN yang dapat menghapus pengguna' }, { status: 403 });
    }

    const { id } = await params;
    const result = idSchema.safeParse(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    // Prevent self-deletion
    const currentUserId = (session.user as any)?.id ?? (session.user as any)?.userId;
    if (currentUserId === id) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: `Pengguna "${existing.name || existing.email}" berhasil dihapus` });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const idSchema = z.string().min(1, 'ID unit tidak valid');

const updateUnitSchema = z.object({
  name: z.string().min(1, 'Nama unit wajib diisi').optional(),
  code: z.string().min(1, 'Kode unit wajib diisi').optional(),
  description: z.string().optional(),
  isRetail: z.boolean().optional(),
  type: z.enum(['KPAK', 'KOPERASI', 'KANTIN', 'UMUM']).optional(),
  isActive: z.boolean().optional(),
  lembagaId: z.string().optional(),
  parentId: z.string().optional(),
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

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        lembaga: { select: { id: true, name: true } },
        _count: {
          select: {
            users: true,
            transactions: true,
          }
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ data: unit });
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

    const role = session.user.role as string;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json({ error: 'Hanya SUPERADMIN atau PIMPINAN yang dapat mengedit unit' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    const existing = await prisma.unit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 });
    }

    // Pimpinan hanya boleh edit unit di lembaga mereka
    if (role === 'PIMPINAN' && existing.lembagaId !== session.user.lembagaId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.unit.update({
      where: { id },
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description,
        isRetail: parsed.data.isRetail ?? existing.isRetail,
        type: parsed.data.type ?? existing.type,
        isActive: parsed.data.isActive ?? existing.isActive,
        lembagaId: role === 'PIMPINAN' ? existing.lembagaId : (parsed.data.lembagaId ?? existing.lembagaId),
        parentId: parsed.data.parentId ?? existing.parentId,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Kode unit sudah digunakan' }, { status: 409 });
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

    // RBAC - only SuperAdmin or Pimpinan can delete units
    const role = session.user.role as string;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json({ error: 'Hanya SUPERADMIN atau PIMPINAN yang dapat menghapus unit' }, { status: 403 });
    }

    const { id } = await params;
    const result = idSchema.safeParse(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const unit = await prisma.unit.findUnique({
      where: { id },
      select: { id: true, name: true, lembagaId: true },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 });
    }

    // Pimpinan hanya boleh hapus unit di lembaga mereka
    if (role === 'PIMPINAN' && unit.lembagaId !== session.user.lembagaId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if unit has users
    const userCount = await prisma.user.count({ where: { unitId: id } });
    if (userCount > 0) {
      return NextResponse.json(
        { error: `Unit tidak dapat dihapus karena masih memiliki ${userCount} user` },
        { status: 400 }
      );
    }

    // Check if unit has transactions
    const transactionCount = await prisma.transaction.count({ where: { unitId: id } });
    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'Unit tidak dapat dihapus karena masih memiliki transaksi' },
        { status: 400 }
      );
    }

    await prisma.unit.delete({ where: { id } });

    return NextResponse.json({ message: `Unit "${unit.name}" berhasil dihapus` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

// Schema for updating financial notes
const updateFinancialNoteSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').optional(),
  description: z.string().optional(),
  amount: z.number().positive('Jumlah harus positif').optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  date: z.string().transform((str) => new Date(str)).optional(),
  categoryId: z.string().optional().nullable(),
  isReconciled: z.boolean().optional(),
  reconciledById: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  approvedById: z.string().optional().nullable(),
  approvedAt: z.string().transform((str) => new Date(str)).optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = (session.user as any)?.role;
    if (role !== 'PIMPINAN' && role !== 'MANAGER' && role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch single note
    const note = await prisma.financialNote.findUnique({
      where: { id },
      include: {
        unit: true,
        category: true,
        createdBy: {
          select: { name: true, email: true },
        },
        approvedBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Catatan keuangan tidak ditemukan' }, { status: 404 });
    }

    // RBAC: PIMPINAN only sees notes from their lembaga, MANAGER from their unit
    const unitId = (session.user as any)?.unitId;
    const lembagaId = (session.user as any)?.lembagaId;

    if (role === 'PIMPINAN' && note.unit && note.unit.lembagaId !== lembagaId && note.unitId !== null) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (role === 'MANAGER' && note.unitId && note.unitId !== unitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: note }, { status: 200 });
  } catch (error) {
    console.error('[Financial Note GET] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = (session.user as any)?.role;
    if (role !== 'PIMPINAN' && role !== 'MANAGER' && role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = updateFinancialNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Fetch existing note
    const existingNote = await prisma.financialNote.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!existingNote) {
      return NextResponse.json({ error: 'Catatan keuangan tidak ditemukan' }, { status: 404 });
    }

    // RBAC: PIMPINAN only sees notes from their lembaga, MANAGER from their unit
    const unitId = (session.user as any)?.unitId;
    const lembagaId = (session.user as any)?.lembagaId;

    if (role === 'PIMPINAN' && existingNote.unit && existingNote.unit.lembagaId !== lembagaId && existingNote.unitId !== null) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (role === 'MANAGER' && existingNote.unitId && existingNote.unitId !== unitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update note
    const note = await prisma.financialNote.update({
      where: { id },
      data: {
        ...parsed.data,
      },
      include: {
        unit: true,
        category: true,
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      message: 'Catatan keuangan berhasil diperbarui',
      data: note,
    }, { status: 200 });
  } catch (error) {
    console.error('[Financial Note PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = (session.user as any)?.role;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch existing note
    const existingNote = await prisma.financialNote.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!existingNote) {
      return NextResponse.json({ error: 'Catatan keuangan tidak ditemukan' }, { status: 404 });
    }

    // RBAC: PIMPINAN only sees notes from their lembaga, MANAGER from their unit
    const unitId = (session.user as any)?.unitId;
    const lembagaId = (session.user as any)?.lembagaId;

    if (role === 'PIMPINAN' && existingNote.unit && existingNote.unit.lembagaId !== lembagaId && existingNote.unitId !== null) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (role === 'MANAGER' && existingNote.unitId && existingNote.unitId !== unitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete note
    await prisma.financialNote.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Catatan keuangan berhasil dihapus',
    }, { status: 200 });
  } catch (error) {
    console.error('[Financial Note DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
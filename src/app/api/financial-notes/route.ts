import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/financial-notes
// Daftar catatan keuangan pimpinan.
// Role access:
//   PIMPINAN: lihat catatan unit/lembaganya (bisa filter), buat catatan masuk/keluar
//   MANAGER:  lihat catatan unit-nya, buat catatan ringkasan dari rekonsiliasinya
//   STAFF:    tidak dapat akses

const listQuerySchema = z.object({
  unitId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  type: z.enum(['PEMASUKAN', 'PENGELUARAN', 'REKONSILIASI']).optional(),
  isSummary: z.boolean().optional(),
});

// POST /api/financial-notes
// Buat catatan keuangan baru.
// PIMPINAN: bisa buat catatan masuk/keluar untuk lembaganya
// MANAGER:  bisa buat catatan rekonsiliasi (summary) untuk unitnya
const createSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(200),
  description: z.string().optional(),
  amount: z.number().positive('Nominal harus positif'),
  type: z.enum(['PEMASUKAN', 'PENGELUARAN', 'REKONSILIASI']).default('PEMASUKAN'),
  noteDate: z.string().datetime(),
  reference: z.string().optional(),
  isSummary: z.boolean().default(false),
  unitId: z.string().optional(),
  lembagaId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;

  // Only PIMPINAN and MANAGER can access financial notes
  if (role !== 'PIMPINAN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden — Hanya Pimpinan dan Manager yang dapat mengakses' }, { status: 403 });
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  const parseResult = listQuerySchema.safeParse({
    unitId: params.get('unitId') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    type: params.get('type') ?? undefined,
    isSummary: params.get('isSummary') ? params.get('isSummary') === 'true' : undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid query', details: parseResult.error.errors }, { status: 400 });
  }

  const { unitId, from, to, type, isSummary } = parseResult.data;

  // Build where clause based on role
  const where: any = {};

  if (role === 'MANAGER') {
    // Manager can only see notes from their unit
    where.createdBy = { unitId: session.user.unitId };
    if (unitId && unitId !== session.user.unitId) {
      return NextResponse.json({ error: 'Forbidden — Manager hanya dapat melihat unit-nya sendiri' }, { status: 403 });
    }
  }

  if (role === 'PIMPINAN') {
    // Pimpinan sees notes from their lembaga
    where.OR = [
      { lembagaId: session.user.lembagaId },
      { unit: { lembagaId: session.user.lembagaId } },
    ];
  }

  if (unitId) where.unitId = unitId;
  if (from || to) {
    where.noteDate = {};
    if (from) where.noteDate.gte = new Date(from);
    if (to) where.noteDate.lte = new Date(to);
  }
  if (type) where.type = type;
  if (isSummary !== undefined) where.isSummary = isSummary;

  try {
    const notes = await prisma.pimpinanFinancialNote.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        unit: {
          select: { id: true, name: true, code: true },
        },
        lembaga: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { noteDate: 'desc' },
    });

    // Calculate summary
    const totalPemasukan = notes.filter(n => n.type === 'PEMASUKAN').reduce((sum, n) => sum + n.amount, 0);
    const totalPengeluaran = notes.filter(n => n.type === 'PENGELUARAN').reduce((sum, n) => sum + n.amount, 0);

    return NextResponse.json({
      data: notes as any,
      summary: {
        totalNotes: notes.length,
        totalPemasukan,
        totalPengeluaran,
        net: totalPemasukan - totalPengeluaran,
      },
    });
  } catch (error) {
    console.error('[GET /api/financial-notes]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;

  if (role !== 'PIMPINAN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden — Hanya Pimpinan dan Manager yang dapat membuat catatan' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const { title, description, amount, type, noteDate, reference, isSummary, unitId, lembagaId } = parsed.data;

    // Permission checks based on role
    let targetUnitId = unitId || session.user.unitId;
    let targetLembagaId: string | null = lembagaId ?? null;

    if (role === 'PIMPINAN') {
      // Pimpinan must be creating for their own lembaga
      if (!session.user.lembagaId) {
        return NextResponse.json({ error: 'Pimpinan harus memiliki lembaga' }, { status: 400 });
      }
      targetLembagaId = session.user.lembagaId;

      // If no unitId specified, this is a lembaga-level note
      // Pimpinan can also create notes for specific units within their lembaga
      if (targetUnitId) {
        const unit = await prisma.unit.findUnique({
          where: { id: targetUnitId },
          select: { lembagaId: true },
        });
        if (!unit || unit.lembagaId !== session.user.lembagaId) {
          return NextResponse.json({ error: 'Unit tidak ditemukan di lembaga Anda' }, { status: 404 });
        }
      }

      // Pimpinan can only create pemasukan/pengeluaran (not rekonsiliasi)
      if (type === 'REKONSILIASI') {
        return NextResponse.json({ error: 'Pimpinan tidak dapat membuat catatan rekonsiliasi' }, { status: 400 });
      }
      if (isSummary && !isSummary) {
        // Pimpinan notes are always summaries by default
      }
    }

    if (role === 'MANAGER') {
      // Manager can only create rekonsiliasi summaries for their own unit
      if (type !== 'REKONSILIASI' && type !== 'PEMASUKAN' && type !== 'PENGELUARAN') {
        return NextResponse.json({ error: 'Tipe catatan tidak valid' }, { status: 400 });
      }

      // Manager creates summaries for their unit
      if (!targetUnitId || targetUnitId !== session.user.unitId) {
        targetUnitId = session.user.unitId;
      }

      // Get lembagaId from unit
      const unit = await prisma.unit.findUnique({
        where: { id: targetUnitId! },
        select: { lembagaId: true },
      });
      if (!unit) {
        return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 });
      }
      targetLembagaId = unit.lembagaId;
    }

    const note = await prisma.pimpinanFinancialNote.create({
      data: {
        title,
        description: description || null,
        amount,
        type,
        noteDate: new Date(noteDate),
        reference: reference || null,
        isSummary: role === 'PIMPINAN' ? true : isSummary, // Pimpinan notes are always summaries
        unitId: targetUnitId || null,
        lembagaId: targetLembagaId,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        unit: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'pimpinan_financial_note',
        entityId: note.id,
        newData: JSON.stringify({
          title, amount, type, noteDate, isSummary,
          unitId: targetUnitId, lembagaId: targetLembagaId,
        }),
      },
    });

    return NextResponse.json(
      { data: note, message: 'Catatan keuangan berhasil disimpan' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/financial-notes]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

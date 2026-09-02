import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema for creating financial notes
const createFinancialNoteSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  description: z.string().optional(),
  amount: z.number().positive('Jumlah harus positif'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  date: z.string().transform((str) => new Date(str)),
  unitId: z.string().optional(),
  categoryId: z.string().optional(),
});

// Schema for query parameters
const querySchema = z.object({
  unitId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
});

export async function GET(request: NextRequest) {
  try {
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

    // Parse query
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }

    // Build where clause
    const where: any = {};
    const unitId = (session.user as any)?.unitId;
    const lembagaId = (session.user as any)?.lembagaId;

    // Role-based filtering
    if (role === 'PIMPINAN') {
      // Pimpinan sees all notes within their lembaga
      // This requires a join through units
    } else if (role === 'MANAGER') {
      // Manager sees notes from their unit
      where.unitId = unitId;
    }

    if (parsed.data.unitId) {
      where.unitId = parsed.data.unitId;
    }
    if (parsed.data.type) {
      where.type = parsed.data.type;
    }
    if (parsed.data.status) {
      where.status = parsed.data.status;
    }
    if (parsed.data.startDate || parsed.data.endDate) {
      const dateFilter: any = {};
      if (parsed.data.startDate) dateFilter.gte = new Date(parsed.data.startDate);
      if (parsed.data.endDate) dateFilter.lte = new Date(parsed.data.endDate);
      where.date = dateFilter;
    }

    // Fetch notes with pagination
    const notes = await prisma.financialNote.findMany({
      where,
      include: {
        unit: true,
        category: true,
        createdBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        date: 'desc',
      },
      skip: (parsed.data.page - 1) * parsed.data.limit,
      take: parsed.data.limit,
    });

    // Get summary
    const total = await prisma.financialNote.count({ where });
    const totalIncome = await prisma.financialNote.aggregate({
      where: { ...where, type: 'INCOME' },
      _sum: { amount: true },
    });
    const totalExpense = await prisma.financialNote.aggregate({
      where: { ...where, type: 'EXPENSE' },
      _sum: { amount: true },
    });

    return NextResponse.json({
      data: notes,
      summary: {
        total,
        totalIncome: Number(totalIncome._sum.amount) || 0,
        totalExpense: Number(totalExpense._sum.amount) || 0,
        pages: Math.ceil(total / parsed.data.limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Financial Notes API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const parsed = createFinancialNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Determine unit
    let unitId = parsed.data.unitId;
    if (!unitId && role === 'MANAGER') {
      unitId = (session.user as any)?.unitId;
    }

    // Create note
    const note = await prisma.financialNote.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || '',
        amount: parsed.data.amount,
        type: parsed.data.type,
        date: parsed.data.date,
        unitId: unitId,
        categoryId: parsed.data.categoryId,
        createdById: (session.user as any)?.id,
      },
      include: {
        unit: true,
        category: true,
      },
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error('[Financial Notes API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

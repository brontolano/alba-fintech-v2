import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema for creating transactions
const createTransactionSchema = z.object({
  unitId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.number().positive('Jumlah harus positif'),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  reference: z.string().optional(),
  date: z.string().optional(),
});

// Schema for query parameters
const querySchema = z.object({
  unitId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.string().optional(),
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

    // Parse query
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }

    // Build where clause
    const where: any = {};
    const role = session.user.role;

    // Role-based filtering
    if (role === 'STAFF') {
      where.unitId = session.user.unitId;
    } else if (role === 'MANAGER') {
      where.unitId = session.user.unitId;
    } else if (role === 'PIMPINAN') {
      if (!where.lembagaId) {
        where.unit = {
          lembagaId: session.user.lembagaId,
        };
      }
    }

    if (parsed.data.unitId) {
      where.unitId = parsed.data.unitId;
      delete where.unit;
    }
    if (parsed.data.type) {
      where.type = parsed.data.type;
    }
    if (parsed.data.status) {
      where.status = parsed.data.status;
    }
    if (parsed.data.categoryId) {
      where.categoryId = parsed.data.categoryId;
    }
    if (parsed.data.startDate || parsed.data.endDate) {
      where.OR = [
        { createdAt: { gte: parsed.data.startDate, lte: parsed.data.endDate } },
        { date: { gte: parsed.data.startDate, lte: parsed.data.endDate } },
      ];
    }

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        unit: true,
        account: true,
        category: true,
        createdBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (parsed.data.page - 1) * parsed.data.limit,
      take: parsed.data.limit,
    });

    const total = await prisma.transaction.count({ where });

    return NextResponse.json({
      data: transactions,
      summary: {
        total,
        pages: Math.ceil(total / parsed.data.limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Transactions API] Error:', error);
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
    const role = session.user.role;
    if (role !== 'MANAGER' && role !== 'STAFF' && role !== 'PIMPINAN' && role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = createTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Determine unit
    let unitId = parsed.data.unitId;
    if (!unitId && (role === 'MANAGER' || role === 'STAFF')) {
      unitId = session.user.unitId!;
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        unitId: unitId!,
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId,
        accountId: parsed.data.accountId,
        reference: parsed.data.reference,
        date: parsed.data.date ? new Date(parsed.data.date) : undefined,
        createdById: session.user.id,
        status: 'PENDING',
      },
      include: {
        unit: true,
        account: true,
        category: true,
      },
    });

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error) {
    console.error('[Transactions API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

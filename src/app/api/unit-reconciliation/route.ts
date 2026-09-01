import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reconciliationQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED']).optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  accountId: z.string().optional(),
  date: z.string().optional(),
});

// GET /api/unit-reconciliation
// Get reconciliation data for authenticated unit
export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const { searchParams } = new URL(request.url);
  
  // Validate query params
  const parsed = reconciliationQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.errors },
      { status: 400 }
    );
  }

  try {
    const whereClause: any = {};
    let unitId: string | null = null;

    // RBAC setup
    if (role === 'MANAGER') {
      whereClause.unitId = session.user.unitId;
      unitId = session.user.unitId;
    } else if (role === 'PIMPINAN') {
      if (!session.user.lembagaId) {
        return NextResponse.json({ error: 'Lembaga ID required' }, { status: 400 });
      }
      whereClause.unit = { lembagaId: session.user.lembagaId };
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (parsed.data.type) whereClause.type = parsed.data.type;
    if (parsed.data.status) whereClause.status = parsed.data.status;
    if (parsed.data.accountId) whereClause.accountId = parsed.data.accountId;

    // Date range filter - default to today
    const targetDate = parsed.data.date 
      ? new Date(parsed.data.date) 
      : new Date();
    
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    
    whereClause.createdAt = {
      gte: startDate,
      lte: endDate,
    };

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
        approvals: {
          select: {
            status: true,
            approver: { select: { name: true } },
            comment: true,
            createdAt: true,
          },
        },
        orderItems: {
          select: {
            itemName: true,
            quantity: true,
            totalPrice: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const summary = {
      totalCount: transactions.length,
      totalIncome: transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0),
      totalExpense: transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0),
      pendingCount: transactions
        .filter(t => t.status === 'PENDING')
        .length,
      approvedCount: transactions
        .filter(t => t.status === 'APPROVED')
        .length,
      netBalance: 0,
    };
    summary.netBalance = summary.totalIncome - summary.totalExpense;

    return NextResponse.json({
      data: transactions,
      meta: {
        unitId,
        role,
        summary,
        date: targetDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('[GET /api/unit-reconciliation]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/unit-reconciliation
// Create or reconcile a transaction
export async function POST(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  
  // Only MANAGER and STAFF can create transactions
  if (role !== 'MANAGER' && role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    const transactionSchema = z.object({
      type: z.enum(['INCOME', 'EXPENSE']),
      amount: z.number().positive(),
      description: z.string().min(1),
      reference: z.string().optional(),
      photoUrl: z.string().url().optional(),
      accountId: z.string().optional(),
      orderItems: z.array(z.object({
        itemName: z.string(),
        quantity: z.number().int().positive(),
        totalPrice: z.number().positive(),
        itemId: z.string().optional(),
      })).optional(),
    });

    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Create transaction with order items
    const transaction = await prisma.transaction.create({
      data: {
        unitId: session.user.unitId!,
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description,
        reference: parsed.data.reference,
        photoUrl: parsed.data.photoUrl,
        accountId: parsed.data.accountId,
        createdById: session.user.id,
        status: !parsed.data.orderItems?.length ? 'PENDING' : 'DRAFT',
        orderItems: {
          create: parsed.data.orderItems?.map(item => ({
            itemName: item.itemName,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            unitPrice: item.totalPrice / item.quantity,
            itemId: item.itemId,
          })) || [],
        },
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        orderItems: true,
      },
    });

    return NextResponse.json(
      { data: transaction, message: 'Transaksi berhasil dibuat' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/unit-reconciliation]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reconciliationQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED']).optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  accountId: z.string().optional(),
});

// GET /api/units/[id]/reconciliation/today
// Get today's reconciliation data for a specific unit
export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const { searchParams } = new URL(request.url);
  const unitId = request.cookies.get('unitId')?.value || session.user.unitId;
  
  // Validate session has unit access
  if (role === 'MANAGER' && session.user.unitId !== unitId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (role === 'PIMPINAN' && !session.user.lembagaId) {
    return NextResponse.json({ error: 'Lembaga ID required' }, { status: 400 });
  }

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
    const whereClause: any = {
      type: parsed.data.type || undefined,
      status: parsed.data.status || 'PENDING',
    };

    // RBAC: MANAGER can only see their unit, PIMPINAN can see all units in lembaga
    if (role === 'MANAGER') {
      whereClause.unitId = session.user.unitId;
    } else if (role === 'PIMPINAN') {
      whereClause.unit = { lembagaId: session.user.lembagaId };
    }

    // Get today's transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const transactions = await prisma.transaction.findMany({
      where: {
        ...whereClause,
        createdAt: { gte: today },
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        approvals: {
          select: {
            status: true,
            approver: { select: { name: true } },
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
      take: 100,
    });

    // Calculate summary
    const summary = transactions.reduce(
      (acc, t) => {
        acc.totalCount += 1;
        acc.totalAmount += t.amount;
        acc.pendingCount += t.approvals.filter(a => a.status === 'PENDING').length || 0;
        return acc;
      },
      {
        totalCount: 0,
        totalAmount: 0,
        pendingCount: 0,
      }
    );

    return NextResponse.json({
      data: transactions,
      meta: {
        unitId,
        role,
        summary,
        date: today.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('[GET /api/units/reconciliation]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
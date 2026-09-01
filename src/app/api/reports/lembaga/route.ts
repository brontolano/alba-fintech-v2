import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const lembagaReportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// GET /api/reports/lembaga
// Get lembaga-wide financial summary (PIMPINAN only)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const { searchParams } = new URL(request.url);
  
  // Only PIMPINAN and SUPERADMIN can access lembaga reports
  if (role !== 'PIMPINAN' && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = lembagaReportQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.errors },
      { status: 400 }
    );
  }

  try {
    // Date filter defaults to current month
    const today = new Date();
    let startDate = parsed.data.startDate 
      ? new Date(parsed.data.startDate) 
      : new Date(today.getFullYear(), today.getMonth(), 1);
    let endDate = parsed.data.endDate 
      ? new Date(parsed.data.endDate) 
      : new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // RBAC: filter by lembaga
    if (role === 'PIMPINAN') {
      if (!session.user.lembagaId) {
        return NextResponse.json({ error: 'Lembaga ID required' }, { status: 400 });
      }
      whereClause.unit = { lembagaId: session.user.lembagaId };
    }

    // Get all transactions with units
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        unit: { 
          select: { 
            name: true, 
            code: true, 
            isRetail: true,
            unitSetting: true,
          } 
        },
        account: { select: { name: true, code: true } },
      },
    });

    // Aggregate by lembaga
    const incomeTransactions = transactions.filter(t => t.type === 'INCOME' && t.status === 'APPROVED');
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'APPROVED');

    const summary = {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      totalIncome: incomeTransactions.reduce((sum, t) => sum + t.amount, 0),
      totalExpense: expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
      netBalance: 0,
      totalTransactions: transactions.length,
      approvedTransactions: transactions.filter(t => t.status === 'APPROVED').length,
      pendingTransactions: transactions.filter(t => t.status === 'PENDING').length,
      byUnit: [] as any[],
      byType: {
        INCOME: incomeTransactions.reduce((sum, t) => sum + t.amount, 0),
        EXPENSE: expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
      },
    };
    summary.netBalance = summary.byType.INCOME - summary.byType.EXPENSE;

    // Group by unit
    const unitMap = new Map<string, any>();
    for (const t of transactions) {
      const key = t.unitId;
      if (!unitMap.has(key)) {
        unitMap.set(key, {
          unitId: t.unitId,
          unitName: t.unit.name,
          unitCode: t.unit.code,
          isRetail: t.unit.isRetail,
          hasInventory: t.unit.unitSetting?.inventoryEnabled || false,
          total: 0,
          income: 0,
          expense: 0,
          transactionCount: 0,
          approvedCount: 0,
          pendingCount: 0,
        });
      }
      const u = unitMap.get(key)!;
      u.total += t.amount;
      u.transactionCount++;
      if (t.type === 'INCOME') u.income += t.amount;
      if (t.type === 'EXPENSE') u.expense += t.amount;
      if (t.status === 'APPROVED') u.approvedCount++;
      if (t.status === 'PENDING') u.pendingCount++;
    }
    summary.byUnit = Array.from(unitMap.values());

    // Get lembaga info for SUPERADMIN
    let lembagaInfo = null;
    if (role === 'SUPERADMIN') {
      const lembagaId = searchParams.get('lembagaId');
      if (lembagaId) {
        lembagaInfo = await prisma.lembaga.findUnique({
          where: { id: lembagaId },
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            isActive: true,
            _count: {
              select: {
                units: { where: { isActive: true } },
                users: true,
              },
            },
          },
        });
      }
    }

    return NextResponse.json({
      data: {
        summary,
        lembaga: lembagaInfo,
      },
      meta: {
        role,
      },
    });
  } catch (error) {
    console.error('[GET /api/reports/lembaga]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
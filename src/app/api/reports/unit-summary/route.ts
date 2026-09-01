import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  unitId: z.string().optional(),
});

// GET /api/reports/unit-summary
// Get unit financial summary for a specific period
export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const { searchParams } = new URL(request.url);
  
  const parsed = reportQuerySchema.safeParse(
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
    
    // Date filter defaults to current month
    const today = new Date();
    let startDate = parsed.data.startDate 
      ? new Date(parsed.data.startDate) 
      : new Date(today.getFullYear(), today.getMonth(), 1);
    let endDate = parsed.data.endDate 
      ? new Date(parsed.data.endDate) 
      : new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    whereClause.createdAt = {
      gte: startDate,
      lte: endDate,
    };

    // RBAC: filter by unit or lembaga
    if (role === 'MANAGER') {
      whereClause.unitId = session.user.unitId;
    } else if (role === 'PIMPINAN') {
      if (!session.user.lembagaId) {
        return NextResponse.json({ error: 'Lembaga ID required' }, { status: 400 });
      }
      whereClause.unit = { lembagaId: session.user.lembagaId };
    } else {
      // SUPERADMIN can filter by specific unit or see all
      if (parsed.data.unitId) {
        whereClause.unitId = parsed.data.unitId;
      }
    }

    // Get all transactions for calculations
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        unit: { select: { name: true, code: true } },
        account: { select: { name: true, code: true } },
      },
    });

    // Aggregate data
    const incomeTransactions = transactions.filter(t => t.type === 'INCOME' && t.status === 'APPROVED');
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'APPROVED');
    const pendingTransactions = transactions.filter(t => t.status === 'PENDING');

    const summary = {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      totalIncome: incomeTransactions.reduce((sum, t) => sum + t.amount, 0),
      totalExpense: expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
      netBalance: 0,
      pendingCount: pendingTransactions.length,
      transactionCount: transactions.length,
      byAccount: [] as any[],
      byType: {
        INCOME: incomeTransactions.reduce((sum, t) => sum + t.amount, 0),
        EXPENSE: expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
      },
      byUnit: [] as any[],
    };
    summary.netBalance = summary.byType.INCOME - summary.byType.EXPENSE;

    // Group by account
    const accountMap = new Map<string, any>();
    for (const t of transactions) {
      const key = t.accountId || 'default';
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          accountId: t.accountId,
          accountName: t.account?.name || 'Default',
          total: 0,
          income: 0,
          expense: 0,
        });
      }
      const acc = accountMap.get(key)!;
      acc.total += t.amount;
      if (t.type === 'INCOME') acc.income += t.amount;
      if (t.type === 'EXPENSE') acc.expense += t.amount;
    }
    summary.byAccount = Array.from(accountMap.values());

    // Group by unit
    const unitMap = new Map<string, any>();
    for (const t of transactions) {
      const key = t.unitId;
      if (!unitMap.has(key)) {
        unitMap.set(key, {
          unitId: t.unitId,
          unitName: t.unit.name,
          unitCode: t.unit.code,
          total: 0,
          income: 0,
          expense: 0,
          transactionCount: 0,
        });
      }
      const u = unitMap.get(key)!;
      u.total += t.amount;
      u.transactionCount++;
      if (t.type === 'INCOME') u.income += t.amount;
      if (t.type === 'EXPENSE') u.expense += t.amount;
    }
    summary.byUnit = Array.from(unitMap.values());

    return NextResponse.json({
      data: summary,
      meta: {
        role,
        transactions: transactions.length,
      },
    });
  } catch (error) {
    console.error('[GET /api/reports/unit-summary]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
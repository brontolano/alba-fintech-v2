import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

// Schema for query parameters
const querySchema = z.object({
  period: z.enum(['6months', '12months', 'year']).optional().default('6months'),
  unitId: z.string().optional(),
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

    const unitId = (session.user as any)?.unitId;
    const lembagaId = (session.user as any)?.lembagaId;

    // Calculate date range
    const now = new Date();
    const months = parsed.data.period === '6months' ? 6 : parsed.data.period === '12months' ? 12 : 12;
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Build where clause for transactions
    const txWhere: any = {
      status: 'APPROVED',
      date: { gte: startDate },
    };

    // Role-based filtering
    if (role === 'STAFF' || role === 'MANAGER') {
      txWhere.unitId = unitId;
    } else if (role === 'PIMPINAN') {
      txWhere.unit = { lembagaId };
    }

    // Override with query param if provided
    if (parsed.data.unitId) {
      delete txWhere.unit;
      txWhere.unitId = parsed.data.unitId;
    }

    // Fetch transactions for monthly aggregation
    const transactions = await prisma.transaction.findMany({
      where: txWhere,
      select: {
        unitId: true,
        unit: { select: { name: true } },
        type: true,
        amount: true,
        date: true,
      },
    });

    // Build monthly aggregation
    const monthlyData: Record<string, { INCOME: number; EXPENSE: number; TRANSFER: number }> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { INCOME: 0, EXPENSE: 0, TRANSFER: 0 };
    }

    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key][tx.type] += Number(tx.amount);
      }
    }

    // Build monthly array for chart
    const monthlyArray = Object.keys(monthlyData)
      .sort()
      .map((key) => ({
        month: key,
        income: Number(monthlyData[key].INCOME.toFixed(2)),
        expense: Number(monthlyData[key].EXPENSE.toFixed(2)),
        transfer: Number(monthlyData[key].TRANSFER.toFixed(2)),
      }));

    // Build unit distribution
    const unitAggMap: Record<string, { id: string; name: string; income: number; expense: number }> = {};
    for (const tx of transactions) {
      if (!tx.unit) continue;
      const uid = tx.unitId!;
      if (!unitAggMap[uid]) {
        unitAggMap[uid] = { id: uid, name: tx.unit.name, income: 0, expense: 0 };
      }
      if (tx.type === 'INCOME') {
        unitAggMap[uid].income += Number(tx.amount);
      } else if (tx.type === 'EXPENSE') {
        unitAggMap[uid].expense += Number(tx.amount);
      }
    }

    const totalIncome = Object.values(unitAggMap).reduce((sum, u) => sum + u.income, 0);
    const totalExpense = Object.values(unitAggMap).reduce((sum, u) => sum + u.expense, 0);

    const unitDistribution = Object.values(unitAggMap)
      .filter((u) => u.income > 0 || u.expense > 0)
      .map((u) => ({
        id: u.id,
        name: u.name,
        income: Number(u.income.toFixed(2)),
        expense: Number(u.expense.toFixed(2)),
        percentage: totalIncome > 0 ? Number((u.income / totalIncome * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.income - a.income);

    // Build type distribution
    const typeDistribution = {
      income: Object.values(unitAggMap).reduce((sum, u) => sum + u.income, 0),
      expense: Object.values(unitAggMap).reduce((sum, u) => sum + u.expense, 0),
      transfer: transactions
        .filter((t) => t.type === 'TRANSFER')
        .reduce((sum, t) => sum + Number(t.amount), 0),
    };

    return NextResponse.json({
      data: {
        monthlyData: monthlyArray,
        unitDistributionData: unitDistribution,
        typeDistribution: typeDistribution,
        statCards: {
          totalIncome,
          totalExpense,
          netProfit: totalIncome - totalExpense,
          profitRatio: totalIncome > 0 ? Number(((totalIncome - totalExpense) / totalIncome * 100).toFixed(1)) : 0,
        },
        summary: {
          totalTransactions: transactions.length,
          totalUnits: unitDistribution.length,
          period: parsed.data.period,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Reports Aggregations API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
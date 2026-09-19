import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

// Schema for query parameters
const querySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', '6months', '12months', 'year']).optional().default('6months'),
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
    }    // Parse query
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
    let startDate: Date;
    let groupBy: 'day' | 'week' | 'month';

    if (parsed.data.period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      groupBy = 'day';
    } else if (parsed.data.period === 'weekly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 27);
      groupBy = 'week';
    } else if (parsed.data.period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      groupBy = 'month';
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      groupBy = 'month';
    }
    const txWhere: any = {
      status: 'APPROVED',
      date: { gte: startDate },
    };

    // Role-based filtering
    if (role === 'STAFF' || role === 'MANAGER') {
      if (!unitId) {
        return NextResponse.json({ error: 'User tidak memiliki unit' }, { status: 400 });
      }
      txWhere.unitId = unitId;
    } else if (role === 'PIMPINAN') {
      if (!lembagaId) {
        return NextResponse.json({ error: 'Pimpinan tidak memiliki lembaga' }, { status: 403 });
      }
      // Pimpinan sees transactions from units in their lembaga
      const unitIds = await prisma.unit.findMany({
        where: { lembagaId },
        select: { id: true },
      }).then(units => units.map(u => u.id));
      txWhere.unitId = { in: unitIds };
    }

    // A requested unit may only narrow the user's existing scope.
    if (parsed.data.unitId) {
      if (role === 'MANAGER') {
        if (parsed.data.unitId !== unitId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else if (role === 'PIMPINAN') {
        const targetUnit = await prisma.unit.findFirst({
          where: { id: parsed.data.unitId, lembagaId },
          select: { id: true },
        });
        if (!targetUnit) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      txWhere.unitId = parsed.data.unitId;
    }

    // Fetch transactions for monthly aggregation
    const transactions = await prisma.transaction.findMany({
      where: txWhere,
      select: {
        unitId: true,
        units: { select: { name: true } },
        type: true,
        amount: true,
        date: true,
        isPimpinanNote: true,
      },
    });

    // Pisahkan transaksi LEVEL LEMBAGA (catatan Pimpinan, non-unit)
    // agar tidak tercampur ke distribusi unit.
    const lembagaTxs = transactions.filter((t) => t.isPimpinanNote === true);
    const unitTxs = transactions.filter((t) => t.isPimpinanNote !== true);

    const lembagaSummary = {
      income: lembagaTxs
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      expense: lembagaTxs
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      count: lembagaTxs.length,
    };

    // Build aggregation based on groupBy
    const monthlyData: Record<string, { INCOME: number; EXPENSE: number; TRANSFER: number }> = {};

    if (groupBy === 'day') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        monthlyData[key] = { INCOME: 0, EXPENSE: 0, TRANSFER: 0 };
      }
    } else if (groupBy === 'week') {
      const weeks = 4;
      for (let i = 0; i < weeks; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (weeks - 1 - i) * 7);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-W${i + 1}`;
        monthlyData[key] = { INCOME: 0, EXPENSE: 0, TRANSFER: 0 };
      }
    } else {
      for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = { INCOME: 0, EXPENSE: 0, TRANSFER: 0 };
      }
    }

    for (const tx of transactions) {
      if (!tx.date) continue;
      const d = new Date(tx.date);
      let key: string;
      if (groupBy === 'day') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        const weekNum = Math.ceil(d.getDate() / 7);
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-W${weekNum}`;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
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

    // Build unit distribution (HANYA transaksi unit; transaksi lembaga terpisah)
    const unitAggMap: Record<string, { id: string; name: string; income: number; expense: number }> = {};
    for (const tx of unitTxs) {
      if (!tx.units) continue;
      const uid = tx.unitId!;
      if (!unitAggMap[uid]) {
        unitAggMap[uid] = { id: uid, name: tx.units.name, income: 0, expense: 0 };
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

    // Totals keseluruhan = unit + lembaga
    const grandIncome = totalIncome + lembagaSummary.income;
    const grandExpense = totalExpense + lembagaSummary.expense;

    return NextResponse.json({
      data: {
        monthlyData: monthlyArray,
        unitDistributionData: unitDistribution,
        typeDistribution: typeDistribution,
        lembagaSummary: {
          ...lembagaSummary,
          income: Number(lembagaSummary.income.toFixed(2)),
          expense: Number(lembagaSummary.expense.toFixed(2)),
          net: Number((lembagaSummary.income - lembagaSummary.expense).toFixed(2)),
        },
        statCards: {
          totalIncome: Number(grandIncome.toFixed(2)),
          totalExpense: Number(grandExpense.toFixed(2)),
          netProfit: Number((grandIncome - grandExpense).toFixed(2)),
          profitRatio: grandIncome > 0 ? Number(((grandIncome - grandExpense) / grandIncome * 100).toFixed(1)) : 0,
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
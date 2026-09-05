import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

// Schema for query parameters
const querySchema = z.object({
  range: z.enum(['today', '7d', '30d', '90d']).optional().default('30d'),
  unitId: z.string().optional(),
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

    const role = (session.user as any)?.role;
    const unitId = (session.user as any)?.unitId;
    const lembagaId = (session.user as any)?.lembagaId;

    // Build date range filter
    const now = new Date();
    let startDate: Date | null = null;

    switch (parsed.data.range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build where clause for transactions
    const txWhere: any = {
      status: 'APPROVED',
      ...(startDate ? { date: { gte: startDate } } : {}),
    };

    // Role-based filtering
    if (role === 'STAFF' || role === 'MANAGER') {
      txWhere.unitId = unitId;
    } else if (role === 'PIMPINAN') {
      // Pimpinan sees transactions from units in their lembaga
      txWhere.unit = { lembagaId };
    }

    // Override with query param if provided
    if (parsed.data.unitId) {
      delete txWhere.unit;
      txWhere.unitId = parsed.data.unitId;
    }

    // Get approved transactions for aggregation
    const transactions = await prisma.transaction.findMany({
      where: txWhere,
      select: {
        id: true,
        unitId: true,
        unit: {
          select: { id: true, name: true, type: true, lembagaId: true },
        },
        type: true,
        amount: true,
        date: true,
        createdAt: true,
      },
    });

    // Build unit aggregation map
    const unitAggMap: Record<string, {
      id: string;
      name: string;
      type: string;
      balance: number;
      income: number;
      expense: number;
      transactions: number;
    }> = {};

    for (const tx of transactions) {
      if (!tx.unit) continue;

      const uid = tx.unit.id;
      if (!unitAggMap[uid]) {
        unitAggMap[uid] = {
          id: tx.unit.id,
          name: tx.unit.name,
          type: tx.unit.type,
          balance: 0,
          income: 0,
          expense: 0,
          transactions: 0,
        };
      }

      unitAggMap[uid].transactions += 1;

      if (tx.type === 'INCOME') {
        unitAggMap[uid].income += Number(tx.amount);
        unitAggMap[uid].balance += Number(tx.amount);
      } else if (tx.type === 'EXPENSE') {
        unitAggMap[uid].expense += Number(tx.amount);
        unitAggMap[uid].balance -= Number(tx.amount);
      } else if (tx.type === 'TRANSFER') {
        // Transfers don't affect balance directly
        unitAggMap[uid].transactions += 0; // already counted above
      }
    }

    const units = Object.values(unitAggMap).sort((a, b) => b.income - a.income);

    // Calculate totals
    const totalBalance = units.reduce((sum, u) => sum + u.balance, 0);
    const totalIncome = units.reduce((sum, u) => sum + u.income, 0);
    const totalExpense = units.reduce((sum, u) => sum + u.expense, 0);

    // Get recent transactions (limit 10)
    const recentTransactions = await prisma.transaction.findMany({
      where: txWhere,
      include: {
        unit: { select: { name: true } },
        account: { select: { name: true } },
        category: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 10,
    });

    const formattedRecent = recentTransactions.map((tx) => ({
      id: tx.id,
      date: tx.date,
      unitId: tx.unitId,
      unitName: tx.unit?.name || '-',
      description: tx.description,
      amount: Number(tx.amount),
      type: tx.type,
      accountName: tx.account?.name || '-',
      categoryName: tx.category?.name || '-',
      createdByName: tx.createdBy?.name || '-',
    }));

    // Count today's transactions
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCount = transactions.filter(
      (tx) => new Date(tx.date) >= todayStart
    ).length;

    return NextResponse.json({
      data: {
        summary: {
          totalBalance,
          totalIncome,
          totalExpense,
          todayTransactions: todayCount,
        },
        units,
        recentTransactions: formattedRecent,
      },
      summary: {
        range: parsed.data.range,
        totalUnits: units.length,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Dashboard Aggregates API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * GET /api/reports/lembaga/{lembagaId}
 * Laporan keuangan semua unit dalam satu lembaga
 * 
 * Query params:
 *   - lembagaId: string (required untuk PIMPINAN, optional untuk SUPERADMIN)
 *   - from: string (ISO datetime)
 *   - to: string (ISO datetime)
 *   - status: 'APPROVED' | 'ALL' (default: APPROVED)
 *
 * RBAC:
 *   - SUPERADMIN: semua lembaga
 *   - PIMPINAN: hanya lembaga miliknya
 *   - MANAGER: tidak diizinkan
 *   - STAFF: tidak diizinkan
 */

const querySchema = z.object({
  lembagaId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(['APPROVED', 'ALL']).default('APPROVED'),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    lembagaId: searchParams.get('lembagaId') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    status: searchParams.get('status') || 'APPROVED',
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query params', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { lembagaId: paramLembagaId, from, to, status } = parsed.data;
  const role = session.user.role;
  const userLembagaId = session.user.lembagaId;

  // RBAC
  if (role === 'MANAGER' || role === 'STAFF') {
    return NextResponse.json(
      { error: 'Role ini tidak memiliki akses ke laporan lembaga' },
      { status: 403 }
    );
  }

  // Tentukan lembaga scope
  let lembagaId: string | null = null;
  if (role === 'PIMPINAN') {
    lembagaId = userLembagaId;
  } else if (role === 'SUPERADMIN') {
    lembagaId = paramLembagaId || null;
  }

  // Build date range
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setUTCHours(23, 59, 59, 999);
    dateFilter.lte = d;
  }

  // Status filter
  const statusFilter =
    status === 'APPROVED' ? { status: 'APPROVED' as const } : {};

  const where: any = {
    ...statusFilter,
    ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
  };

  if (lembagaId) {
    where.unit = { lembagaId };
  }

  try {
    // Get lembaga info
    const lembaga = lembagaId
      ? await prisma.lembaga.findUnique({
          where: { id: lembagaId },
          select: { id: true, name: true, code: true, description: true },
        })
      : null;

    // Get all units in this lembaga
    const units = lembagaId
      ? await prisma.unit.findMany({
          where: { lembagaId, isActive: true },
          select: { id: true, name: true, code: true, description: true, isRetail: true },
        })
      : await prisma.unit.findMany({
          where: { isActive: true },
          select: { id: true, name: true, code: true, description: true, isRetail: true },
        });

    // Get transactions across all units in lembaga
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        unitId: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        createdAt: true,
        unit: {
          select: { id: true, name: true, code: true, lembaga: { select: { name: true } } },
        },
        account: {
          select: { id: true, name: true, code: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary per unit
    const unitSummary = units.map((unit) => {
      const unitTxns = transactions.filter((t) => t.unitId === unit.id);
      const income = unitTxns.filter((t) => t.type === 'INCOME');
      const expense = unitTxns.filter((t) => t.type === 'EXPENSE');
      const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = expense.reduce((sum, t) => sum + t.amount, 0);

      return {
        unit: {
          id: unit.id,
          name: unit.name,
          code: unit.code,
          isRetail: unit.isRetail,
        },
        summary: {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          transactionCount: unitTxns.length,
          incomeCount: income.length,
          expenseCount: expense.length,
        },
      };
    });

    // Overall summary
    const income = transactions.filter((t) => t.type === 'INCOME');
    const expense = transactions.filter((t) => t.type === 'EXPENSE');
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expense.reduce((sum, t) => sum + t.amount, 0);

    // Group by date for trend
    const byDate: Record<string, { income: number; expense: number; count: number }> = {};
    transactions.forEach((t) => {
      const dateKey = new Date(t.createdAt).toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { income: 0, expense: 0, count: 0 };
      }
      byDate[dateKey].count += 1;
      if (t.type === 'INCOME') {
        byDate[dateKey].income += t.amount;
      } else {
        byDate[dateKey].expense += t.amount;
      }
    });

    return NextResponse.json({
      data: {
        lembaga,
        units: unitSummary,
        summary: {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          transactionCount: transactions.length,
          incomeCount: income.length,
          expenseCount: expense.length,
          unitCount: units.length,
        },
        byDate: Object.entries(byDate)
          .map(([date, val]) => ({ date, ...val }))
          .sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0)),
        transactions,
      },
      meta: {
        appliedFilters: { lembagaId, from, to, status },
      },
    });
  } catch (error) {
    console.error(`[GET /api/reports/lembaga/${paramLembagaId}]`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
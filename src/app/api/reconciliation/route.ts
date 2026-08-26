import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/reconciliation
// Rekonsiliasi buku besar per unit/akun.
// Role access:
//   SUPERADMIN: semua unit (bisa filter unitId)
//   PIMPINAN:   semua unit
//   MANAGER:    unit miliknya saja (bisa filter akun / tanggal)
//   STAFF:      hanya transaksinya sendiri (read-only, tidak disertakan di rekonsiliasi)
//
// Query params:
//   unitId?     — filter unit (SA only; Manager otomatis pakai unit-nya)
//   accountId?  — filter chart of account
//   from?       — ISO date
//   to?         — ISO date
//   status?     — APPROVED | ALL  (default APPROVED)

const querySchema = z.object({
  unitId: z.string().optional(),
  accountId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.enum(['APPROVED', 'ALL']).default('APPROVED'),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  const parseResult = querySchema.safeParse({
    unitId: params.get('unitId') ?? undefined,
    accountId: params.get('accountId') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    status: params.get('status') ?? 'APPROVED',
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid query', details: parseResult.error.errors }, { status: 400 });
  }

  const { unitId, accountId, from, to, status } = parseResult.data;
  const role = session.user.role;
  const userUnitId = session.user.unitId;

  // --- RBAC ---
  if (role === 'STAFF') {
    return NextResponse.json(
      { error: 'Staff tidak memiliki akses ke rekonsiliasi' },
      { status: 403 }
    );
  }

  // Tentukan unit scope
  let unitFilter: { unitId?: string } | undefined;
  if (role === 'MANAGER') {
    // Manager: pakai unit miliknya; parameter unitId diabaiki
    if (userUnitId) {
      unitFilter = { unitId: userUnitId };
    }
  } else {
    // SUPERADMIN / PIMPINAN: gunakan unitId dari filter jika ada
    if (unitId) {
      unitFilter = { unitId };
    }
  }

  const statusFilter = status === 'APPROVED'
    ? { status: 'APPROVED' as const }
    : {};

  // Build a date range object for Prisma
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setUTCHours(23, 59, 59, 999);
    dateFilter.lte = d;
  }

  // where gabungan
  const where: Record<string, unknown> = {
    ...statusFilter,
    ...unitFilter,
    ...(accountId ? { accountId } : {}),
    ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
  };

  try {
    // 1. Ringkasan per akun (untuk trial balance / buku besar)
    const byAccount = await prisma.$transaction(async (tx) => {
      const rows = await tx.transaction.groupBy({
        by: ['accountId'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      });

      // Ambil detail akun untuk tiap accountId (hanya yang ada di hasil di atas)
      const accountIds = rows.map((r) => r.accountId).filter(Boolean) as string[];
      const accounts = accountIds.length
        ? await Promise.all(
            accountIds.map((id) =>
              tx.account.findUnique({
                where: { id },
                select: { id: true, name: true, code: true, type: true },
              })
            )
          )
        : [];

      const accountMap = new Map(accounts.filter(Boolean).map((a) => [a!.id, a]));

      return rows
        .map((r) => {
          const acc = r.accountId ? accountMap.get(r.accountId) : null;
          return {
            account: acc
              ? { id: acc.id, name: acc.name, code: acc.code, type: acc.type }
              : null,
            totalAmount: Number(r._sum.amount ?? 0),
            transactionCount: Number(r._count._all ?? 0),
          };
        })
        .sort((a, b) => b.totalAmount - a.totalAmount);
    });

    // 2. Ringkasan per unit
    const byUnit = await prisma.$transaction(async (tx) => {
      const rows = await tx.transaction.groupBy({
        by: ['unitId'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      });

      const unitIds = rows.map((r) => r.unitId);
      const units = unitIds.length
        ? await Promise.all(
            unitIds.map((id) =>
              tx.unit.findUnique({
                where: { id },
                select: { id: true, name: true, code: true },
              })
            )
          )
        : [];

      const unitMap = new Map(units.filter(Boolean).map((u) => [u!.id, u]));

      return rows
        .map((r) => {
          const u = unitMap.get(r.unitId);
          return {
            unit: u ? { id: u.id, name: u.name, code: u.code } : null,
            totalAmount: Number(r._sum.amount ?? 0),
            transactionCount: Number(r._count._all ?? 0),
          };
        })
        .sort((a, b) => b.totalAmount - a.totalAmount);
    });

    // 3. List transaksi (paginated-ish, maks 50)
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        unitId: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        reference: true,
        accountId: true,
        approvedById: true,
        approvedAt: true,
        createdAt: true,
        approvedBy: { select: { name: true, email: true } },
        account: { select: { id: true, name: true, code: true, type: true } },
        unit: { select: { name: true, code: true } },
        createdBy: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      data: {
        summary: {
          byAccount,
          byUnit,
        },
        transactions,
      },
      meta: { count: transactions.length, filters: { unitId, accountId, from, to, status } },
    });
  } catch (error) {
    console.error('[GET /api/reconciliation]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

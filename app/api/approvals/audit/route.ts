import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const querySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 50)),
});

/**
 * Audit trail persetujuan transaksi:
 * siapa membuat, siapa menyetujui/menolak, kapan, dan komentar keputusan.
 * Dibangun dari relasi Transaction.approvals + approvedById/At.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== 'PIMPINAN' && role !== 'MANAGER' && role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const where: any = {};
    if (parsed.data.status) {
      where.status = parsed.data.status;
    }

    // Scope per role: unit-nya saja (Manager), lembaga-nya (Pimpinan), semua (Superadmin)
    if (role === 'MANAGER') {
      where.unitId = session.user.unitId;
    } else if (role === 'PIMPINAN') {
      const unitIds = await prisma.unit
        .findMany({ where: { lembagaId: session.user.lembagaId }, select: { id: true } })
        .then((units) => units.map((u) => u.id));
      where.unitId = { in: unitIds };
    }

    // Transaksi yang punya jejak persetujuan (punya approval ATAU sudah diputuskan)
    const transactions = await prisma.transaction.findMany({
      where: {
        ...where,
        OR: [{ approvals: { some: {} } }, { approvedById: { not: null } }],
      },
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
        status: true,
        date: true,
        createdAt: true,
        approvedAt: true,
        units: { select: { name: true, code: true } },
        users_transactions_createdByIdTousers: {
          select: { id: true, name: true, email: true, role: true },
        },
        users_transactions_approvedByIdTousers: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvals: {
          select: {
            id: true,
            status: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
            users: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(parsed.data.limit, 200),
    });

    const auditTrail = transactions.map((tx) => {
      const creator = tx.users_transactions_createdByIdTousers;
      const approver = tx.users_transactions_approvedByIdTousers;
      const lastApproval = tx.approvals[0];

      // Waktu keputusan: dari approval terakhir bila ada, fallback approvedAt transaksi
      const decidedAt = lastApproval?.updatedAt ?? tx.approvedAt ?? null;
      // Pengaju = pembuat; penyanggah = approver pada record approval
      const submitter = lastApproval ? creator : creator;
      const decider = lastApproval?.users ?? approver ?? null;

      return {
        id: tx.id,
        transactionId: tx.id,
        description: tx.description,
        amount: Number(tx.amount),
        type: tx.type,
        status: tx.status,
        unitName: tx.units?.name ?? null,
        unitCode: tx.units?.code ?? null,
        createdByName: creator?.name ?? creator?.email ?? '-',
        createdByRole: creator?.role ?? null,
        createdAt: tx.createdAt,
        deciderName: decider?.name ?? decider?.email ?? null,
        deciderRole: decider?.role ?? null,
        decidedAt,
        comment: lastApproval?.comment ?? null,
        submitterName: submitter?.name ?? submitter?.email ?? '-',
      };
    });

    return NextResponse.json(
      {
        data: auditTrail,
        summary: {
          total: auditTrail.length,
          approved: auditTrail.filter((a) => a.status === 'APPROVED').length,
          rejected: auditTrail.filter((a) => a.status === 'REJECTED').length,
          pending: auditTrail.filter((a) => a.status === 'PENDING').length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[Approval Audit API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

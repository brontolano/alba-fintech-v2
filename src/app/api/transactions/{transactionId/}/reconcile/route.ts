import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * POST /api/transactions/{id}/reconcile
 * Workflow approval/reject transaksi
 * 
 * Akses:
 *   - MANAGER: approve/reject transaksi unit miliknya (yang statusnya PENDING)
 *   - PIMPINAN: bisa approve/reject semua transaksi lembaga
 *   - STAFF: tidak diizinkan
 * 
 * Body:
 *   - action: 'approve' | 'reject'
 *   - comment?: string
 */

const bodySchema = z.object({
  action: z.enum(['approve', 'reject']),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('id') || request.headers.get('x-transaction-id');

  if (!transactionId) {
    return NextResponse.json({ error: 'Transaction ID diperlukan' }, { status: 400 });
  }

  try {
    const role = session.user.role;
    const userRole = session.user.role as string;
    const userId = session.user.id;
    const userUnitId = session.user.unitId;

    if (role === 'STAFF') {
      return NextResponse.json(
        { error: 'Staff tidak dapat approve/reject transaksi' },
        { status: 403 }
      );
    }

    // Parse body
    let body: { action: 'approve' | 'reject'; comment?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { action, comment } = parsed.data;

    // Get transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        unitId: true,
        status: true,
        type: true,
        amount: true,
        description: true,
        createdById: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    // Check if already approved/rejected
    if (transaction.status === 'APPROVED' || transaction.status === 'REJECTED') {
      return NextResponse.json(
        { error: `Transaksi sudah ${transaction.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // RBAC: MANAGER hanya bisa approve transaksi unit mereka
    if (userRole === 'MANAGER' && transaction.unitId !== userUnitId) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki izin untuk approve transaksi unit ini' },
        { status: 403 }
      );
    }

    // Start approval workflow
    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    const result = await prisma.$transaction(async (tx) => {
      // Create approval record
      const approval = await tx.approval.create({
        data: {
          transactionId: transaction.id,
          approverId: userId,
          status: newStatus as 'APPROVED' | 'REJECTED',
          comment: comment || null,
        },
      });

      // Update transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: newStatus as 'APPROVED' | 'REJECTED',
          approvedById: userId,
          approvedAt: new Date(),
        },
        select: {
          id: true,
          unitId: true,
          type: true,
          amount: true,
          description: true,
          status: true,
          createdAt: true,
          approvedAt: true,
          approvedBy: {
            select: { name: true, email: true },
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: action.toUpperCase(),
          entity: 'transaction',
          entityId: transaction.id,
          oldData: JSON.stringify({ status: transaction.status }),
          newData: JSON.stringify({ status: newStatus }),
        },
      });

      return { approval, transaction: updatedTransaction };
    });

    return NextResponse.json({
      data: result.transaction,
      message: `Transaksi berhasil ${action}d`,
    });
  } catch (error) {
    console.error(`[POST /api/transactions/${transactionId}/reconcile]`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
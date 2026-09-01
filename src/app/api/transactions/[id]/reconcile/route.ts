import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const approveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
});

// PATCH /api/transactions/[id]/reconcile
// Approve or reject a transaction
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const transactionId = request.url.split('/').pop();
  
  if (!transactionId) {
    return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Get the transaction first
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { unit: true },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // RBAC: check authorization
    if (role === 'MANAGER') {
      // Manager can only approve transactions in their unit
      if (session.user.unitId !== transaction.unitId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (role === 'PIMPINAN') {
      // Pimpinan can approve transactions in their lembaga
      if (session.user.lembagaId !== transaction.unit.lembagaId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update transaction status
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: parsed.data.status,
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
      include: {
        approvedBy: { select: { name: true, email: true } },
        unit: true,
      },
    });

    // Create approval record
    await prisma.approval.create({
      data: {
        transactionId,
        approverId: session.user.id,
        status: parsed.data.status,
        comment: parsed.data.comment || null,
      },
    });

    return NextResponse.json({
      data: updatedTransaction,
      message: parsed.data.status === 'APPROVED' 
        ? 'Transaksi berhasil disetujui' 
        : 'Transaksi ditolak',
    });
  } catch (error) {
    console.error('[PATCH /api/transactions/reconcile]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
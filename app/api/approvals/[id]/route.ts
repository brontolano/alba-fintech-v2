import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';


// Schema for approval actions
const approvalActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  comment: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = session.user.role;
    if (role !== 'PIMPINAN' && role !== 'MANAGER' && role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = approvalActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Fetch approval
    const approval = await prisma.approval.findUnique({
      where: { id },
      include: {
        transaction: true,
        unit: true,
      },
    });

    if (!approval) {
      return NextResponse.json({ error: 'Persetujuan tidak ditemukan' }, { status: 404 });
    }

    // Check if user can approve this
    if (approval.status !== 'PENDING') {
      return NextResponse.json({ error: 'Persetujuan sudah diproses' }, { status: 400 });
    }

    // Update approval and transaction
    const newStatus = parsed.data.action === 'approve' ? 'APPROVED' : 'REJECTED';

    await prisma.$transaction(async (tx) => {
      // Update approval
      await tx.approval.update({
        where: { id },
        data: {
          status: newStatus,
          comment: parsed.data.comment,
        },
      });

      // Update transaction status
      await tx.transaction.update({
        where: { id: approval.transactionId },
        data: {
          status: newStatus,
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: parsed.data.action.toUpperCase(),
          entity: 'Transaction',
          entityId: approval.transactionId,
          oldData: JSON.stringify({ status: 'PENDING' }),
          newData: JSON.stringify({ status: newStatus }),
        },
      });
    });

    return NextResponse.json({
      message: `Transaksi berhasil ${parsed.data.action === 'approve' ? 'disetujui' : 'ditolak'}`,
      data: { id, status: newStatus },
    }, { status: 200 });
  } catch (error) {
    console.error('[Approval PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = session.user.role;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete approval
    await prisma.approval.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Persetujuan berhasil dihapus',
    }, { status: 200 });
  } catch (error) {
    console.error('[Approval DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
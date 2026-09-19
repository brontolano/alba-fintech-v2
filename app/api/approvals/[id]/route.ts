import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { notifyApprovalDecision } from '@/lib/approvalRouting';


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
        transactions: {
          select: {
            id: true,
            unitId: true,
            type: true,
            amount: true,
            description: true,
            date: true,
            status: true,
            createdById: true,
          },
        },
        units: true,
      },
    });

    if (!approval) {
      return NextResponse.json({ error: 'Persetujuan tidak ditemukan' }, { status: 404 });
    }

    if (approval.status !== 'PENDING') {
      return NextResponse.json({ error: 'Persetujuan sudah diproses' }, { status: 400 });
    }

    // Ownership validation: hanya approver yang ditunjuk yang boleh memutuskan.
    // SUPERADMIN diberi pengecualian untuk aksi remedial.
    if (role !== 'SUPERADMIN') {
      if (approval.approverId !== session.user.id) {
        return NextResponse.json(
          { error: 'Permintaan ini ditujukan kepada penyetuju lain' },
          { status: 403 },
        );
      }
    }

    // Anti self-approval: pembuat transaksi tidak boleh menyetujui transaksinya sendiri
    if (approval.transactions.createdById === session.user.id) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menyetujui transaksi yang Anda buat sendiri' },
        { status: 403 },
      );
    }

    // Update approval and transaction
    const newStatus = parsed.data.action === 'approve' ? 'APPROVED' : 'REJECTED';
    const approved = parsed.data.action === 'approve';

    const updatedTx = await prisma.$transaction(async (tx) => {
      // Update approval
      const upd = await tx.approval.update({
        where: { id },
        data: {
          status: newStatus,
          comment: parsed.data.comment,
        },
      });

      // Update transaction status
      return tx.transaction.update({
        where: { id: approval.transactionId },
        data: {
          status: newStatus,
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      });
    });

    // Notifikasi ke pembuat transaksi (non-blocking)
    await notifyApprovalDecision({
      creatorId: updatedTx.createdById,
      transactionId: updatedTx.id,
      description: updatedTx.description,
      approved,
      approverName: session.user.name || session.user.email || 'Atasan',
      comment: parsed.data.comment,
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
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch approval to check ownership
    const approval = await prisma.approval.findUnique({
      where: { id },
      select: { id: true, approverId: true, unitId: true, transactionId: true },
    });

    if (!approval) {
      return NextResponse.json({ error: 'Persetujuan tidak ditemukan' }, { status: 404 });
    }

    // Ownership validation
    if (role === 'PIMPINAN') {
      if (approval.approverId !== session.user.id) {
        return NextResponse.json({ error: 'Anda tidak memiliki izin untuk menghapus persetujuan ini' }, { status: 403 });
      }
      // PIMPINAN can only delete approvals for their lembaga
      const transaction = await prisma.transaction.findUnique({
        where: { id: approval.transactionId },
        select: { units: { select: { lembagaId: true } } },
      });
      if (transaction?.units?.lembagaId !== session.user.lembagaId) {
        return NextResponse.json({ error: 'Anda tidak memiliki izin untuk menghapus persetujuan ini' }, { status: 403 });
      }
    }
    if (role === 'MANAGER') {
      if (approval.unitId !== session.user.unitId) {
        return NextResponse.json({ error: 'Anda tidak memiliki izin untuk menghapus persetujuan di unit lain' }, { status: 403 });
      }
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
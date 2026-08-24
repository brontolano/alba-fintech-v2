import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';

// GET /api/approvals
// List semua approval requests
// Role access: SUPERADMIN + PIMPINAN (approvers)
// STAFF/MANAGER: hanya lihat approval request sendiri
export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const role = session.user.role;
    const userId = session.user.id;

    let where = {};

    // STAFF: hanya approval request untuk transaksi yang dia buat
    // MANAGER: hanya approval request di unit-nya
    // SUPERADMIN + PIMPINAN: semua (approver role)
    if (role === 'STAFF') {
      where = {
        transaction: {
          createdById: userId,
        },
      };
    } else if (role === 'MANAGER') {
      where = {
        transaction: {
          unit: {
            users: {
              some: {
                id: userId,
              },
            },
          },
        },
      };
    }

    const approvals = await prisma.approval.findMany({
      where,
      select: {
        id: true,
        transactionId: true,
        approverId: true,
        status: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        transaction: {
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            status: true,
            unit: { select: { name: true, code: true } },
            createdBy: { select: { name: true, email: true } },
          },
        },
        approver: {
          select: { name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: approvals });
  } catch (error) {
    console.error('[GET /api/approvals]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/approvals
// Approve or reject a transaction
// Request body: { transactionId: string, action: 'approve' | 'reject', comment?: string }
// Role access: SUPERADMIN + PIMPINAN
export async function POST(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const userId = session.user.id;
    const body = await request.json();
    const { transactionId, action, comment } = body;

    // Validation
    if (!transactionId || !action) {
      return NextResponse.json(
        { error: 'transactionId dan action wajib diisi' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action harus "approve" atau "reject"' },
        { status: 400 }
      );
    }

    // Check transaction exists and is pending
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { id: true, status: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    if (transaction.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status PENDING yang bisa diproses' },
        { status: 400 }
      );
    }

    const approvalStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const transactionStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // Update transaction status (atomic)
    const result = await prisma.$transaction(async (tx) => {
      // Update transaction
      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: transactionStatus as any,
          approvedById: userId,
          approvedAt: new Date(),
        },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          status: true,
          unit: { select: { name: true, code: true } },
          createdBy: { select: { name: true, email: true } },
        },
      });

      // Create approval record (or update if exists)
      await tx.approval.upsert({
        where: { transactionId: transactionId },
        update: {
          approverId: userId,
          status: approvalStatus as any,
          comment: comment || null,
        },
        create: {
          transactionId,
          approverId: userId,
          status: approvalStatus as any,
          comment: comment || undefined,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: `TRANSACTION_${action.toUpperCase()}`,
          entity: 'transaction',
          entityId: transactionId,
          newData: JSON.stringify({
            newStatus: transactionStatus,
            approverId: userId,
            comment: comment || null,
          }),
        },
      });

      return updated;
    });

    return NextResponse.json({
      data: result,
      message: `Transaksi berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}`,
    });
  } catch (error) {
    console.error('[POST /api/approvals]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

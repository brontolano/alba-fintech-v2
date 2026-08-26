import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

// Validation schemas
const createApprovalSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID wajib diisi'),
  action: z.enum(['approve', 'reject']),
  comment: z.string().max(500).optional(),
});

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

    let where: any = {};

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

    return NextResponse.json({ 
      data: approvals,
      meta: { count: approvals.length }
    });
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
  const userId = session.user.id;
  const userUnitId = session.user.unitId;

  try {
    const body = await request.json();
    
    // Validate input
    const parsed = createApprovalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { transactionId, action, comment } = parsed.data;

    // Check transaction exists and is pending
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { 
        id: true, 
        status: true,
        unitId: true,
        amount: true,
        type: true,
        description: true,
        approvedById: true,
      },
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

    // RBAC unit check: MANAGER hanya boleh approve transaksi di unitnya
    if (role === 'MANAGER') {
      if (userUnitId && transaction.unitId !== userUnitId) {
        return NextResponse.json(
          { error: 'Anda hanya dapat menyetujui transaksi unit Anda' },
          { status: 403 }
        );
      }
    }

    // SUPERADMIN + PIMPINAN + MANAGER (unit-scoped sudah dicek di atas)
    // Check if it's already been processed by checking approval records
    const existingApproval = await prisma.approval.findFirst({
      where: { 
        transactionId,
        status: { in: ['APPROVED', 'REJECTED'] }
      },
      select: { id: true },
    });
    
    if (existingApproval) {
      return NextResponse.json(
        { error: 'Transaksi sudah diproses sebelumnya' },
        { status: 400 }
      );
    }

    const approvalStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const transactionStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // Update transaction status (atomic)
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      // Create approval record for this action
      await tx.approval.create({
        data: {
          transactionId: transactionId as string,
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

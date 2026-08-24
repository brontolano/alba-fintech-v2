import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';

// GET /api/transactions/:id
// Get single transaction detail
// Role access:
//   SUPERADMIN + PIMPINAN: any transaction
//   MANAGER: transaction in own unit
//   STAFF: only transaction created by self
export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const transactionId = segments[segments.length - 1];

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!transactionId) {
    return NextResponse.json(
      { error: 'Transaction ID required' },
      { status: 400 }
    );
  }

  try {
    const role = session.user.role;
    const userId = session.user.id;
    const userUnitId = session.user.unitId;

    let include = true;

    if (role === 'STAFF') {
      include = false; // will filter below
    }

    // Fetch transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: include
        ? {
            id: true,
            unitId: true,
            type: true,
            amount: true,
            description: true,
            status: true,
            reference: true,
            createdById: true,
            approvedById: true,
            approvedAt: true,
            createdAt: true,
            updatedAt: true,
            unit: { select: { name: true, code: true } },
            createdBy: {
              select: { name: true, email: true, role: true, unit: { select: { name: true } } },
            },
            approvedBy: { select: { name: true, email: true, role: true } },
          }
        : {
            id: true,
            unitId: true,
            type: true,
            amount: true,
            description: true,
            status: true,
            reference: true,
            createdById: true,
            createdAt: true,
            updatedAt: true,
            createdBy: { select: { name: true, email: true } },
          },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    // RBAC check for STAFF and MANAGER
    if (role === 'STAFF' && transaction.createdById !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (role === 'MANAGER' && transaction.unitId !== userUnitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: transaction });
  } catch (error) {
    console.error('[GET /api/transactions/:id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/transactions/:id
// Update transaction (e.g., mark as DRAFT/PENDING, or edit before approval)
// Only editable if status === DRAFT or PENDING (not yet APPROVED/REJECTED)
export async function PATCH(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const transactionId = segments[segments.length - 1];

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!transactionId) {
    return NextResponse.json(
      { error: 'Transaction ID required' },
      { status: 400 }
    );
  }

  const role = session.user.role;
  const userId = session.user.id;
  const userUnitId = session.user.unitId;

  try {
    const body = await request.json();
    const { type, amount, description, reference, status } = body;

    // Fetch existing transaction
    const existing = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        createdById: true,
        unitId: true,
        status: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    // RBAC + status check
    if (role === 'STAFF' && existing.createdById !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (role === 'MANAGER' && existing.unitId !== userUnitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only editable if DRAFT or PENDING
    if (existing.status === 'APPROVED' || existing.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Transaksi yang sudah disetujikan/ditolak tidak bisa diubah' },
        { status: 400 }
      );
    }

    // Update
    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...(type && { type }),
        ...(amount !== undefined && { amount }),
        ...(description !== undefined && { description }),
        ...(reference !== undefined && { reference }),
        ...(status && { status: status as any }),
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        reference: true,
        updatedAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'transaction',
        entityId: transactionId,
        oldData: JSON.stringify(existing),
        newData: JSON.stringify(updated),
      },
    });

    return NextResponse.json({
      data: updated,
      message: 'Transaksi berhasil diupdate',
    });
  } catch (error) {
    console.error('[PATCH /api/transactions/:id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/:id
// Delete transaction — only if DRAFT status
export async function DELETE(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const transactionId = segments[segments.length - 1];

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const userId = session.user.id;

  if (!transactionId) {
    return NextResponse.json(
      { error: 'Transaction ID required' },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        createdById: true,
        status: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    // RBAC
    const canDelete =
      role === 'SUPERADMIN' || role === 'PIMPINAN' || existing.createdById === userId;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Hanya bisa delete jika DRAFT
    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status DRAFT yang bisa dihapus' },
        { status: 400 }
      );
    }

    await prisma.transaction.delete({ where: { id: transactionId } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'transaction',
        entityId: transactionId,
        oldData: JSON.stringify(existing),
      },
    });

    return NextResponse.json({
      message: 'Transaksi berhasil dihapus',
    });
  } catch (error) {
    console.error('[DELETE /api/transactions/:id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

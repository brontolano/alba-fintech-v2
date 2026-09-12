import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const deleteSchema = z.object({
  id: z.string().min(1, 'ID transaksi tidak valid'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Build where clause for access control
    const where: any = { id };
    const role = session.user.role as string;

    // Role-based filtering
    if (role === 'STAFF' || role === 'MANAGER') {
      where.unitId = session.user.unitId;
    } else if (role === 'PIMPINAN') {
      where.units = {
        lembagaId: session.user.lembagaId,
      };
    }

    const transaction = await prisma.transaction.findFirst({
      where,
      select: {
        id: true,
        unitId: true,
        type: true,
        amount: true,
        description: true,
        date: true,
        status: true,
        reference: true,
        units: { select: { name: true } },
        bank_accounts: { select: { name: true } },
        financial_categories: { select: { name: true } },
        users_transactions_createdByIdTousers: {
          select: { name: true, email: true },
        },
        users_transactions_approvedByIdTousers: {
          select: { name: true, email: true },
        },
        order_items: {
          include: {
            inventory_items: true,
          },
        },
        approvals: {
          include: {
            users: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    // Transform data to match frontend expectations
    const transformedTransaction = {
      ...transaction,
      unitName: transaction.units?.name,
      accountName: transaction.bank_accounts?.name,
      categoryName: transaction.financial_categories?.name,
      createdByName: transaction.users_transactions_createdByIdTousers?.name,
      approvedByName: transaction.users_transactions_approvedByIdTousers?.name,
    };

    return NextResponse.json({ data: transformedTransaction });
  } catch (error) {
    console.error('[Transaction API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role as string;

    const { id } = await params;
    const result = deleteSchema.safeParse({ id });
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    // Build where clause for access control
    const where: any = { id };

    // RBAC - only SUPERADMIN can delete freely, MANAGER/PIMPINAN scoped to unit/lembaga
    if (role === 'MANAGER') {
      where.unitId = session.user.unitId;
    } else if (role === 'PIMPINAN') {
      where.units = { lembagaId: session.user.lembagaId };
    } else if (role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transaction = await prisma.transaction.findFirst({
      where,
      select: { id: true, approvals: { select: { status: true } } },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    const isApproved = transaction.approvals.some(
      (a) => a.status === 'APPROVED' || a.status === 'PENDING'
    );
    if (isApproved) {
      return NextResponse.json(
        { error: 'Transaksi yang sudah disetujui tidak dapat dihapus' },
        { status: 400 }
      );
    }

    // Delete using the verified ID (access already validated via where clause above)
    await prisma.transaction.delete({ where: { id } });

    return NextResponse.json({ message: 'Transaksi berhasil dihapus' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

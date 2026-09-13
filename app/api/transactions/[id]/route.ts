import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const updateTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  amount: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().positive('Jumlah harus positif')
  ).optional(),
  description: z.string().min(1, 'Deskripsi wajib diisi').optional(),
  unitId: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  reference: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  photoUrl: z.string().nullable().optional(),
});

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const role = session.user.role as string;
    let body: any = null;

    // Accept JSON or multipart FormData
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const transactionData = formData.get('transactionData') as string | null;
      if (transactionData) body = JSON.parse(transactionData);
      else {
        body = {
          type: formData.get('type')?.toString(),
          amount: formData.get('amount')?.toString(),
          description: formData.get('description')?.toString() ?? undefined,
          unitId: formData.get('unitId')?.toString() || undefined,
          categoryId: formData.get('categoryId')?.toString() || undefined,
          accountId: formData.get('accountId')?.toString() || undefined,
          reference: formData.get('reference')?.toString() || undefined,
          date: formData.get('date')?.toString() || undefined,
          status: formData.get('status')?.toString(),
          photoUrl: formData.get('photoUrl')?.toString() || undefined,
        };
      }
    } else {
      body = await request.json();
    }

    const parsed = updateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Access control
    const where: any = { id };
    if (role === 'STAFF' || role === 'MANAGER') where.unitId = session.user.unitId;
    else if (role === 'PIMPINAN') where.units = { lembagaId: session.user.lembagaId };
    else if (role !== 'SUPERADMIN')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Verify ownership / existence
    const existing = await prisma.transaction.findFirst({ where });
    if (!existing) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    // Prevent editing if already approved (unless SUPERADMIN)
    if (role !== 'SUPERADMIN') {
      const isApproved = await prisma.approval.count({
        where: { transactionId: id, status: { in: ['APPROVED', 'PENDING'] } },
      });
      if (isApproved > 0) {
        return NextResponse.json(
          { error: 'Transaksi yang sudah disetujui tidak dapat diedit' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: { ...parsed.data, updatedAt: new Date() },
    });

    return NextResponse.json({ data: updated, message: 'Transaksi berhasil diperbarui' });
  } catch (err: any) {
    console.error('[Transaction PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
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

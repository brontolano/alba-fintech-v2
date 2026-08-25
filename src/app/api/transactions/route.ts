import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';

// Validation schemas
const createTransactionSchema = z.object({
  unitId: z.string().min(1, 'Unit ID wajib diisi'),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive('Amount harus lebih dari 0'),
  description: z.string().min(3, 'Deskripsi minimal 3 karakter').max(500),
  reference: z.string().optional(),
  accountId: z.string().optional(),
});

const updateTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  amount: z.number().positive('Amount harus lebih dari 0').optional(),
  description: z.string().min(3, 'Deskripsi minimal 3 karakter').max(500).optional(),
  reference: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  accountId: z.string().optional().nullable(),
});

// GET /api/transactions
// List transactions. Role-based visibility:
//   SUPERADMIN: all units
//   PIMPINAN: all units
//   MANAGER: own unit only
//   STAFF: own unit only (createdBy filter)
export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const role = session.user.role;
    const userUnitId = session.user.unitId;
    const userId = session.user.id;

    let where: any = {};

    if (role === 'STAFF') {
      // Staff: hanya transaksi yang dibuatnya sendiri
      where = { createdById: userId };
    } else if (role === 'MANAGER') {
      // Manager: transaksi unit-nya
      where = { unitId: userUnitId };
    }
    // SUPERADMIN + PIMPINAN: semua (no where filter)

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
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
        accountId: true,
        // Include names for display
        unit: { select: { name: true, code: true } },
        createdBy: { select: { name: true, email: true, role: true } },
        approvedBy: { select: { name: true, email: true } },
        account: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ 
      data: transactions,
      meta: { count: transactions.length }
    });
  } catch (error) {
    console.error('[GET /api/transactions]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/transactions
// Create new transaction (status: PENDING — siap untuk approval)
// Role access: all authenticated users
export async function POST(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const role = session.user.role;
    const userUnitId = session.user.unitId;
    const userId = session.user.id;

    const body = await request.json();
    
    // Validate input
    const parsed = createTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { unitId, type, amount, description, reference, accountId } = parsed.data;

    // RBAC: Staff hanya bisa buat transaksi untuk unit-nya
    const finalUnitId = role === 'SUPERADMIN' || role === 'PIMPINAN' 
      ? unitId 
      : userUnitId;

    if (!finalUnitId) {
      return NextResponse.json(
        { error: 'User belum memiliki unit' },
        { status: 400 }
      );
    }

    // Verify unit exists and user has access
    const unit = await prisma.unit.findUnique({
      where: { id: finalUnitId },
      select: { id: true, isActive: true },
    });
    
    if (!unit) {
      return NextResponse.json(
        { error: 'Unit tidak ditemukan' },
        { status: 404 }
      );
    }

    if (!unit.isActive && role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json(
        { error: 'Unit sudah tidak aktif' },
        { status: 400 }
      );
    }

    // Verify account exists if provided
    if (accountId) {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { id: true, isActive: true },
      });
      if (!account || !account.isActive) {
        return NextResponse.json(
          { error: 'Akun tidak valid' },
          { status: 400 }
        );
      }
    }

    // Create transaction with PENDING status (siap untuk approval)
    const transaction = await prisma.transaction.create({
      data: {
        unitId: finalUnitId,
        type,
        amount,
        description: description.trim(),
        reference: reference ? reference.trim() : undefined,
        accountId: accountId || undefined,
        status: 'PENDING',
        createdById: userId,
      },
      select: {
        id: true,
        unitId: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        reference: true,
        accountId: true,
        createdAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'CREATE',
        entity: 'transaction',
        entityId: transaction.id,
        newData: JSON.stringify(transaction),
      },
    });

    return NextResponse.json(
      { data: transaction, message: 'Transaksi berhasil dibuat (status: pending approval)' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/transactions]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

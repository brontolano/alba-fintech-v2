import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';

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

    let where = {};

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
        // Include names for display
        unit: { select: { name: true, code: true } },
        createdBy: { select: { name: true, email: true, role: true } },
        approvedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: transactions });
  } catch (error) {
    console.error('[GET /api/transactions]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/transactions
// Create new transaction (status: DRAFT → set to PENDING after submit)
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
    const { unitId, type, amount, description, reference } = body;

    // Validation
    if (!unitId || !type || amount === undefined) {
      return NextResponse.json(
        { error: 'unitId, type, dan amount wajib diisi' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount harus lebih dari 0' },
        { status: 400 }
      );
    }

    if (description && description.trim().length < 3) {
      return NextResponse.json(
        { error: 'Deskripsi minimal 3 karakter' },
        { status: 400 }
      );
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return NextResponse.json(
        { error: 'Type harus INCOME atau EXPENSE' },
        { status: 400 }
      );
    }

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

    // Create transaction with PENDING status (siap untuk approval)
    const transaction = await prisma.transaction.create({
      data: {
        unitId: finalUnitId,
        type,
        amount,
        description: description ? description.trim() : '',
        reference: reference ? reference.trim() : undefined,
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

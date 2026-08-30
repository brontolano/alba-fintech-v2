import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { join } from 'path';
import { uploadDir } from '@/lib/utils';

// Validation schemas
const createTransactionSchema = z.object({
  unitId: z.string().min(1, 'Unit ID wajib diisi'),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive('Amount harus lebih dari 0'),
  description: z.string().min(3, 'Deskripsi minimal 3 karakter').max(500),
  reference: z.string().optional(),
  accountId: z.string().optional(),
  photoUrl: z.string().optional(),
});

const updateTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  amount: z.number().positive('Amount harus lebih dari 0').optional(),
  description: z.string().min(3, 'Deskripsi minimal 3 karakter').max(500).optional(),
  reference: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  accountId: z.string().optional().nullable(),
  photoUrl: z.string().optional(),
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

    const url = new URL(request.url);
    const lembagaFilter = url.searchParams.get('lembagaId');
    const unitFilter = url.searchParams.get('unitId');

    let where: any = {};

    if (role === 'STAFF') {
      // Staff: hanya transaksi yang dibuatnya sendiri
      where = { createdById: userId };
    } else if (role === 'MANAGER') {
      // Manager: transaksi unit-nya
      where = { unitId: userUnitId };
    }
    // SUPERADMIN + PIMPINAN: semua (no where filter)

    // Superadmin can filter by lembaga via query param
    if (role === 'SUPERADMIN' && lembagaFilter) {
      where.unit = { lembagaId: lembagaFilter };
    }
    if (unitFilter) {
      where.unitId = unitFilter;
    }

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
        // Include photo URL for frontend display
        photoUrl: true,
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
// Accepts either JSON body or FormData (for photo upload via camera/gallery)
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
    const contentType = request.headers.get('content-type') || '';

    let unitId: string | undefined;
    let type: 'INCOME' | 'EXPENSE';
    let amount: number;
    let description: string;
    let reference: string | undefined;
    let accountId: string | undefined;
    let photoUrl: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData — photo upload from camera/gallery
      const formData = await request.formData();
      type = formData.get('type') as 'INCOME' | 'EXPENSE';
      amount = parseFloat(formData.get('amount') as string);
      description = formData.get('description') as string;
      reference = (formData.get('reference') as string) || undefined;
      unitId = (formData.get('unitId') as string) || undefined;
      const photo = formData.get('photo') as File | null;
      if (photo && photo.size > 0) {
        // Pastikan direktori upload ada
        await fs.mkdir(uploadDir, { recursive: true });
        const filename = `${Date.now()}_${photo.name}`;
        const filePath = join(uploadDir, filename);
        const buffer = Buffer.from(await photo.arrayBuffer());
        await fs.writeFile(filePath, buffer);
        photoUrl = `/uploads/transactions/${filename}`;
      }
    } else {
      // Handle JSON body (backward compatible)
      const body = await request.json();
      const parsed = createTransactionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.errors },
          { status: 400 }
        );
      }
      unitId = parsed.data.unitId;
      type = parsed.data.type;
      amount = parsed.data.amount;
      description = parsed.data.description;
      reference = parsed.data.reference;
      accountId = parsed.data.accountId;
      photoUrl = parsed.data.photoUrl;
    }

    // Validate required fields
    if (!type || !['INCOME', 'EXPENSE'].includes(type)) {
      return NextResponse.json({ error: 'type wajib diisi (INCOME atau EXPENSE)' }, { status: 400 });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount harus lebih dari 0' }, { status: 400 });
    }
    if (!description || description.trim().length < 3) {
      return NextResponse.json({ error: 'description minimal 3 karakter' }, { status: 400 });
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

    // Atomic: create transaction + audit log together
    const [transaction, audit] = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          unitId: finalUnitId,
          type,
          amount,
          description: description.trim(),
          reference: reference ? reference.trim() : undefined,
          photoUrl: photoUrl || undefined,
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
          photoUrl: true,
          accountId: true,
          createdAt: true,
        },
      });

      const auditEntry = await tx.auditLog.create({
        data: {
          userId: userId,
          action: 'CREATE',
          entity: 'transaction',
          entityId: created.id,
          newData: JSON.stringify(created),
        },
      });

      return [created, auditEntry];
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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';

// Validation schemas
const createAccountSchema = z.object({
  code: z.string().min(1, 'Kode akun wajib diisi').max(20),
  name: z.string().min(1, 'Nama akun wajib diisi').max(100),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
  description: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

// GET /api/accounts — semua akun (Superadmin/Pimpinan)
export async function GET(req: Request) {
  const session = await getServerSession(authConfig);
  if (!session || !['SUPERADMIN', 'PIMPINAN'].includes(session.user?.role as string)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (type) where.type = type as any;
    if (isActive !== null) where.isActive = isActive === 'true';

    const accounts = await prisma.account.findMany({
      where,
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        description: true,
        isActive: true,
        parentId: true,
        parent: {
          select: { id: true, name: true, code: true }
        },
        children: {
          select: { id: true, name: true, code: true }
        },
      },
    });

    return NextResponse.json({ 
      data: accounts,
      meta: { count: accounts.length }
    });
  } catch (error) {
    console.error('[GET /api/accounts]', error);
    return NextResponse.json({ error: 'Gagal memuat akun' }, { status: 500 });
  }
}

// POST /api/accounts — create akun (Superadmin only)
export async function POST(req: Request) {
  const session = await getServerSession(authConfig);
  if (!session || session.user?.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Akses ditolak — Superadmin only' }, { status: 403 });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const parsed = createAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { code, name, type, description, parentId, isActive } = parsed.data;

    // Check duplicate
    const existing = await prisma.account.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: `Akun dengan kode ${code} sudah ada` },
        { status: 409 }
      );
    }

    const account = await prisma.account.create({
      data: {
        code,
        name,
        type,
        description: description || null,
        parentId: parentId || null,
        isActive: isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        description: true,
        isActive: true,
        parentId: true,
        createdAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'account',
        entityId: account.id,
        newData: JSON.stringify(account),
      },
    });

    return NextResponse.json(
      { data: account, message: 'Akun berhasil dibuat' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/accounts]', error);
    return NextResponse.json({ error: 'Gagal membuat akun' }, { status: 500 });
  }
}

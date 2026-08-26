import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';

const updateUnitSchema = z.object({
  name: z.string().min(1, 'Nama unit wajib diisi').max(100).optional(),
  code: z.string().min(1, 'Kode unit wajib diisi').max(20).toUpperCase().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  lembagaId: z.string().optional(),
});

// GET /api/units/:id
// Get single unit detail. Superadmin: full info. Others: detail + inactive allowed if referenced.
export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Unit ID required' }, { status: 400 });
  }

  try {
    // Use separate queries to avoid TS issues with _count typing
    const unit = await prisma.unit.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        lembagaId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Get counts separately
    const [userCount, transactionCount] = await Promise.all([
      prisma.user.count({ where: { unitId: id } }),
      prisma.transaction.count({ where: { unitId: id } }),
    ]);

    return NextResponse.json({ 
      data: {
        ...unit,
        _count: {
          users: userCount,
          transactions: transactionCount,
        },
      }
    });
  } catch (error) {
    console.error('[GET /api/units/:id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/units/:id
// Update unit. Accessible by: SUPERADMIN.
export async function PATCH(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Unit ID required' }, { status: 400 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    
    // Validate input
    const parsed = updateUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }
    
    // Fetch existing unit with full data for audit log
    const existing = await prisma.unit.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Check duplicate code (excluding self)
    if (parsed.data.code) {
      const dup = await prisma.unit.findFirst({
        where: { code: parsed.data.code, id: { not: id } },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json(
          { error: 'Kode unit sudah digunakan' },
          { status: 409 }
        );
      }
    }

    // Validate lembagaId if provided
    if (parsed.data.lembagaId) {
      const lembaga = await prisma.lembaga.findUnique({ where: { id: parsed.data.lembagaId }, select: { id: true } });
      if (!lembaga) {
        return NextResponse.json({ error: 'Lembaga tidak ditemukan' }, { status: 404 });
      }
    }

    const updated = await prisma.unit.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'unit',
        entityId: id,
        oldData: JSON.stringify(existing),
        newData: JSON.stringify(updated),
      },
    });

    return NextResponse.json({ data: updated, message: 'Unit berhasil diupdate' });
  } catch (error) {
    console.error('[PATCH /api/units/:id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/units/:id
// Soft-delete unit (isActive = false). Superadmin only.
export async function DELETE(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Unit ID required' }, { status: 400 });
  }

  const userId = session.user.id;

  try {
    // Check if unit exists
    const existing = await prisma.unit.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true, 
        code: true, 
        isActive: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Check if unit has active users using separate query
    const userCount = await prisma.user.count({ where: { unitId: id } });

    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Unit masih memiliki pengguna — nonaktifkan dulu semua user' },
        { status: 400 }
      );
    }

    // Soft delete
    const updated = await prisma.unit.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE_SOFT',
        entity: 'unit',
        entityId: id,
        oldData: JSON.stringify({ ...existing, _count: { users: userCount } }),
        newData: JSON.stringify(updated),
      },
    });

    return NextResponse.json({
      message: 'Unit berhasil dinonaktifkan',
      data: updated,
    });
  } catch (error) {
    console.error('[DELETE /api/units/:id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/units/:id - Alias for creating unit (for consistency)
export async function POST(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  // If no id, this is handled by the parent route
  if (id && id !== 'undefined') {
    return NextResponse.json(
      { error: 'Use PATCH to update an existing unit' },
      { status: 400 }
    );
  }

  // Forward to parent route handling
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ error: 'Use POST /api/units' }, { status: 400 });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';

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
    const unit = await prisma.unit.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          users: true,
          transactions: true,
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    return NextResponse.json({ data: unit });
  } catch (error) {
    console.error('[GET /api/units/:id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/units/:id
// Update unit. Accessible by: SUPERADMIN + PIMPINAN.
export async function PATCH(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Unit ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, code, description, isActive } = body;

    // Check if unit exists
    const existing = await prisma.unit.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Check duplicate code (excluding self)
    if (code) {
      const dup = await prisma.unit.findFirst({
        where: { code: code.toUpperCase(), id: { not: id } },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json(
          { error: 'Kode unit sudah digunakan' },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.unit.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
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
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'unit',
        entityId: id,
        oldData: JSON.stringify({ name: existing?.name ?? name }), // simplified
        newData: JSON.stringify(updated),
      },
    });

    return NextResponse.json({ data: updated });
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

  try {
    const existing = await prisma.unit.findUnique({
      where: { id },
      select: { name: true, isActive: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
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
        userId: session.user.id,
        action: 'DELETE_SOF',
        entity: 'unit',
        entityId: id,
        oldData: JSON.stringify(existing),
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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { updateInventoryItemSchema } from '@/lib/validations/inventory';

// GET /api/inventory/:id
export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  const id = pathname.split('/').filter(Boolean).pop()!;

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error('[GET /api/inventory/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/inventory/:id
export async function PATCH(request: Request) {
  const { pathname } = new URL(request.url);
  const id = pathname.split('/').filter(Boolean).pop()!;

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'Staff tidak dapat mengubah stok' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateInventoryItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true, unitId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Non-superadmin: can only edit own unit's items
    if (session.user.role !== 'SUPERADMIN' && existing.unitId !== session.user.unitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ data: updated, message: 'Item berhasil diperbarui' });
  } catch (error) {
    console.error('[PATCH /api/inventory/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/inventory/:id — soft delete (isActive = false)
export async function DELETE(request: Request) {
  const { pathname } = new URL(request.url);
  const id = pathname.split('/').filter(Boolean).pop()!;

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'Staff tidak dapat menghapus' }, { status: 403 });
  }

  try {
    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true, unitId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (session.user.role !== 'SUPERADMIN' && existing.unitId !== session.user.unitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Item berhasil dihapus (non-aktif)' });
  } catch (error) {
    console.error('[DELETE /api/inventory/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

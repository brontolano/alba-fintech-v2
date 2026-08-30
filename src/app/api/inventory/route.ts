import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { createInventoryItemSchema, updateInventoryItemSchema } from '@/lib/validations/inventory';

// GET /api/inventory
// List inventory items with Lembaga -> Unit scoping.
// Query: ?lembagaId=xxx&unitId=yyy (superadmin); otherwise unitId derived from session
export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const userUnitId = session.user.unitId;

  const url = new URL(request.url);
  const lembagaFilter = url.searchParams.get('lembagaId');
  const unitFilter = url.searchParams.get('unitId');

  try {
    if (role === 'SUPERADMIN') {
      let where: any = { isActive: true };
      if (lembagaFilter) {
        where.unit = { lembagaId: lembagaFilter, ...where.unit };
      }
      if (unitFilter) {
        where.unitId = unitFilter;
      }

      const items = await prisma.inventoryItem.findMany({
        where,
        include: {
          unit: { select: { id: true, name: true, code: true } },
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({
        data: items,
        meta: { count: items.length, role },
      });
    } else {
      // PIMPINAN, MANAGER, STAFF — only items for their own unit
      const where: any = { unitId: userUnitId };
      if (unitFilter) {
        // Non-superadmin can still only see own unit
        where.unitId = userUnitId;
      }

      const items = await prisma.inventoryItem.findMany({
        where,
        include: {
          unit: { select: { id: true, name: true, code: true } },
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({
        data: items,
        meta: { count: items.length, role },
      });
    }
  } catch (error) {
    console.error('[GET /api/inventory]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/inventory
// Create inventory item. SUPERADMIN only (with unitId). Others create into own unit.
export async function POST(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'Staff tidak dapat menambah stok' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createInventoryItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 },
      );
    }

    let unitId = parsed.data.unitId;

    // Non-superadmin: force into own unit
    if (session.user.role !== 'SUPERADMIN') {
      unitId = session.user.unitId!;
    }

    if (!unitId) {
      return NextResponse.json({ error: 'Unit wajib ditentukan' }, { status: 400 });
    }

    if (parsed.data.sku) {
      const existing = await prisma.inventoryItem.findUnique({
        where: { sku: parsed.data.sku },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: 'SKU sudah terdaftar' }, { status: 409 });
      }
    }

    const item = await prisma.inventoryItem.create({
      data: {
        ...parsed.data,
        unitId,
      },
    });

    return NextResponse.json({ data: item, message: 'Item inventaris berhasil ditambahkan' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/inventory]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

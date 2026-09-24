import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { unlink } from 'fs/promises';
import { join } from 'path';


// Schema for creating inventory items
const createInventorySchema = z.object({
  name: z.string().min(1, 'Nama barang wajib diisi'),
  sku: z.string().min(1, 'SKU wajib diisi'),
  category: z.string().optional(),
  unitPrice: z.number().positive('Harga harus positif'),
  purchasePrice: z.number().positive('Harga beli harus positif').optional(),
  minStock: z.number().int().min(0, 'Stok minimum harus positif').optional(),
  isActive: z.boolean().default(true),
  imageUrl: z.string().optional().nullable(),
  unitId: z.string().optional(),
});

// Schema for query parameters
const querySchema = z.object({
  unitId: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  isActive: z.string().optional(),
  isConsignment: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = session.user.role;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN' && role !== 'MANAGER' && role !== 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }

    // Build where clause
    const where: any = {};

    // Role-based filtering - SUPERADMIN can see all, others filtered by unit or lembaga
    if (role === 'MANAGER' || role === 'STAFF') {
      where.unitId = session.user.unitId;
    } else if (role === 'PIMPINAN') {
      // PIMPINAN can see all units within their lembaga
      const lembagaId = session.user.lembagaId;
      if (lembagaId) {
        const userUnits = await prisma.unit.findMany({
          where: { lembagaId },
          select: { id: true },
        });
        if (userUnits.length > 0) {
          where.unitId = { in: userUnits.map((u) => u.id) };
        } else {
          // No units in lembaga - return empty result
          return NextResponse.json({
            data: [],
            summary: { total: 0, pages: 0 },
          }, { status: 200 });
        }
      } else {
        // No lembagaId assigned - return empty result
        return NextResponse.json({
          data: [],
          summary: { total: 0, pages: 0 },
        }, { status: 200 });
      }
    }
    // SUPERADMIN has no unit filter, can see all items

    // Allow unit filter override - SUPERADMIN can filter by any unit, others by their own
    if (parsed.data.unitId) {
      if (role === 'SUPERADMIN') {
        where.unitId = parsed.data.unitId;
      } else if (role === 'MANAGER' || role === 'STAFF') {
        where.unitId = session.user.unitId;
      }
      // PIMPINAN already has lembaga-based filtering above
    }
    if (parsed.data.category) {
      where.category = parsed.data.category;
    }
    if (parsed.data.search) {
      where.OR = [
        { name: { contains: parsed.data.search } },
        { sku: { contains: parsed.data.search } },
      ];
    }
    if (parsed.data.isActive !== undefined) {
      where.isActive = parsed.data.isActive === 'true';
    }
    if (parsed.data.isConsignment === 'true') {
      where.consignment_item = { is: { id: { not: null } } };
    } else if (parsed.data.isConsignment === 'false') {
      where.consignment_item = null;
    }

    // Fetch inventory items (orderItems excluded to avoid heavy joins)
    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        units: true,
        consignment_item: {
          select: { id: true, ownerId: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
      skip: (parsed.data.page - 1) * parsed.data.limit,
      take: parsed.data.limit,
    });

    const total = await prisma.inventoryItem.count({ where });

    // Ringkasan KPI unit (abaikan filter tab/qty halaman): hitung per unit scope.
    const unitScope: any = {};
    if (where.unitId !== undefined) unitScope.unitId = where.unitId;
    const [pondokCount, titipanCount, valuasi] = await Promise.all([
      prisma.inventoryItem.count({
        where: { ...unitScope, isActive: true, consignment_item: null },
      }),
      prisma.inventoryItem.count({
        where: {
          ...unitScope,
          isActive: true,
          consignment_item: { is: { id: { not: null } } },
        },
      }),
      prisma.inventoryItem.findMany({
        where: { ...unitScope, isActive: true },
        select: { currentStock: true, purchasePrice: true },
      }),
    ]);
    const modalValuation = valuasi.reduce(
      (s, v) => s + (v.currentStock ?? 0) * Number(v.purchasePrice ?? 0),
      0,
    );

    return NextResponse.json({
      data: items.map((i) => ({
        ...i,
        isConsignment: Boolean(i.consignment_item),
        isConsignmentOwner: i.consignment_item?.ownerId ?? null,
      })),
      summary: {
        total,
        pages: Math.ceil(total / parsed.data.limit),
        pondokCount,
        titipanCount,
        modalValuation: Math.round(modalValuation * 100) / 100,
      },
    }, { status: 200 });
  } catch (error: any) {
    // Handle database/table errors gracefully
    if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('Table')) {
      console.error('[Inventory API] Table not found - inventory_items may need migration:', error.message);
      return NextResponse.json({ 
        error: 'Tabel inventory belum dibuat. Jalankan migration database.',
        data: [],
        summary: { total: 0, pages: 0 }
      }, { status: 500 });
    }
    console.error('[Inventory API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = session.user.role;
    if (role !== 'SUPERADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = createInventorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Determine unit - required for all roles
    let unitId = parsed.data.unitId;
    if (!unitId) {
      if (role === 'SUPERADMIN') {
        // SUPERADMIN must select a unit
        return NextResponse.json({ error: 'Unit wajib dipilih' }, { status: 400 });
      } else {
        // MANAGER/STAFF use their assigned unit
        if (!session.user.unitId) {
          return NextResponse.json({ error: 'Unit pengguna tidak ditemukan' }, { status: 400 });
        }
        unitId = session.user.unitId;
      }
    }

    // Create inventory item
    const item = await prisma.inventoryItem.create({
      data: {
        name: parsed.data.name,
        sku: parsed.data.sku,
        category: parsed.data.category,
        imageUrl: parsed.data.imageUrl,
        unitPrice: parsed.data.unitPrice,
        purchasePrice: parsed.data.purchasePrice,
        minStock: parsed.data.minStock || 0,
         isActive: parsed.data.isActive,
         unitId,
       },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: any) {
    // Handle database/table errors gracefully
    if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('Table')) {
      console.error('[Inventory API] Table not found - inventory_items may need migration:', error.message);
      return NextResponse.json({ 
        error: 'Tabel inventory belum dibuat. Jalankan migration database.'
      }, { status: 500 });
    }
    console.error('[Inventory API] Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU sudah digunakan' }, { status: 409 });
    }
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = session.user.role;
    if (role !== 'SUPERADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = z.object({
      id: z.string(),
    }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Validate ownership for non-superadmin
    const item = await prisma.inventoryItem.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, unitId: true, imageUrl: true },
    });
    if (!item) {
      return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 });
    }
    if (role !== 'SUPERADMIN' && item.unitId !== session.user.unitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete associated image file if it's a local upload
    if (item.imageUrl && item.imageUrl.startsWith('/uploads/inventory/')) {
      try {
        const filename = item.imageUrl.split('/').pop();
        if (filename) {
          const filePath = join(process.cwd(), 'public', 'uploads', 'inventory', filename);
          await unlink(filePath);
        }
      } catch (unlinkError) {
        // Log error but don't fail the deletion if file doesn't exist
        console.warn('[Inventory API] Failed to delete image file:', unlinkError);
      }
    }

    await prisma.inventoryItem.delete({ where: { id: parsed.data.id } });
    return NextResponse.json({ message: 'Barang berhasil dihapus' }, { status: 200 });
  } catch (error: any) {
    // Handle database/table errors gracefully
    if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('Table')) {
      console.error('[Inventory API] Table not found - inventory_items may need migration:', error.message);
      return NextResponse.json({ 
        error: 'Tabel inventory belum dibuat. Jalankan migration database.'
      }, { status: 500 });
    }
    console.error('[Inventory API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
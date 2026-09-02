import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema for creating inventory items
const createInventorySchema = z.object({
  name: z.string().min(1, 'Nama barang wajib diisi'),
  sku: z.string().min(1, 'SKU wajib diisi'),
  category: z.string().optional(),
  unitPrice: z.number().positive('Harga harus positif'),
  purchasePrice: z.number().positive('Harga beli harus positif').optional(),
  minStock: z.number().int().min(0, 'Stok minimum harus positif').optional(),
  isActive: z.boolean().default(true),
  unitId: z.string().optional(),
});

// Schema for query parameters
const querySchema = z.object({
  unitId: z.string().optional(),
  category: z.string().optional(),
  isActive: z.string().optional(),
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
    if (role !== 'SUPERADMIN' && role !== 'MANAGER' && role !== 'STAFF') {
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

    // Role-based filtering
    if (role === 'MANAGER' || role === 'STAFF') {
      where.unitId = session.user.unitId;
    }

    if (parsed.data.unitId) {
      where.unitId = parsed.data.unitId;
    }
    if (parsed.data.category) {
      where.category = parsed.data.category;
    }
    if (parsed.data.isActive !== undefined) {
      where.isActive = parsed.data.isActive === 'true';
    }

    // Fetch inventory items
    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        unit: true,
        orderItems: true,
      },
      orderBy: {
        name: 'asc',
      },
      skip: (parsed.data.page - 1) * parsed.data.limit,
      take: parsed.data.limit,
    });

    const total = await prisma.inventoryItem.count({ where });

    return NextResponse.json({
      data: items,
      summary: {
        total,
        pages: Math.ceil(total / parsed.data.limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Inventory API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

    // Determine unit
    let unitId = parsed.data.unitId;
    if (!unitId && role !== 'SUPERADMIN') {
      unitId = session.user.unitId!;
    }

    // Create inventory item
    const item = await prisma.inventoryItem.create({
      data: {
        name: parsed.data.name,
        sku: parsed.data.sku,
        category: parsed.data.category,
        unitPrice: parsed.data.unitPrice,
        purchasePrice: parsed.data.purchasePrice,
        minStock: parsed.data.minStock || 0,
        isActive: parsed.data.isActive,
        unitId: unitId!,
      },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: any) {
    console.error('[Inventory API] Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU sudah digunakan' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

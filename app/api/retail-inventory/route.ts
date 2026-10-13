import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const retailUnitId = searchParams.get('retailUnitId');
    const search = searchParams.get('search');
    const stockStatus = searchParams.get('stockStatus');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!retailUnitId) {
      return NextResponse.json({ error: 'retailUnitId wajib diisi' }, { status: 400 });
    }

    const where: any = {
      retailUnitId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.retailProduct.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          inventories: {
            where: { retailUnitId },
            select: { quantity: true },
          },
        },
      }),
      prisma.retailProduct.count({ where }),
    ]);

    // Merge product with inventory data
    const items = products.map(product => {
      const inventory = product.inventories[0];
      const currentStock = inventory?.quantity ?? 0;
      const minStock = product.minStock;
      let stockStatus: 'OK' | 'LOW' | 'OUT' = 'OK';
      if (currentStock === 0) stockStatus = 'OUT';
      else if (currentStock <= minStock) stockStatus = 'LOW';

      return {
        ...product,
        inventory,
        currentStock,
        stockStatus,
      };
    });

    // Filter by stock status if requested
    let filteredItems = items;
    if (stockStatus) {
      filteredItems = items.filter(item => item.stockStatus === stockStatus);
    }

    return NextResponse.json({
      data: filteredItems,
      pagination: { page, limit, total: filteredItems.length, totalPages: Math.ceil(filteredItems.length / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, description, price, minStock, retailUnitId } = body;

    if (!name || !code || price === undefined || !retailUnitId) {
      return NextResponse.json({ error: 'name, code, price, retailUnitId wajib diisi' }, { status: 400 });
    }

    // Check if code already exists
    const existing = await prisma.retailProduct.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'Kode produk sudah digunakan' }, { status: 400 });
    }

    const product = await prisma.retailProduct.create({
      data: {
        name,
        code,
        description,
        price,
        minStock: minStock || 5,
        retailUnitId,
      },
    });

    // Create inventory record
    await prisma.retailInventory.create({
      data: {
        retailUnitId,
        productId: product.id,
        quantity: 0,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
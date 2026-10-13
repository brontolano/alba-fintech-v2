import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const retailUnitId = searchParams.get('retailUnitId');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    if (retailUnitId) where.retailUnitId = retailUnitId;
    if (isActive !== null) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.retailProduct.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          retailUnit: { select: { id: true, name: true, code: true, type: true } },
          inventories: { select: { quantity: true } },
        },
      }),
      prisma.retailProduct.count({ where }),
    ]);

    return NextResponse.json({
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, retailUnitId, price, description, minStock } = body;

    if (!name || !code || !retailUnitId || price === undefined) {
      return NextResponse.json({ error: 'name, code, retailUnitId, price wajib diisi' }, { status: 400 });
    }

    const product = await prisma.retailProduct.create({
      data: {
        name,
        code,
        retailUnitId,
        price,
        description,
        minStock: minStock ?? 5,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
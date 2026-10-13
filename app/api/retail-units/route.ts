import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get('unitId');
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    if (unitId) where.unitId = unitId;
    if (type) where.type = type;
    if (isActive !== null) where.isActive = isActive === 'true';

    const [retailUnits, total] = await Promise.all([
      prisma.retailUnit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          unit: { select: { id: true, name: true, code: true } },
          _count: { select: { products: true, transactions: true } },
        },
      }),
      prisma.retailUnit.count({ where }),
    ]);

    return NextResponse.json({
      data: retailUnits,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, type, description, unitId } = body;

    if (!name || !code || !type || !unitId) {
      return NextResponse.json({ error: 'name, code, type, unitId wajib diisi' }, { status: 400 });
    }

    const retailUnit = await prisma.retailUnit.create({
      data: { name, code, type, description, unitId },
    });

    return NextResponse.json(retailUnit, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
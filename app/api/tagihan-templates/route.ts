import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const templates = await prisma.tagihanTemplate.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch tagihan templates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, type, items } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const template = await prisma.tagihanTemplate.create({
      data: {
        name,
        description,
        type: type || 'CUSTOM',
        items: items
          ? {
              create: items.map((item: any) => ({
                kode: item.kode,
                nama: item.nama,
                nominal: item.nominal,
                kategori: item.kategori,
                periode: item.periode,
                urutan: item.urutan,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
            }
          : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: { items: true },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create tagihan template' }, { status: 500 });
  }
}

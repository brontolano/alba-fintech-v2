import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const template = await prisma.tagihanTemplate.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json(template.items);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch template items' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { kode, nama, nominal, kategori, periode, urutan } = body;

    if (!nama || typeof nominal !== 'number') {
      return NextResponse.json({ error: 'Name and nominal are required' }, { status: 400 });
    }

    const template = await prisma.tagihanTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const item = await prisma.tagihanTemplateItem.create({
      data: {
        templateId: id,
        kode,
        nama,
        nominal,
        kategori,
        periode,
        urutan: urutan ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create template item' }, { status: 500 });
  }
}

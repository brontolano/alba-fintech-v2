import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rolling = await prisma.rolling.findUnique({
      where: { id: params.id },
      include: { unit: true, petugas: true },
    });
    if (!rolling) {
      return NextResponse.json({ error: 'Rolling not found' }, { status: 404 });
    }
    return NextResponse.json(rolling);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch rolling' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { unitId, petugasId, start_date, end_date, shift_type, keterangan } = body;

    const rolling = await prisma.rolling.update({
      where: { id: params.id },
      data: {
        unitId,
        petugasId,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
        shift_type,
        keterangan,
        updatedAt: new Date(),
      },
      include: { unit: true, petugas: true },
    });

    return NextResponse.json(rolling);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update rolling' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.rolling.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete rolling' }, { status: 500 });
  }
}

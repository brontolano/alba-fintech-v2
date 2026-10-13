import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const rollings = await prisma.rolling.findMany({
      include: { unit: true, petugas: true },
      orderBy: { start_date: 'desc' },
    });
    return NextResponse.json(rollings);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch rollings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { unitId, petugasId, start_date, end_date, shift_type, keterangan } = body;

    if (!unitId || !petugasId || !start_date || !end_date) {
      return NextResponse.json({ error: 'unitId, petugasId, start_date, end_date are required' }, { status: 400 });
    }

    const rolling = await prisma.rolling.create({
      data: {
        unitId,
        petugasId,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        shift_type: shift_type || 'PAGI',
        keterangan,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: { unit: true, petugas: true },
    });

    return NextResponse.json(rolling, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create rolling' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const shifts = await prisma.shift.findMany({
      include: { unit: true, petugas: true, absensis: true },
      orderBy: { tanggal: 'desc' },
    });
    return NextResponse.json(shifts);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { unitId, petugasId, tanggal, jamMulai, jamSelesai, jenis, status, keterangan } = body;

    if (!unitId || !petugasId || !tanggal || !jamMulai) {
      return NextResponse.json({ error: 'unitId, petugasId, tanggal, jamMulai are required' }, { status: 400 });
    }

    const shift = await prisma.shift.create({
      data: {
        unitId,
        petugasId,
        tanggal: new Date(tanggal),
        jamMulai: new Date(jamMulai),
        jamSelesai: jamSelesai ? new Date(jamSelesai) : null,
        jenis: jenis || 'PAGI',
        status: status || 'ACTIVE',
        keterangan,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: { unit: true, petugas: true },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 });
  }
}

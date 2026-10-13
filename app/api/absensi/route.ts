import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const absensis = await prisma.absensi.findMany({
      include: { shift: true, petugas: true },
      orderBy: { tanggal: 'desc' },
    });
    return NextResponse.json(absensis);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch absensi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shiftId, petugasId, tanggal, checkIn, checkOut, status, keterangan } = body;

    if (!shiftId || !petugasId || !tanggal) {
      return NextResponse.json({ error: 'shiftId, petugasId, tanggal are required' }, { status: 400 });
    }

    const absensi = await prisma.absensi.create({
      data: {
        shiftId,
        petugasId,
        tanggal: new Date(tanggal),
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || 'HADIR',
        keterangan,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: { shift: true, petugas: true },
    });

    return NextResponse.json(absensi, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create absensi' }, { status: 500 });
  }
}

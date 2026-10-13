import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const absensi = await prisma.absensi.findUnique({
      where: { id: params.id },
      include: { shift: true, petugas: true },
    });
    if (!absensi) {
      return NextResponse.json({ error: 'Absensi not found' }, { status: 404 });
    }
    return NextResponse.json(absensi);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch absensi' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { shiftId, petugasId, tanggal, checkIn, checkOut, status, keterangan } = body;

    const absensi = await prisma.absensi.update({
      where: { id: params.id },
      data: {
        shiftId,
        petugasId,
        tanggal: tanggal ? new Date(tanggal) : undefined,
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        status,
        keterangan,
        updatedAt: new Date(),
      },
      include: { shift: true, petugas: true },
    });

    return NextResponse.json(absensi);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update absensi' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.absensi.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete absensi' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: params.id },
      include: { unit: true, petugas: true, absensis: true },
    });
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }
    return NextResponse.json(shift);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch shift' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { unitId, petugasId, tanggal, jamMulai, jamSelesai, jenis, status, keterangan } = body;

    const shift = await prisma.shift.update({
      where: { id: params.id },
      data: {
        unitId,
        petugasId,
        tanggal: tanggal ? new Date(tanggal) : undefined,
        jamMulai: jamMulai ? new Date(jamMulai) : undefined,
        jamSelesai: jamSelesai ? new Date(jamSelesai) : undefined,
        jenis,
        status,
        keterangan,
        updatedAt: new Date(),
      },
      include: { unit: true, petugas: true },
    });

    return NextResponse.json(shift);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.shift.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING';
    const type = searchParams.get('type'); // 'LAPORAN_HARIAN', 'PEMBAYARAN', 'TAGIHAN'

    const approvals = await prisma.approval.findMany({
      where: {
        status,
        ...(type ? { type } : {}),
      },
      include: {
        unit: true,
        requestedBy: true,
        approvedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(approvals);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, unitId, requestedById, referenceId, referenceType, data, keterangan } = body;

    if (!type || !unitId || !requestedById || !referenceId || !referenceType) {
      return NextResponse.json({ error: 'type, unitId, requestedById, referenceId, referenceType required' }, { status: 400 });
    }

    const approval = await prisma.approval.create({
      data: {
        type,
        unitId,
        requestedById,
        referenceId,
        referenceType,
        data: data || {},
        keterangan,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: { unit: true, requestedBy: true },
    });

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create approval' }, { status: 500 });
  }
}

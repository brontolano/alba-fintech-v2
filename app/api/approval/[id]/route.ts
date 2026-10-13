import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const approval = await prisma.approval.findUnique({
      where: { id: params.id },
      include: { unit: true, requestedBy: true, approvedBy: true },
    });
    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }
    return NextResponse.json(approval);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch approval' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, approvedById, keterangan } = body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Valid status (APPROVED/REJECTED) required' }, { status: 400 });
    }
    if (!approvedById) {
      return NextResponse.json({ error: 'approvedById required' }, { status: 400 });
    }

    const approval = await prisma.approval.update({
      where: { id: params.id },
      data: {
        status,
        approvedById,
        approvedAt: new Date(),
        keterangan: keterangan || undefined,
        updatedAt: new Date(),
      },
      include: { unit: true, requestedBy: true, approvedBy: true },
    });

    return NextResponse.json(approval);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.approval.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete approval' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status: newStatus, keterangan, approvedById } = body;

    if (!id || (!newStatus || !approvedById)) {
      return NextResponse.json({ error: 'id, status, approvedById required' }, { status: 400 });
    }

    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'status harus APPROVED atau REJECTED' }, { status: 400 });
    }

    const approval = await prisma.approval.findUnique({
      where: { id },
      include: { unit: true, requestedBy: true, approvedBy: true },
    });

    if (!approval) {
      return NextResponse.json({ error: 'Approval tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.approval.update({
      where: { id },
      data: {
        status: newStatus,
        approvedById,
        approvedAt: new Date(),
        keterangan: keterangan || approval.keterangan,
        updatedAt: new Date(),
      },
      include: { unit: true, requestedBy: true, approvedBy: true },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        entityType: 'Approval',
        entityId: updated.id,
        action: `CHANGE_STATUS`,
        userId: approvedById,
        newData: JSON.stringify({ status: newStatus, keterangan }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Failed to update approval' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING';
    const type = searchParams.get('type');
    const unitId = searchParams.get('unitId');

    const approvals = await prisma.approval.findMany({
      where: {
        status,
        ...(type ? { type } : {}),
        ...(unitId ? { unitId } : {}),
      },
      include: {
        unit: true,
        requestedBy: true,
        approvedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(approvals);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
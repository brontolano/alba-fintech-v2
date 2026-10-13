import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const allowedRoles = ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU'];

function getRoleFromRequest(req: NextRequest): string {
  return req.headers.get('x-user-role') || 'SUPERADMIN';
}

function canAccessTagihan(role: string): boolean {
  return allowedRoles.includes(role);
}

function canApproveAdjustment(role: string): boolean {
  return ['SUPERADMIN', 'MANAGER KPAK'].includes(role);
}

// PUT - Approve/Reject adjustment
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getRoleFromRequest(req);
    if (!canApproveAdjustment(role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, keterangan } = body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Status harus APPROVED atau REJECTED' }, { status: 400 });
    }

    const existing = await prisma.tagihanAdjustment.findUnique({
      where: { id },
      include: { tagihan: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 });
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json({ error: 'Adjustment sudah diproses' }, { status: 400 });
    }

    const currentUserId = req.headers.get('x-user-id') || 'system';

    const adjustment = await prisma.$transaction(async (tx) => {
      const updated = await tx.tagihanAdjustment.update({
        where: { id },
        data: {
          status,
          approvedById: currentUserId,
          approvedAt: new Date(),
          keterangan: keterangan || existing.keterangan,
        },
        include: {
          tagihan: { select: { id: true, totalNilai: true, status: true, santri: { select: { id: true, studentNumber: true, name: true } } } },
          user: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      });

      // If approved, update tagihan total
      if (status === 'APPROVED') {
        const newTotal = existing.tipe === 'DISKON'
          ? existing.tagihan.totalNilai - existing.nominal
          : existing.tagihan.totalNilai + existing.nominal;

        await tx.tagihan.update({
          where: { id: existing.tagihanId },
          data: { totalNilai: Math.max(0, newTotal) },
        });
      }

      return updated;
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'TagihanAdjustment',
        entityId: adjustment.id,
        action: status === 'APPROVED' ? 'APPROVE' : 'REJECT',
        userId: currentUserId,
        newData: JSON.stringify(adjustment),
      },
    });

    return NextResponse.json(adjustment);
  } catch (error: any) {
    console.error('PUT tagihan adjustment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
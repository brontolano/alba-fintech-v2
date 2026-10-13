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

function canCreateAdjustment(role: string): boolean {
  return ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU'].includes(role);
}

function canApproveAdjustment(role: string): boolean {
  return ['SUPERADMIN', 'MANAGER KPAK'].includes(role);
}

// GET - List adjustments (with filter by tagihanId, status, etc.)
export async function GET(req: NextRequest) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTagihan(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tagihanId = searchParams.get('tagihanId');
    const santriId = searchParams.get('santriId');
    const status = searchParams.get('status');
    const tipe = searchParams.get('tipe');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    if (tagihanId) where.tagihanId = tagihanId;
    if (santriId) where.santriId = santriId;
    if (status) where.status = status;
    if (tipe) where.tipe = tipe;

    const [adjustments, total] = await Promise.all([
      prisma.tagihanAdjustment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tagihan: { select: { id: true, totalNilai: true, status: true, santri: { select: { id: true, studentNumber: true, name: true } } } },
          user: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.tagihanAdjustment.count({ where }),
    ]);

    return NextResponse.json({
      data: adjustments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('GET tagihan adjustments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new adjustment
export async function POST(req: NextRequest) {
  try {
    const role = getRoleFromRequest(req);
    if (!canCreateAdjustment(role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const body = await req.json();
    const { tagihanId, tipe, nominal, keterangan } = body;

    if (!tagihanId || !tipe || nominal === undefined) {
      return NextResponse.json({ error: 'tagihanId, tipe, nominal wajib diisi' }, { status: 400 });
    }
    if (!['DISKON', 'BIAYA_TAMBAHAN', 'PENANGGUNG_JAWAB'].includes(tipe)) {
      return NextResponse.json({ error: 'Tipe harus DISKON, BIAYA_TAMBAHAN, atau PENANGGUNG_JAWAB' }, { status: 400 });
    }
    if (nominal <= 0) {
      return NextResponse.json({ error: 'Nominal harus lebih dari 0' }, { status: 400 });
    }

    const tagihan = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
      include: { santri: true },
    });

    if (!tagihan) {
      return NextResponse.json({ error: 'Tagihan not found' }, { status: 404 });
    }

    const currentUserId = req.headers.get('x-user-id') || 'system';

    const adjustment = await prisma.tagihanAdjustment.create({
      data: {
        tagihanId,
        santriId: tagihan.santriId,
        userId: currentUserId,
        tipe,
        nominal,
        keterangan,
        status: canApproveAdjustment(role) ? 'APPROVED' : 'PENDING',
        approvedById: canApproveAdjustment(role) ? currentUserId : null,
        approvedAt: canApproveAdjustment(role) ? new Date() : null,
      },
      include: {
        tagihan: { select: { id: true, totalNilai: true, status: true } },
        user: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    // If auto-approved (MANAGER KPAK), update tagihan total
    if (canApproveAdjustment(role)) {
      const newTotal = tipe === 'DISKON' ? tagihan.totalNilai - nominal : tagihan.totalNilai + nominal;
      await prisma.tagihan.update({
        where: { id: tagihanId },
        data: { totalNilai: Math.max(0, newTotal) },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'TagihanAdjustment',
        entityId: adjustment.id,
        action: 'CREATE',
        userId: currentUserId,
        newData: JSON.stringify(adjustment),
      },
    });

    return NextResponse.json(adjustment, { status: 201 });
  } catch (error: any) {
    console.error('POST tagihan adjustment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
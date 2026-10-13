import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const allowedRoles = ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU', 'PIMPINAN'];

function getRoleFromRequest(req: NextRequest): string {
  return req.headers.get('x-user-role') || 'SUPERADMIN';
}

function canAccessTagihan(role: string): boolean {
  return allowedRoles.includes(role);
}

function canCreatePayment(role: string): boolean {
  return ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU'].includes(role);
}

// GET - Single tagihan by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTagihan(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const tagihan = await prisma.tagihan.findUnique({
      where: { id },
      include: {
        santri: {
          select: {
            id: true,
            studentNumber: true,
            name: true,
            className: true,
            unit: { select: { id: true, name: true } }
          }
        },
        template: { select: { id: true, name: true, type: true } },
        tagihanItem: { orderBy: { urutan: 'asc' } },
        pembayaran: { orderBy: { tanggal: 'desc' } },
      }
    });

    if (!tagihan) {
      return NextResponse.json({ error: 'Tagihan not found' }, { status: 404 });
    }

    return NextResponse.json(tagihan);
  } catch (error) {
    console.error('GET tagihan error:', error);
    return NextResponse.json({ error: 'Failed to fetch tagihan' }, { status: 500 });
  }
}

// POST - Create payment for tagihan (integrates with tabungan)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getRoleFromRequest(req);
    if (!canCreatePayment(role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { nominal, tipe, keterangan, buktiUrl, santriId, useTabungan, userId } = body;

    if (!nominal || nominal <= 0) {
      return NextResponse.json({ error: 'Nominal harus lebih dari 0' }, { status: 400 });
    }
    if (!tipe || !['CASH', 'BANK', 'TABUNGAN'].includes(tipe)) {
      return NextResponse.json({ error: 'Tipe pembayaran harus CASH, BANK, atau TABUNGAN' }, { status: 400 });
    }

    const tagihan = await prisma.tagihan.findUnique({
      where: { id },
      include: {
        santri: true,
        template: { select: { id: true, name: true, type: true } },
        pembayaran: true,
      }
    });

    if (!tagihan) {
      return NextResponse.json({ error: 'Tagihan not found' }, { status: 404 });
    }

    // Calculate total paid
    const totalPaid = tagihan.pembayaran
      .filter((p: any) => p.status === 'LUNAS')
      .reduce((sum: number, p: any) => sum + p.nominal, 0);
    const remainingAmount = tagihan.totalNilai - totalPaid;

    if (nominal > remainingAmount) {
      return NextResponse.json({ error: `Nominal melebihi sisa tagihan (Rp ${remainingAmount.toLocaleString('id-ID')})` }, { status: 400 });
    }

    // If using tabungan, validate
    let tabungan: any = null;
    if (useTabungan || tipe === 'TABUNGAN') {
      const targetSantriId = santriId || tagihan.santriId;
      tabungan = await prisma.tabungan.findFirst({
        where: { santriId: targetSantriId },
        include: { santri: true },
      });
      if (!tabungan) {
        return NextResponse.json({ error: 'Santri tidak memiliki rekening tabungan' }, { status: 404 });
      }
      if (tabungan.saldo < nominal) {
        return NextResponse.json({ error: 'Saldo tabungan tidak mencukupi' }, { status: 400 });
      }
      if (tabungan.saldo - nominal < tabungan.minSaldo) {
        return NextResponse.json({ error: `Saldo akan di bawah minimum (Rp ${tabungan.minSaldo.toLocaleString('id-ID')})` }, { status: 400 });
      }
    }

    const currentUserId = userId || req.headers.get('x-user-id') || 'system';

    // Create payment and deduct from tabungan if needed (transactional)
    const result = await prisma.$transaction(async (tx) => {
      const pembayaran = await tx.pembayaran.create({
        data: {
          tagihanId: id,
          santriId: tagihan.santriId,
          user_id: currentUserId,
          nominal,
          tanggal: new Date(),
          tipe: useTabungan || tipe === 'TABUNGAN' ? 'TABUNGAN' : tipe,
          keterangan,
          buktiUrl,
          status: 'LUNAS',
        },
      });

      // If using tabungan, create auto-deduct transaksi
      if (useTabungan || tipe === 'TABUNGAN') {
        await tx.tabungan.update({
          where: { id: tabungan.id },
          data: { saldo: { decrement: nominal } },
        });

        await tx.tabunganTransaksi.create({
          data: {
            tabunganId: tabungan.id,
            santriId: tabungan.santriId,
            nominal,
            tipe: 'AUTO_DEDUCT_TAGIHAN',
            kategori: 'TAGIHAN',
            channel: 'TABUNGAN',
            keterangan: `Pembayaran tagihan: ${tagihan.template?.name || 'Tagihan'} (${keterangan || ''})`,
            status: 'LUNAS',
            referenceId: id,
            userId: currentUserId,
          },
        });

        // Create low balance notification
        const updatedTabungan = await tx.tabungan.findUnique({ where: { id: tabungan.id } });
        if (updatedTabungan && updatedTabungan.saldo <= updatedTabungan.minSaldo * 1.2) {
          const isBelowMin = updatedTabungan.saldo <= updatedTabungan.minSaldo;
          await tx.notification.create({
            data: {
              userId: currentUserId,
              type: 'LOW_BALANCE',
              title: isBelowMin ? 'Saldo Di Bawah Minimum!' : 'Saldo Mendekati Minimum',
              message: isBelowMin
                ? `Saldo rekening tabungan telah di bawah batas minimum. Saldo saat ini: Rp ${updatedTabungan.saldo.toLocaleString('id-ID')}, Minimum: Rp ${updatedTabungan.minSaldo.toLocaleString('id-ID')}`
                : `Saldo rekening tabungan mendekati batas minimum. Saldo saat ini: Rp ${updatedTabungan.saldo.toLocaleString('id-ID')}, Minimum: Rp ${updatedTabungan.minSaldo.toLocaleString('id-ID')}`,
              referenceId: tabungan.id,
              referenceType: 'Tabungan',
            },
          });
        }
      }

      return pembayaran;
    });

    // Update tagihan status based on total paid
    const newTotalPaid = totalPaid + nominal;
    let newStatus = tagihan.status;
    if (newTotalPaid >= tagihan.totalNilai) {
      newStatus = 'PAID';
    } else if (newTotalPaid > 0) {
      newStatus = 'PARTIAL';
    }

    if (newStatus !== tagihan.status) {
      await prisma.tagihan.update({
        where: { id },
        data: { status: newStatus },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Pembayaran',
        entityId: result.id,
        action: 'CREATE',
        userId: currentUserId,
        newData: JSON.stringify({ ...result, tagihanStatus: newStatus }),
      }
    });

    return NextResponse.json({ ...result, tagihanStatus: newStatus }, { status: 201 });
  } catch (error) {
    console.error('POST tagihan payment error:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

// PUT - Update tagihan (status, etc.)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTagihan(role) || !['SUPERADMIN', 'MANAGER KPAK'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, templateId } = body;

    const existing = await prisma.tagihan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tagihan not found' }, { status: 404 });
    }

    // Only allow certain fields to be updated
    const updateData: any = {};
    if (status && ['UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'].includes(status)) {
      updateData.status = status;
    }
    if (templateId) {
      const template = await prisma.tagihanTemplate.findUnique({ where: { id: templateId } });
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      updateData.templateId = templateId;
    }

    const tagihan = await prisma.tagihan.update({
      where: { id },
      data: updateData,
      include: {
        santri: true,
        template: true,
        tagihanItem: true,
        pembayaran: true,
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Tagihan',
        entityId: tagihan.id,
        action: 'UPDATE',
        userId: req.headers.get('x-user-id') || 'system',
        oldData: JSON.stringify(existing),
        newData: JSON.stringify(tagihan),
      }
    });

    return NextResponse.json(tagihan);
  } catch (error) {
    console.error('PUT tagihan error:', error);
    return NextResponse.json({ error: 'Failed to update tagihan' }, { status: 500 });
  }
}

// DELETE - Soft delete (cancel) tagihan
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTagihan(role) || !['SUPERADMIN', 'MANAGER KPAK'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.tagihan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tagihan not found' }, { status: 404 });
    }

    // Soft delete by setting status to CANCELLED
    const tagihan = await prisma.tagihan.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Tagihan',
        entityId: tagihan.id,
        action: 'DELETE',
        userId: req.headers.get('x-user-id') || 'system',
        oldData: JSON.stringify(existing),
        newData: JSON.stringify(tagihan),
      }
    });

    return NextResponse.json({ message: 'Tagihan cancelled' });
  } catch (error) {
    console.error('DELETE tagihan error:', error);
    return NextResponse.json({ error: 'Failed to cancel tagihan' }, { status: 500 });
  }
}
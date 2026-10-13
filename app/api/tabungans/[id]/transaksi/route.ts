import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const allowedRoles = ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU'];

function getRoleFromRequest(req: NextRequest): string {
  return req.headers.get('x-user-role') || 'SUPERADMIN';
}

function canAccessTabungan(role: string): boolean {
  return allowedRoles.includes(role);
}

function canCreateTransaksi(role: string): boolean {
  return ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU'].includes(role);
}

// Helper: create low balance notification
async function checkAndCreateLowBalanceNotification(tabunganId: string, newSaldo: number, minSaldo: number, userId: string) {
  if (newSaldo <= minSaldo * 1.2 && newSaldo > minSaldo) {
    // Saldo mendekati minimum (within 20% of minSaldo)
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'LOW_BALANCE',
        referenceId: tabunganId,
        isRead: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // last 24 hours
      },
    });
    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'LOW_BALANCE',
          title: 'Saldo Mendekati Minimum',
          message: `Saldo rekening tabungan mendekati batas minimum. Saldo saat ini: Rp ${newSaldo.toLocaleString('id-ID')}, Minimum: Rp ${minSaldo.toLocaleString('id-ID')}`,
          referenceId: tabunganId,
          referenceType: 'Tabungan',
        },
      });
    }
  } else if (newSaldo <= minSaldo) {
    // Saldo di bawah atau sama dengan minimum
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'LOW_BALANCE',
        referenceId: tabunganId,
        isRead: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'LOW_BALANCE',
          title: 'Saldo Di Bawah Minimum!',
          message: `Saldo rekening tabungan telah di bawah batas minimum. Saldo saat ini: Rp ${newSaldo.toLocaleString('id-ID')}, Minimum: Rp ${minSaldo.toLocaleString('id-ID')}`,
          referenceId: tabunganId,
          referenceType: 'Tabungan',
        },
      });
    }
  }
}

// GET - List transaksi for a tabungan
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTabungan(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const tipe = searchParams.get('tipe');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Verify tabungan exists
    const tabungan = await prisma.tabungan.findFirst({ where: { id, isDeleted: false } });
    if (!tabungan) {
      return NextResponse.json({ error: 'Tabungan not found' }, { status: 404 });
    }

    const where: any = { tabunganId: id };
    if (tipe) where.tipe = tipe;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const [transaksis, total] = await Promise.all([
      prisma.tabunganTransaksi.findMany({
        where,
        include: {
          tabungan: { select: { id: true, accountNumber: true, santri: { select: { id: true, studentNumber: true, name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tabunganTransaksi.count({ where }),
    ]);

    return NextResponse.json({
      data: transaksis,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET tabungan transaksi error:', error);
    return NextResponse.json({ error: 'Failed to fetch transaksi' }, { status: 500 });
  }
}

// POST - Create new transaksi (setor/tarik/mutasi)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getRoleFromRequest(req);
    if (!canCreateTransaksi(role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { nominal, tipe, kategori, channel, keterangan, buktiUrl, referenceId, userId } = body;

    // Validate required fields
    if (!nominal || nominal <= 0) {
      return NextResponse.json({ error: 'Nominal harus lebih dari 0' }, { status: 400 });
    }
    if (!tipe || !['SETOR_TUNAI', 'SETOR_BANK', 'TARIK_TUNAI', 'MUTASI_MASUK', 'MUTASI_KELUAR', 'AUTO_DEDUCT_TAGIHAN'].includes(tipe)) {
      return NextResponse.json({ error: 'Tipe transaksi tidak valid' }, { status: 400 });
    }
    if (!kategori || !['TABUNGAN', 'HER', 'DAFTAR_ULANG', 'PSB', 'INTERNAL'].includes(kategori)) {
      return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 });
    }
    if (!channel || !['CASH', 'BANK'].includes(channel)) {
      return NextResponse.json({ error: 'Channel harus CASH atau BANK' }, { status: 400 });
    }

    // Validation rules
    if (tipe === 'TARIK_TUNAI' && channel !== 'CASH') {
      return NextResponse.json({ error: 'Penarikan tunai harus channel CASH' }, { status: 400 });
    }
    if (tipe.startsWith('SETOR') && channel !== 'CASH' && channel !== 'BANK') {
      return NextResponse.json({ error: 'Setoran channel harus CASH atau BANK' }, { status: 400 });
    }

    // Verify tabungan exists
    const tabungan = await prisma.tabungan.findFirst({ where: { id, isDeleted: false } });
    if (!tabungan) {
      return NextResponse.json({ error: 'Tabungan not found' }, { status: 404 });
    }

    // Calculate new saldo
    let newSaldo = tabungan.saldo;
    const isIncoming = ['SETOR_TUNAI', 'SETOR_BANK', 'MUTASI_MASUK'].includes(tipe);
    const isOutgoing = ['TARIK_TUNAI', 'MUTASI_KELUAR', 'AUTO_DEDUCT_TAGIHAN'].includes(tipe);

    if (isIncoming) newSaldo += nominal;
    if (isOutgoing) newSaldo -= nominal;

    // Check sufficient balance for outgoing
    if (isOutgoing && newSaldo < 0) {
      return NextResponse.json({ error: 'Saldo tidak mencukupi' }, { status: 400 });
    }

    // Check min saldo
    if (newSaldo < tabungan.minSaldo && isOutgoing) {
      return NextResponse.json({ error: `Saldo tidak boleh di bawah minimum (Rp ${tabungan.minSaldo.toLocaleString('id-ID')})` }, { status: 400 });
    }

    // Create transaksi and update saldo in transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaksi = await tx.tabunganTransaksi.create({
        data: {
          tabunganId: id,
          santriId: tabungan.santriId,
          nominal,
          tipe,
          kategori,
          channel,
          keterangan,
          buktiUrl,
          referenceId,
          userId: userId || req.headers.get('x-user-id') || 'system',
          status: 'LUNAS',
        },
        include: {
          tabungan: { select: { id: true, accountNumber: true, santri: { select: { id: true, studentNumber: true, name: true } } } }
        }
      });

      await tx.tabungan.update({
        where: { id },
        data: { saldo: newSaldo },
      });

      return transaksi;
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'TabunganTransaksi',
        entityId: result.id,
        action: 'CREATE',
        userId: req.headers.get('x-user-id') || 'system',
        newData: JSON.stringify({ ...result, saldoBaru: newSaldo }),
      }
    });

    // Create low balance notification if needed
    const currentUserId = req.headers.get('x-user-id') || 'system';
    await checkAndCreateLowBalanceNotification(id, newSaldo, tabungan.minSaldo, currentUserId);

    return NextResponse.json({ ...result, saldoBaru: newSaldo }, { status: 201 });
  } catch (error) {
    console.error('POST tabungan transaksi error:', error);
    return NextResponse.json({ error: 'Failed to create transaksi' }, { status: 500 });
  }
}
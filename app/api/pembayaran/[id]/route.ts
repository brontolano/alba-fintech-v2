import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PaymentBody {
  tagihanId?: string;
  santriId?: string;
  userId?: string;
  nominal?: number;
  tanggal?: Date;
  buktiUrl?: string;
  tipe?: string;
  keterangan?: string;
  status?: string;
}

function updateTagihanStatus(tagihanId: string) {
  return prisma.tagihan.findUnique({ where: { id: tagihanId } }).then((tagihan) => {
    if (!tagihan) return;
    return prisma.tagihanItem.aggregate({
      where: { tagihanId },
      _sum: { nominal: true },
    }).then((agg) => {
      const paid = agg._sum.nominal || 0;
      const status = paid >= tagihan.totalNilai ? 'LUNAS' : 'UNPAID';
      return prisma.tagihan.update({
        where: { id: tagihanId },
        data: { status },
      });
    });
  });
}

/**
 * GET /api/pembayaran/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payment = await prisma.pembayaran.findUnique({
      where: { id: params.id },
      include: { tagihan: true },
    });
    if (!payment) {
      return NextResponse.json({ error: 'Pembayaran tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(payment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch pembayaran' }, { status: 500 });
  }
}

/**
 * PUT /api/pembayaran/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: PaymentBody = await request.json();

    // Ensure the payment exists
    const existing = await prisma.pembayaran.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Pembayaran tidak ditemukan' }, { status: 404 });
    }

    const payload: any = {};
    if (body.tagihanId) payload.tagihanId = body.tagihanId;
    if (body.santriId) payload.santriId = body.santriId;
    if (body.userId !== undefined) payload.userId = body.userId;
    if (body.nominal !== undefined) payload.nominal = body.nominal;
    if (body.tanggal !== undefined) payload.tanggal = body.tanggal;
    if (body.buktiUrl !== undefined) payload.buktiUrl = body.buktiUrl;
    if (body.tipe !== undefined) payload.tipe = body.tipe;
    if (body.status !== undefined) payload.status = body.status;

    const updated = await prisma.pembayaran.update({
      where: { id: params.id },
      data: payload,
    });

    // Re-rank tagihan status after update
    if (updated.tagihanId) {
      await updateTagihanStatus(updated.tagihanId);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal mengupdate pembayaran' }, { status: 500 });
  }
}

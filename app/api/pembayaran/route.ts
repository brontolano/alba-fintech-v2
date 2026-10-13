import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PaymentBody {
  tagihanId: string;
  santriId: string;
  userId?: string;
  nominal: number;
  tanggal: Date;
  buktiUrl?: string;
  tipe?: string;
  keterangan?: string;
}

function updateTagihanStatus(tagihanId: string) {
  return prisma.tagihan.findUnique({ where: { id: tagihanId } }).then((tagihan) => {
    if (!tagihan) return;
    return prisma.pembayaran.aggregate({
      where: { tagihanId },
      _sum: { nominal: true },
    }).then((agg) => {
      const paid = agg._sum.nominal || 0;
      const status = paid >= tagihan.totalNilai ? 'LUNAS' : 'UNPAID';
      return prisma.tagihan.update({ where: { id: tagihanId }, data: { status } });
    });
  });
}

/**
 * GET /api/pembayaran
 */
export async function GET() {
  try {
    const payments = await prisma.pembayaran.findMany({
      orderBy: { createdAt: 'desc' },
      include: { tagihan: true },
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch pembayaran' }, { status: 500 });
  }
}

/**
 * POST /api/pembayaran
 */
export async function POST(req: NextRequest) {
  try {
    const body: PaymentBody = await req.json();

    // Basic validation
    if (!body.tagihanId || !body.santriId || body.nominal <= 0) {
      return NextResponse.json({ error: 'tagihanId, santriId, nominal harus diisi' }, { status: 400 });
    }

    // Ensure tagihan belongs to the santri
    const tagihan = await prisma.tagihan.findUnique({
      where: { id: body.tagihanId },
    });
    if (!tagihan) {
      return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 });
    }
    if (tagihan.santriId !== body.santriId) {
      return NextResponse.json({ error: 'Santri tidak sesuai tagihan' }, { status: 400 });
    }

    const payload = {
      tagihanId: body.tagihanId,
      santriId: body.santriId,
      user_id: body.userId,
      nominal: body.nominal,
      tanggal: new Date(body.tanggal),
      buktiUrl: body.buktiUrl,
      tipe: body.tipe,
      keterangan: body.keterangan,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const payment = await prisma.pembayaran.create({ data: payload });

    // Update tagihan status based on total payments
    await updateTagihanStatus(body.tagihanId);

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal menambah pembayaran', details: error.message }, { status: 500 });
  }
}

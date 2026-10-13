import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    // Pembayaran hari ini
    const pembayaran = await prisma.pembayaran.findMany({
      where: {
        tanggal: { gte: startOfDay, lte: endOfDay },
        status: 'LUNAS',
      },
      include: { tagihan: { include: { santri: true } } },
    });

    const totalPembayaran = pembayaran.reduce((sum, p) => sum + p.nominal, 0);
    const byTipe = pembayaran.reduce((acc, p) => {
      acc[p.tipe || 'LAIN'] = (acc[p.tipe || 'LAIN'] || 0) + p.nominal;
      return acc;
    }, {} as Record<string, number>);

    // Tagihan baru hari ini
    const tagihanBaru = await prisma.tagihan.count({
      where: { tanggal: { gte: startOfDay, lte: endOfDay } },
    });

    // Outstanding tagihan
    const outstanding = await prisma.tagihan.findMany({
      where: { status: { in: ['UNPAID', 'PARTIAL'] } },
      include: { santri: true, pembayaran: true },
    });

    const totalOutstanding = outstanding.reduce((sum, t) => {
      const paid = t.pembayaran.filter(p => p.status === 'LUNAS').reduce((s, p) => s + p.nominal, 0);
      return sum + (t.totalNilai - paid);
    }, 0);

    return NextResponse.json({
      date,
      pembayaran: {
        total: totalPembayaran,
        byTipe,
        count: pembayaran.length,
        details: pembayaran,
      },
      tagihanBaru,
      outstanding: {
        total: totalOutstanding,
        count: outstanding.length,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch daily report' }, { status: 500 });
  }
}

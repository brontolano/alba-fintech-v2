import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const pembayaran = await prisma.pembayaran.findMany({
      where: { tanggal: { gte: startOfMonth, lte: endOfMonth }, status: 'LUNAS' },
      include: { tagihan: { include: { santri: true, template: true } } },
    });

    const totalPembayaran = pembayaran.reduce((sum, p) => sum + p.nominal, 0);
    const byTipe = pembayaran.reduce((acc, p) => {
      acc[p.tipe || 'LAIN'] = (acc[p.tipe || 'LAIN'] || 0) + p.nominal;
      return acc;
    }, {} as Record<string, number>);

    const byKategori = pembayaran.reduce((acc, p) => {
      const kategori = p.tagihan?.template?.type || 'LAIN';
      acc[kategori] = (acc[kategori] || 0) + p.nominal;
      return acc;
    }, {} as Record<string, number>);

    const tagihanBulan = await prisma.tagihan.findMany({
      where: { tanggal: { gte: startOfMonth, lte: endOfMonth } },
      include: { pembayaran: true, santri: true },
    });

    return NextResponse.json({
      period: { year, month },
      pembayaran: { total: totalPembayaran, byTipe, byKategori, count: pembayaran.length },
      tagihan: {
        total: tagihanBulan.length,
        lunas: tagihanBulan.filter(t => t.status === 'LUNAS').length,
        unpaid: tagihanBulan.filter(t => t.status === 'UNPAID').length,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch monthly report' }, { status: 500 });
  }
}

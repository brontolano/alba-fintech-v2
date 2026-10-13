import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = { status: 'LUNAS' };
    if (startDate && endDate) {
      where.tanggal = {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    const pembayaran = await prisma.pembayaran.findMany({
      where,
      include: { tagihan: { include: { santri: true } } },
      orderBy: { tanggal: 'asc' },
    });

    const incoming = pembayaran.filter(p => p.tipe !== 'KELUAR').reduce((s, p) => s + p.nominal, 0);
    const outgoing = pembayaran.filter(p => p.tipe === 'KELUAR').reduce((s, p) => s + p.nominal, 0);

    const dailyFlow = pembayaran.reduce((acc, p) => {
      const day = p.tanggal.toISOString().split('T')[0];
      if (!acc[day]) acc[day] = { incoming: 0, outgoing: 0, net: 0 };
      if (p.tipe === 'KELUAR') {
        acc[day].outgoing += p.nominal;
      } else {
        acc[day].incoming += p.nominal;
      }
      acc[day].net = acc[day].incoming - acc[day].outgoing;
      return acc;
    }, {} as Record<string, { incoming: number; outgoing: number; net: number }>);

    return NextResponse.json({
      period: { startDate, endDate },
      totalIncoming: incoming,
      totalOutgoing: outgoing,
      net: incoming - outgoing,
      dailyFlow,
      transactions: pembayaran,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch cashflow report' }, { status: 500 });
  }
}

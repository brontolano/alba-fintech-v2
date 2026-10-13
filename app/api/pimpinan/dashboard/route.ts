import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get('unitId');

    const whereUnit = unitId ? { unitId } : {};

    // Statistik real-time
    const [totalSantri, totalTagihan, totalPembayaranBulanIni, pendingApprovals, cashflowBulanIni] = await Promise.all([
      prisma.santri.count({ where: { isActive: true, ...whereUnit } }),
      prisma.tagihan.count({ where: { ...whereUnit } }),
      (async () => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);
        
        return prisma.pembayaran.aggregate({
          where: {
            status: 'LUNAS',
            tanggal: { gte: startOfMonth, lte: endOfMonth },
            ...whereUnit,
          },
          _sum: { nominal: true },
        });
      })(),
      prisma.approval.count({ where: { status: 'PENDING', ...whereUnit } }),
      (async () => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);

        const pembayaran = await prisma.pembayaran.findMany({
          where: {
            status: 'LUNAS',
            tanggal: { gte: startOfMonth, lte: endOfMonth },
            ...whereUnit,
          },
        });

        const incoming = pembayaran.filter(p => p.tipe !== 'KELUAR').reduce((s, p) => s + p.nominal, 0);
        const outgoing = pembayaran.filter(p => p.tipe === 'KELUAR').reduce((s, p) => s + p.nominal, 0);
        return { incoming, outgoing, net: incoming - outgoing };
      })(),
    ]);

    // Outstanding tagihan
    const outstandingTagihan = await prisma.tagihan.findMany({
      where: { status: { in: ['UNPAID', 'PARTIAL'] }, ...whereUnit },
      include: { santri: true, pembayaran: true },
    });

    const totalOutstanding = outstandingTagihan.reduce((sum, t) => {
      const paid = t.pembayaran.filter(p => p.status === 'LUNAS').reduce((s, p) => s + p.nominal, 0);
      return sum + (t.totalNilai - paid);
    }, 0);

    // Cashflow harian 7 hari terakhir
    const dailyCashflow = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const pembayaranHari = await prisma.pembayaran.findMany({
        where: {
          status: 'LUNAS',
          tanggal: { gte: startOfDay, lte: endOfDay },
          ...whereUnit,
        },
      });

      const incoming = pembayaranHari.filter(p => p.tipe !== 'KELUAR').reduce((s, p) => s + p.nominal, 0);
      const outgoing = pembayaranHari.filter(p => p.tipe === 'KELUAR').reduce((s, p) => s + p.nominal, 0);

      dailyCashflow.push({
        date: date.toISOString().split('T')[0],
        incoming,
        outgoing,
        net: incoming - outgoing,
      });
    }

    // Top santri dengan outstanding terbesar
    const topOutstanding = outstandingTagihan
      .map(t => {
        const paid = t.pembayaran.filter(p => p.status === 'LUNAS').reduce((s, p) => s + p.nominal, 0);
        return {
          santri: t.santri?.name || 'Unknown',
          santriId: t.santriId,
          outstanding: t.totalNilai - paid,
          tagihanId: t.id,
        };
      })
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);

    return NextResponse.json({
      stats: {
        totalSantri,
        totalTagihan,
        totalPembayaranBulanIni: totalPembayaranBulanIni._sum.nominal || 0,
        pendingApprovals,
        cashflowBulanIni,
        totalOutstanding,
      },
      dailyCashflow,
      topOutstanding,
      outstandingCount: outstandingTagihan.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}

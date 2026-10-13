import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || startDate;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get cashflow per unit
    const units = await prisma.unit.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const unitCashflow = await Promise.all(units.map(async (unit) => {
      // Get all payments for this unit in the date range
      const payments = await prisma.pembayaran.findMany({
        where: {
          tagihan: { unitId: unit.id },
          tanggal: { gte: start, lte: end },
        },
        include: { tagihan: true },
      });

      const incoming = payments
        .filter(p => p.tipe !== 'KELUAR' && p.status === 'LUNAS')
        .reduce((sum, p) => sum + p.nominal, 0);
      const outgoing = payments
        .filter(p => p.tipe === 'KELUAR' && p.status === 'LUNAS')
        .reduce((sum, p) => sum + p.nominal, 0);
      const total = payments.reduce((sum, p) => sum + p.nominal, 0);

      // Daily breakdown
      const daily: any[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayPayments = payments.filter(p => p.tanggal.toISOString().split('T')[0] === dateStr);
        const dayIncoming = dayPayments
          .filter(p => p.tipe !== 'KELUAR' && p.status === 'LUNAS')
          .reduce((sum, p) => sum + p.nominal, 0);
        const dayOutgoing = dayPayments
          .filter(p => p.tipe === 'KELUAR' && p.status === 'LUNAS')
          .reduce((sum, p) => sum + p.nominal, 0);
        daily.push({
          date: dateStr,
          incoming: dayIncoming,
          outgoing: dayOutgoing,
          net: dayIncoming - dayOutgoing,
          count: dayPayments.length,
        });
      }

      return {
        unitId: unit.id,
        unitName: unit.name,
        incoming,
        outgoing,
        total,
        net: incoming - outgoing,
        daily,
      };
    }));

    // Global totals
    const globalIncoming = unitCashflow.reduce((s, u) => s + u.incoming, 0);
    const globalOutgoing = unitCashflow.reduce((s, u) => s + u.outgoing, 0);
    const globalNet = globalIncoming - globalOutgoing;

    return NextResponse.json({
      startDate,
      endDate,
      units: unitCashflow,
      global: { incoming: globalIncoming, outgoing: globalOutgoing, net: globalNet },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
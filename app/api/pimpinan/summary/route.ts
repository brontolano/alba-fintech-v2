import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get('unitId');

    const whereUnit = unitId ? { unitId } : {};

    // Ringkasan per unit
    const units = await prisma.unit.findMany({
      where: { isActive: true },
      include: {
        santris: { where: { isActive: true } },
        tagihan: { include: { pembayaran: true } },
      },
    });

    const unitSummaries = units.map(unit => {
      const totalTagihan = unit.tagihan.length;
      const totalNilai = unit.tagihan.reduce((s, t) => s + t.totalNilai, 0);
      const totalPaid = unit.tagihan
        .flatMap(t => t.pembayaran.filter(p => p.status === 'LUNAS'))
        .reduce((s, p) => s + p.nominal, 0);
      const pendingApprovals = unit.tagihan.filter(t => t.status === 'PENDING_APPROVAL').length;

      return {
        unitId: unit.id,
        unitName: unit.name,
        totalSantri: unit.santris.length,
        totalTagihan,
        totalNilai,
        totalPaid,
        outstanding: totalNilai - totalPaid,
        pendingApprovals,
      };
    });

    // Global totals
    const globalTotalSantri = unitSummaries.reduce((s, u) => s + u.totalSantri, 0);
    const globalTotalTagihan = unitSummaries.reduce((s, u) => s + u.totalTagihan, 0);
    const globalTotalNilai = unitSummaries.reduce((s, u) => s + u.totalNilai, 0);
    const globalTotalPaid = unitSummaries.reduce((s, u) => s + u.totalPaid, 0);
    const globalOutstanding = globalTotalNilai - globalTotalPaid;

    return NextResponse.json({
      global: {
        totalSantri: globalTotalSantri,
        totalTagihan: globalTotalTagihan,
        totalNilai: globalTotalNilai,
        totalPaid: globalTotalPaid,
        outstanding: globalOutstanding,
      },
      units: unitSummaries,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}

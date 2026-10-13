import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get('unitId');
    const status = searchParams.get('status') || 'UNPAID';

    const whereUnit = unitId ? { unitId } : {};

    // Get all outstanding tagihan per unit
    const tagihan = await prisma.tagihan.findMany({
      where: {
        ...whereUnit,
        status: { in: ['UNPAID', 'PARTIAL'] },
      },
      include: {
        santri: true,
        pembayaran: true,
        unit: true,
      },
    });

    // Group by unit
    const unitOutstanding: Record<string, any> = {};
    for (const t of tagihan) {
      const paid = t.pembayaran.filter(p => p.status === 'LUNAS').reduce((s, p) => s + p.nominal, 0);
      const outstanding = t.totalNilai - paid;

      if (!unitOutstanding[t.unitId]) {
        unitOutstanding[t.unitId] = {
          unitId: t.unitId,
          unitName: t.unit?.name || 'Unknown',
          totalTagihan: 0,
          totalOutstanding: 0,
          pendingCount: 0,
          items: [],
        };
      }

      unitOutstanding[t.unitId].totalTagihan++;
      unitOutstanding[t.unitId].totalOutstanding += outstanding;
      unitOutstanding[t.unitId].pendingCount++;

      if (outstanding > 0) {
        unitOutstanding[t.unitId].items.push({
          santriId: t.santriId,
          santriName: t.santri?.name || 'Unknown',
          tagihanId: t.id,
          tagihanName: t.templateId?.slice(0, 8) + '...' || 'Unknown',
          total: t.totalNilai,
          paid,
          outstanding,
        });
      }
    }

    // Sort by outstanding descending
    const sorted = Object.values(unitOutstanding)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    // Global totals
    const global = {
      totalTagihan: sorted.reduce((s, u) => s + u.totalTagihan, 0),
      totalOutstanding: sorted.reduce((s, u) => s + u.totalOutstanding, 0),
      pendingCount: sorted.reduce((s, u) => s + u.pendingCount, 0),
    };

    return NextResponse.json({
      data: sorted,
      global,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
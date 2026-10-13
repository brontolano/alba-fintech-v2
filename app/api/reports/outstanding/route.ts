import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get('unitId');

    const tagihans = await prisma.tagihan.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIAL'] },
        ...(unitId ? { unitId } : {}),
      },
      include: {
        santri: true,
        unit: true,
        pembayaran: true,
        template: true,
      },
      orderBy: { tanggal: 'asc' },
    });

    const outstanding = tagihans.map(t => {
      const paid = t.pembayaran.filter(p => p.status === 'LUNAS').reduce((s, p) => s + p.nominal, 0);
      return {
        tagihan: t,
        nominal: t.totalNilai,
        paid,
        outstanding: t.totalNilai - paid,
        status: t.status,
      };
    });

    const totalOutstanding = outstanding.reduce((sum, o) => sum + o.outstanding, 0);

    return NextResponse.json({
      totalOutstanding,
      count: outstanding.length,
      details: outstanding,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch outstanding report' }, { status: 500 });
  }
}

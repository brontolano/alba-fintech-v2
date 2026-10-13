import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    const pembayaran = await prisma.pembayaran.findMany({
      where: {
        tanggal: { gte: startOfDay, lte: endOfDay },
        tipe: 'KELUAR',
        status: 'LUNAS',
      },
      include: { tagihan: { include: { santri: true } } },
    });

    const total = pembayaran.reduce((sum, p) => sum + p.nominal, 0);
    const byKeterangan = pembayaran.reduce((acc, p) => {
      const key = p.keterangan || 'Lainnya';
      acc[key] = (acc[key] || 0) + p.nominal;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({ date, total, count: pembayaran.length, byKeterangan, details: pembayaran });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dana keluar report' }, { status: 500 });
  }
}

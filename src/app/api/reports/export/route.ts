// src/app/api/reports/export/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'PIMPINAN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'csv';

  // Fetch all transactions (PIMPINAN view — all units)
  const transactions = await prisma.transaction.findMany({
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      status: true,
      reference: true,
      createdAt: true,
      unit: { select: { name: true, code: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  if (format === 'json') {
    return NextResponse.json({ data: transactions });
  }

  // CSV export
  const headers = ['ID', 'Tanggal', 'Unit', 'Tipe', 'Jumlah', 'Deskripsi', 'Status', 'Referensi', 'Pembuat'];
  const rows = transactions.map((tx) => [
    tx.id,
    new Date(tx.createdAt).toISOString().split('T')[0],
    `"${tx.unit?.name || ''}"`,
    tx.type,
    tx.amount,
    `"${(tx.description || '').replace(/"/g, '""')}"`,
    tx.status,
    `"${tx.reference || ''}"`,
    `"${tx.createdBy?.name || tx.createdBy?.email || ''}"`,
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="laporan-transaksi-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

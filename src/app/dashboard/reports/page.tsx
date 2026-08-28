import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { BarChart3, TrendingUp, Wallet } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const CACHE_TTL = 300; // 5 minutes

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'PIMPINAN') redirect('/login');

  // Cache report query for 5 minutes — reduces DB load for frequent pimpinan checks
  const cacheKey = 'reports:transaction-summary';
  let summary: any[] | null = null;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      summary = JSON.parse(cached);
    } else {
      summary = await prisma.transaction.groupBy({
        by: ['status'],
        _count: { _all: true },
      });
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(summary));
    }
  } catch (cacheError) {
    console.warn('[Redis Cache] Fallback to direct query:', cacheError);
    summary = await prisma.transaction.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Laporan Keuangan</h2>
      <p className="text-slate-500 text-sm">Ikhtisar transaksi berdasarkan status.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary?.map((s) => (
          <Card key={s.status}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4" /> {s.status}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-700">{s._count._all}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Data lengkap belum tersedia</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Export dan visualisasi lanjutan akan ditambahkan di iterasi berikutnya.</p>
        </CardContent>
      </Card>
    </div>
  );
}

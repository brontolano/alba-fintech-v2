import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { BarChart3, TrendingUp, Wallet, DollarSign, Calendar, Download } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';
import { StatusBarChart, TrendLineChart } from '@/components/analytics/Charts';
import { Suspense } from 'react';

const CACHE_TTL = 300; // 5 minutes

// Lazy Redis init — only connects when env var exists and runtime is available
function getRedis() {
  if (!process.env.REDIS_URL) return null;
  try {
    return new Redis(process.env.REDIS_URL);
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'PIMPINAN') redirect('/login');

  // Cache report query for 5 minutes — reduces DB load for frequent pimpinan checks
  const cacheKey = 'reports:transaction-summary';
  const redis = getRedis();
  let summary: any[] | null = null;

  if (redis) {
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
    }
  }

  // Always ensure we have fresh data if cache miss or Redis unavailable
  try {
    if (!summary) {
      summary = await prisma.transaction.groupBy({
        by: ['status'],
        _count: { _all: true },
      });
    }
  } catch (dbError) {
    console.error('[Reports] DB groupBy failed:', dbError);
    summary = [];
  }

  // --- Revenue trend per day (last 30 days) ---
  // Fetch all transactions from last 30 days via Prisma, then aggregate client-side
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentTransactions = await prisma.$queryRaw<
    Array<{
      name: string;
      income: number;
      expense: number;
      net: number;
    }>
  >`
    SELECT 
      DATE_FORMAT(\`createdAt\`, '%Y-%m-%d') AS name,
      SUM(CASE WHEN \`type\` = 'INCOME' THEN \`amount\` ELSE 0 END) AS income,
      SUM(CASE WHEN \`type\` = 'EXPENSE' THEN \`amount\` ELSE 0 END) AS expense,
      SUM(CASE WHEN \`type\` = 'INCOME' THEN \`amount\` ELSE -\`amount\` END) AS net
    FROM \`Transaction\`
    WHERE \`createdAt\` >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY DATE_FORMAT(\`createdAt\`, '%Y-%m-%d')
    ORDER BY \`name\` ASC
    LIMIT 30
  `;

  const trendData = (recentTransactions || []).map((r) => {
    // Handle null/undefined date gracefully — avoid Invalid Date crash
    let dateLabel = 'Tak diketahui';
    if (r.name && !isNaN(Date.parse(r.name))) {
      const d = new Date(r.name);
      if (!isNaN(d.getTime())) {
        dateLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      }
    }
    return {
      name: dateLabel,
      income: Number(r.income) || 0,
      expense: Number(r.expense) || 0,
      net: Number(r.net) || 0,
    };
  });

  const totalIncome = trendData.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = trendData.reduce((sum, d) => sum + d.expense, 0);
  const netTotal = totalIncome - totalExpense;

  // Status summary as bar chart data
  const statusChartData = (summary || []).map((s) => ({
    name: s.status ? s.status.charAt(0) + s.status.slice(1).toLowerCase() : 'Tidak diketahui',
    count: s._count && s._count._all ? s._count._all : 0,
  }));

  const statCards: Array<{ title: string; value: number; icon: React.ReactNode; color: string }> = [
    { title: 'Total Pemasukan', value: totalIncome, icon: <DollarSign className="w-5 h-5" />, color: 'text-green-600' },
    { title: 'Total Pengeluaran', value: totalExpense, icon: <Wallet className="w-5 h-5" />, color: 'text-red-600' },
    { title: 'Net (Pemasukan - Pengeluaran)', value: netTotal, icon: <TrendingUp className="w-5 h-5" />, color: netTotal >= 0 ? 'text-blue-600' : 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Keuangan</h2>
          <p className="text-slate-500 text-sm">Ikhtisar transaksi berdasarkan status &amp; tren harian (30 hari terakhir).</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">{(new Date()).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {card.value >= 0 ? 'Rp ' : '-Rp '}{Math.abs(card.value).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className={`p-2 rounded-full bg-slate-50 ${card.color}`}>{card.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction count per status — Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4" /> Jumlah Transaksi per Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusChartData.length > 0 ? (
            <StatusBarChart data={statusChartData} dataKey="count" />
          ) : (
            <p className="text-sm text-slate-500">Belum ada data transaksi.</p>
          )}
        </CardContent>
      </Card>

      {/* Daily trend — Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4" /> Tren Keuangan 30 Hari Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <TrendLineChart data={trendData} />
          ) : (
            <p className="text-sm text-slate-500">Belum ada data transaksi.</p>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export Laporan
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a
            href="/api/reports/export?format=csv"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            <Download size={16} /> Unduh CSV
          </a>
          <a
            href="/api/reports/export?format=json"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            <Download size={16} /> Unduh JSON
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Users, Building2, Wallet, ScrollText, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';

export const dynamic = 'force-dynamic';

export default async function SuperadminDashboard() {
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'SUPERADMIN') redirect('/login');

  const [userCount, unitCount, txCount, recentLogs] = await Promise.all([
    prisma.user.count(),
    prisma.unit.count(),
    prisma.transaction.count(),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const userMap = new Map(
    (await prisma.user.findMany({ select: { id: true, name: true, email: true } })).map(
      (u) => [u.id, u] as const
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Command Center</h2>
        <p className="text-slate-500 text-sm mt-1">Kelola seluruh sistem ALBA Finance</p>
     </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total User" value={userCount} icon={Users} color="blue" />
        <StatCard label="Total Unit" value={unitCount} icon={Building2} color="emerald" />
        <StatCard label="Total Transaksi" value={txCount} icon={Wallet} color="violet" />
     </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText size={18} className="text-slate-500" />
              <CardTitle className="text-lg">Aktivitas Terbaru</CardTitle>
           </div>
            <a href="#" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium">
              Lihat semua <ArrowUpRight size={14} />
           </a>
         </div>
       </CardHeader>
        <CardContent className="p-0">
          {recentLogs.length === 0 ? (
            <p className="px-6 py-12 text-center text-slate-400 text-sm">Belum ada aktivitas</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentLogs.map((log) => {
                const user = log.userId ? userMap.get(log.userId) : null;
                const display = user?.name ?? user?.email ?? (log.userId ?? 'System');
                return (
                  <li key={log.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{display}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {log.action} <span className="text-slate-400">•</span> {log.entity}
                     </p>
                   </div>
                    <p className="text-xs text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                   </p>
                 </li>
                );
              })}
           </ul>
          )}
       </CardContent>
     </Card>
   </div>
  );
}
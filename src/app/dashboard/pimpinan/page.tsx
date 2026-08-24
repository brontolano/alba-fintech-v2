import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Wallet, CheckSquare, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';

export default async function PimpinanDashboard() {
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'PIMPINAN') redirect('/login');

  const [pendingApprovals, totalTransactions, totalApproved] = await Promise.all([
    prisma.transaction.count({ where: { status: 'PENDING' } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: 'APPROVED' } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Executive Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Pantau seluruh unit dari satu tempat</p>
     </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Menunggu Approval" value={pendingApprovals} icon={CheckSquare} color="amber" />
        <StatCard label="Total Transaksi" value={totalTransactions} icon={Wallet} color="blue" />
        <StatCard label="Disetujui" value={totalApproved} icon={TrendingUp} color="emerald" />
     </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selamat Datang, Pimpinan</CardTitle>
          <CardDescription>Akses persetujuan lintas unit</CardDescription>
       </CardHeader>
        <CardContent>
          <p className="text-slate-600 text-sm leading-relaxed">
            Anda memiliki akses untuk menyetujui transaksi besar lintas unit.
            Buka menu <strong className="text-slate-800">Approval</strong> di sidebar untuk melihat antrian transaksi yang menunggu persetujuan.
         </p>
          <a
            href="/dashboard/approvals"
            className="inline-flex items-center gap-1 mt-4 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Buka halaman Approval <ArrowRight size={14} />
         </a>
       </CardContent>
     </Card>
   </div>
  );
}

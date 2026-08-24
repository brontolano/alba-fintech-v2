import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Wallet, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';

export default async function StaffDashboard() {
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'STAFF') redirect('/login');

  const userId = session.user.id;

  const [myTx, myApproved, myPending] = await Promise.all([
    prisma.transaction.count({ where: { createdById: userId } }),
    prisma.transaction.count({ where: { createdById: userId, status: 'APPROVED' } }),
    prisma.transaction.count({ where: { createdById: userId, status: 'PENDING' } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Staff Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Catat transaksi Anda hari ini</p>
     </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Transaksi Saya" value={myTx} icon={Wallet} color="blue" />
        <StatCard label="Disetujui" value={myApproved} icon={CheckCircle2} color="emerald" />
        <StatCard label="Menunggu" value={myPending} icon={Clock} color="amber" />
     </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mulai Catat Transaksi</CardTitle>
          <CardDescription>Gunakan menu Transaksi di sidebar</CardDescription>
       </CardHeader>
        <CardContent>
          <p className="text-slate-600 text-sm leading-relaxed">
            Buka menu <strong className="text-slate-800">Transaksi</strong> di sidebar untuk input transaksi baru.
            Transaksi besar akan otomatis membutuhkan approval dari Manager atau Pimpinan.
         </p>
          <a
            href="/dashboard/transactions"
            className="inline-flex items-center gap-1 mt-4 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Buka halaman Transaksi <ArrowRight size={14} />
         </a>
       </CardContent>
     </Card>
   </div>
  );
}

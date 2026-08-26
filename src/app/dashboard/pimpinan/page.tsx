import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Wallet, CheckSquare, TrendingUp, ArrowRight, FileText, Package, BarChart3, Bot } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PimpinanDashboard() {
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'PIMPINAN') redirect('/login');

  const [pendingApprovals, totalTransactions, totalApproved] = await Promise.all([
    prisma.transaction.count({ where: { status: 'PENDING' } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: 'APPROVED' } }),
  ]);

  // Quick Menu: items NOT in mobile bottom nav (5 icons: Dashboard, Transaksi, POS, Approval, AI)
  const quickMenus = [
    { href: '/dashboard/pimpinan/transactions', label: 'Transaksi', icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { href: '/dashboard/pimpinan/ai-assistant', label: 'AI Assistant', icon: Bot, color: 'bg-purple-50 text-purple-600' },
  ];

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

      {/* Quick Menu Grid */}
      <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Menu Cepat</h3>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {quickMenus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow text-center group"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${menu.color}`}>
                <menu.icon size={20} />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-brand-600">{menu.label}</span>
            </Link>
          ))}
        </div>
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
          <Link
            href="/dashboard/approvals"
            className="inline-flex items-center gap-1 mt-4 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Buka halaman Approval <ArrowRight size={14} />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  Wallet, CheckCircle2, Clock, ArrowRight,
  FileText, Package, ShoppingCart, ClipboardList, Bot,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StaffDashboard() {
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'STAFF') redirect('/login');

  const userId = session.user.id;

  const [myTx, myApproved, myPending] = await Promise.all([
    prisma.transaction.count({ where: { createdById: userId } }),
    prisma.transaction.count({ where: { createdById: userId, status: 'APPROVED' } }),
    prisma.transaction.count({ where: { createdById: userId, status: 'PENDING' } }),
  ]);

  // Quick menu: items NOT in mobile bottom nav (5 icons: Dashboard, Transaksi, POS, Inventaris, AI)
  const quickMenus = [
    { href: '/dashboard/staff/transactions', label: 'Transaksi', icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { href: '/dashboard/staff/pos', label: 'POS', icon: ShoppingCart, color: 'bg-amber-50 text-amber-600' },
    { href: '/dashboard/staff/ai-assistant', label: 'AI Assistant', icon: Bot, color: 'bg-purple-50 text-purple-600' },
  ];

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
          <CardTitle className="text-lg">Mulai Catat Transaksi</CardTitle>
          <CardDescription>Gunakan menu Transaksi di sidebar</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 text-sm leading-relaxed">
            Buka menu <strong className="text-slate-800">Transaksi</strong> di sidebar untuk input transaksi baru.
            Transaksi besar akan otomatis membutuhkan approval dari Manager atau Pimpinan.
          </p>
          <Link
            href="/dashboard/transactions"
            className="inline-flex items-center gap-1 mt-4 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Buka halaman Transaksi <ArrowRight size={14} />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

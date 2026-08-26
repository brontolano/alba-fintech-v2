import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Wallet, Users, Package, AlertTriangle, FileText, ShoppingCart, BarChart3, Bot } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import Link from 'next/link';

export default async function ManagerDashboard() {
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'MANAGER') redirect('/login');

  const unitId = session.user.unitId;

  const [unitTxCount, unitStaffCount, pendingTx] = await Promise.all([
    unitId ? prisma.transaction.count({ where: { unitId } }) : 0,
    unitId ? prisma.user.count({ where: { unitId, role: 'STAFF' } }) : 0,
    unitId ? prisma.transaction.count({ where: { unitId, status: 'PENDING' } }) : 0,
  ]);

  // Quick Menu: items NOT in mobile bottom nav (5 icons: Dashboard, Transaksi, POS, Inventaris, AI)
  const quickMenus = [
    { href: '/dashboard/manager/transactions', label: 'Transaksi', icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { href: '/dashboard/manager/pos', label: 'POS', icon: ShoppingCart, color: 'bg-amber-50 text-amber-600' },
    { href: '/dashboard/manager/ai-assistant', label: 'AI Assistant', icon: Bot, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Manager Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Pantau operasional unit Anda</p>
      </div>

      {!unitId && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <CardTitle className="text-sm text-amber-900">Akun belum terikat ke unit</CardTitle>
              <CardDescription className="text-amber-800 mt-1">
                Hubungi Superadmin untuk assignment unit agar dapat mengakses transaksi staff.
              </CardDescription>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Transaksi Unit" value={unitTxCount} icon={Wallet} color="blue" />
        <StatCard label="Staff Aktif" value={unitStaffCount} icon={Users} color="emerald" />
        <StatCard label="Pending Approval" value={pendingTx} icon={Package} color="amber" />
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
    </div>
  );
}

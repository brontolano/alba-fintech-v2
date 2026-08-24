import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Wallet, Users, Package, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';

export default async function ManagerDashboard() {
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'MANAGER') redirect('/login');

  const unitId = session.user.unitId;

  const [unitTxCount, unitStaffCount, pendingTx] = await Promise.all([
    unitId ? prisma.transaction.count({ where: { unitId } }) : 0,
    unitId ? prisma.user.count({ where: { unitId, role: 'STAFF' } }) : 0,
    unitId ? prisma.transaction.count({ where: { unitId, status: 'PENDING' } }) : 0,
  ]);

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
   </div>
  );
}

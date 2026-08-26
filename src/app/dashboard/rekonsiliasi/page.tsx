import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Wallet, Building, PieChart, Download, Filter, Calendar } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui';
import { Suspense } from 'react';
import RekonsiliasiTable from '@/components/shared/RekonsiliasiTable';

export const dynamic = 'force-dynamic';

type Unit = { id: string; name: string; code: string };
type Account = { id: string; name: string; code: string; type: string };

function classForType(type: string) {
  const m: Record<string, string> = {
    INCOME: 'bg-green-50 text-green-700',
    EXPENSE: 'bg-red-50 text-red-700',
    ASSET: 'bg-blue-50 text-blue-700',
    LIABILITY: 'bg-orange-50 text-orange-700',
    EQUITY: 'bg-purple-50 text-purple-700',
  };
  return m[type] ?? 'bg-slate-100 text-slate-600';
}

export default async function RekonsiliasiPage({
  searchParams,
}: {
  searchParams?: Promise<{ unitId?: string; accountId?: string; from?: string; to?: string }>;
}) {
  const session = await getServerSession(authConfig);
  if (!session?.user) redirect('/login');

  const role = session.user.role as 'PIMPINAN' | 'MANAGER' | 'SUPERADMIN';
  if (!['PIMPINAN', 'MANAGER', 'SUPERADMIN'].includes(role)) redirect('/login');

  const sp = await searchParams;

  // Units for dropdown (Manager hanya lihat unit-nya)
  const units = role === 'MANAGER'
    ? (await prisma.unit.findMany({ where: { id: session.user.unitId! } }))
    : await prisma.unit.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });

  // Accounts for dropdown (Chart of Accounts aktif)
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  });

  // Build query string for API call (client-side fetch di RekonsiliasiTable)
  const qs = new URLSearchParams();
  if (sp?.unitId) qs.set('unitId', sp.unitId);
  if (sp?.accountId) qs.set('accountId', sp.accountId);
  if (sp?.from) qs.set('from', sp.from);
  if (sp?.to) qs.set('to', sp.to);
  qs.set('status', 'APPROVED');

  // Server-side summary untuk stat cards
  const [summaryRes, txCount] = await Promise.all([
    fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/reconciliation?${qs.toString()}`).then((r) => r.json()),
    prisma.transaction.count({
      where: { status: 'APPROVED', ...(sp?.unitId ? { unitId: sp.unitId } : {}) },
    }),
  ]);

  const summary = summaryRes?.data?.summary ?? { byAccount: [], byUnit: [] };
  const totalIncome = summary.byAccount
    .filter((a: any) => a.account?.type === 'INCOME')
    .reduce((s: number, a: any) => s + a.totalAmount, 0);
  const totalExpense = summary.byAccount
    .filter((a: any) => a.account?.type === 'EXPENSE')
    .reduce((s: number, a: any) => s + a.totalAmount, 0);
  const netPosition = totalIncome - totalExpense;

  // Helper untuk export CSV
  const exportParams = encodeURIComponent(qs.toString());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rekonsiliasi / Buku Besar</h1>
          <p className="text-slate-500 text-sm mt-1">
            {role === 'MANAGER' ? 'Unit Anda' : 'Seluruh yayasan'}
          </p>
        </div>
        <a
          href={`/api/reconciliation/export?${exportParams}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition text-sm font-medium"
        >
          <Download size={16} />
          Export CSV
        </a>
      </div>

      {/* Filter Form */}
      <form className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-slate-500 mb-1">Unit</label>
          <select
            name="unitId"
            defaultValue={sp?.unitId ?? ''}
            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
            disabled={role === 'MANAGER'}
          >
            <option value="">Semua Unit</option>
            {(units as Unit[]).map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} — {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-slate-500 mb-1">Akun</label>
          <select name="accountId" defaultValue={sp?.accountId ?? ''} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
            <option value="">Semua Akun</option>
            {(accounts as Account[]).map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-slate-500 mb-1">Tanggal Mulai</label>
          <input
            type="date"
            name="from"
            defaultValue={sp?.from ?? ''}
            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
          />
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-slate-500 mb-1">Tanggal Akhir</label>
          <input
            type="date"
            name="to"
            defaultValue={sp?.to ?? ''}
            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
        >
          <Filter size={14} className="inline mr-1" />
          Filter
        </button>
      </form>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Transaksi Disetujui" value={txCount} icon={Wallet} color="blue" />
        <StatCard
          label="Total Pemasukan"
          value={`Rp ${totalIncome.toLocaleString('id-ID')}`}
          icon={PieChart}
          color="emerald"
        />
        <StatCard
          label="Total Pengeluaran"
          value={`Rp ${totalExpense.toLocaleString('id-ID')}`}
          icon={PieChart}
          color="red"
        />
        <StatCard
          label="Posisi Bersih"
          value={`Rp ${netPosition.toLocaleString('id-ID')}`}
          icon={Building}
          color={netPosition >= 0 ? "emerald" : "amber"}
        />
      </div>

      {/* Ringkasan per Akun */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <PieChart size={18} /> Ringkasan Per Akun (COA)
        </h2>
        <Suspense fallback={<div className="text-slate-400">Memuat...</div>}>
          <table className="w-full text-sm text-left border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-xs text-slate-500">Kode Akun</th>
                <th className="px-4 py-2 text-xs text-slate-500">Nama Akun</th>
                <th className="px-4 py-2 text-xs text-slate-500 text-right">Total</th>
                <th className="px-4 py-2 text-xs text-slate-500 text-center">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.byAccount.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                summary.byAccount.map((a: any) => (
                  <tr key={a.account?.id ?? 'unknown'} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs text-slate-600">
                      {a.account?.code ?? '-'}
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {a.account?.name ?? '-'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      Rp {a.totalAmount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {a.account?.type ? (
                        <Badge className={classForType(a.account.type)} variant="default">
                          {a.account.type}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Suspense>
      </div>

      {/* Ringkasan per Unit */}
      {role !== 'MANAGER' && (
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Building size={18} /> Ringkasan Per Unit
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.byUnit.map((u: any) => (
              <div key={u.unit?.id ?? Math.random()} className="border border-slate-200 rounded-xl p-4">
                <h3 className="font-medium text-slate-800">{u.unit?.name ?? '-'}</h3>
                <p className="text-xs text-slate-500 mb-2">{u.unit?.code}</p>
                <p className="text-xl font-bold text-brand-700">
                  Rp {u.totalAmount.toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-slate-500 mt-1">{u.transactionCount} transaksi</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaksi Detail Table */}
      <Suspense fallback={<div className="text-slate-400">Memuat transaksi...</div>}>
        <RekonsiliasiTable apiParams={qs.toString()} />
      </Suspense>
    </div>
  );
}

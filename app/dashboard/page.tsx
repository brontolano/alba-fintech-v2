'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Filter,
  Download,
  Receipt,
  Pencil,
  LayoutGrid,
  ShoppingCart,
  Package,
  BarChart3,
  ClipboardList,
  FileText,
  Users,
  Settings,
} from 'lucide-react';

import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

interface UnitAgg {
  id: string;
  name: string;
  type: string;
  balance: number;
  income: number;
  expense: number;
  transactions: number;
}

interface RecentTransaction {
  id: string;
  date: string;
  unitId: string | null;
  unitName: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  accountName: string;
  categoryName: string;
  createdByName: string;
}

interface DashboardResponse {
  data: {
    summary: {
      totalBalance: number;
      totalIncome: number;
      totalExpense: number;
      todayTransactions: number;
    };
    units: UnitAgg[];
    recentTransactions: RecentTransaction[];
  };
  summary: {
    range: string;
    totalUnits: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState<'today' | '7d' | '30d' | '90d'>('30d');
  const [selectedUnit, setSelectedUnit] = useState<string>('');

  const fetchDashboard = async (range: string, unitId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range });
      if (unitId) params.set('unitId', unitId);

      const res = await fetch(`/api/dashboard/aggregates?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memuat data dashboard');
      }
      const result: DashboardResponse = await res.json();
      setData(result.data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
      toast.error(err.message || 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(activeRange, selectedUnit || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRange, selectedUnit]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const today = new Date();

  const { data: session } = useSession();
  const role = session?.user?.role || 'USER';

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">
          Memuat data dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-red-500">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">
          Tidak ada data yang dapat ditampilkan
        </div>
      </div>
    );
  }

  const { summary, units, recentTransactions } = data;

  const handleRangeChange = (range: 'today' | '7d' | '30d' | '90d') => {
    setActiveRange(range);
  };

  const handleExport = () => {
    // Trigger download CSV of current data
    const csvContent = [
      ['Unit', 'Nama', 'Tipe', 'Saldo', 'Pemasukan', 'Pengeluaran', 'Transaksi'],
      ...units.map((u) => [
        u.id,
        u.name,
        u.type,
        u.balance,
        u.income,
        u.expense,
        u.transactions,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-summary-${activeRange}-${format(today, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-50">
          Dashboard Keuangan
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-0.5 text-sm">
          {role}
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <Calendar size={18} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => handleRangeChange('today')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                activeRange === 'today'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => handleRangeChange('7d')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                activeRange === '7d'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => handleRangeChange('30d')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                activeRange === '30d'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => handleRangeChange('90d')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                activeRange === '90d'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              90 Hari
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="appearance-none w-full pl-3 pr-8 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">Semua Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-300" size={14} />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-xs text-slate-700 dark:text-slate-200"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-5">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-2.5 border border-emerald-100 dark:border-emerald-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <Wallet className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Total Saldo</p>
              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                {formatCurrency(summary.totalBalance)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-950/30 rounded-2xl p-2.5 border border-green-100 dark:border-green-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-green-700 dark:text-green-300 font-medium">Pemasukan</p>
              <p className="text-lg font-bold text-green-800 dark:text-green-200">
                {formatCurrency(summary.totalIncome)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl p-2.5 border border-red-100 dark:border-red-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <TrendingDown className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">Pengeluaran</p>
              <p className="text-lg font-bold text-red-800 dark:text-red-200">
                {formatCurrency(summary.totalExpense)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-2.5 border border-blue-100 dark:border-blue-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Receipt className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Hari Ini</p>
              <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                {summary.todayTransactions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Shortcut Grid - role based */}
      {(() => {
        const allFeatures = [
          { href: '/dashboard/transactions', icon: Receipt, label: 'Transaksi', roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'] },
          { href: '/dashboard/financial-notes', icon: FileText, label: 'Nota Keuangan', roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'] },
          { href: '/dashboard/approvals', icon: ClipboardList, label: 'Persetujuan', roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'] },
          { href: '/dashboard/inventory', icon: Package, label: 'Inventori', roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'] },
          { href: '/dashboard/pos', icon: ShoppingCart, label: 'POS', roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'] },
          { href: '/dashboard/reports', icon: BarChart3, label: 'Laporan', roles: ['SUPERADMIN', 'PIMPINAN'] },
          { href: '/dashboard/units', icon: LayoutGrid, label: 'Unit', roles: ['SUPERADMIN', 'PIMPINAN'] },
          { href: '/dashboard/users', icon: Users, label: 'Pengguna', roles: ['SUPERADMIN', 'PIMPINAN'] },
          { href: '/dashboard/settings', icon: Settings, label: 'Pengaturan', roles: ['SUPERADMIN'] },
        ];
        const features = allFeatures.filter((f) => f.roles.includes(role));
        return (
          <div className="mb-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {features.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition text-center"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <f.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {f.label}
                </span>
              </Link>
            ))}
          </div>
        );
      })()}

      {/* Virtual Cards per Unit */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-50 mb-4">
          Ringkasan per Unit
        </h2>
        {units.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <div className="inline-block py-4 max-w-sm">
              Tidak ada unit dengan transaksi pada periode ini
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
          {units.map((unit) => {
            const net = unit.income - unit.expense;
            return (
              <div
                key={unit.id}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{unit.name}</h3>
                  <span
                    className={`px-1.5 py-0.25 rounded-full text-xs font-medium ${
                      unit.type === 'Kantin'
                        ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                        : unit.type === 'Koperasi'
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {unit.type}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Saldo</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatCurrency(unit.balance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Pemasukan</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(unit.income)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Pengeluaran</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(unit.expense)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Trx</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {unit.transactions}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Net</span>
                    <span
                      className={`text-sm font-medium ${
                        net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {net >= 0 ? '+' : ''}{formatCurrency(net)}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/dashboard/reports?unit=${unit.id}`}
                  className="block mt-2.5 text-center text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
                >
                  Lihat Detail
                </Link>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-50">
            Transaksi Terbaru
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Tanggal
                </th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Unit
                </th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Keterangan
                </th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">
                  Pemasukan
                </th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">
                  Pengeluaran
                </th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">
                  Saldo
                </th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada transaksi terbaru
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {format(new Date(tx.date), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-emerald-600 dark:text-emerald-400">
                      {tx.unitName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                      {tx.description}
                    </td>
                    <td className="py-2.5 px-3 text-right text-green-600 dark:text-green-400 hidden sm:table-cell">
                      {tx.type === 'INCOME' ? formatCurrency(tx.amount) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-red-600 dark:text-red-400 hidden sm:table-cell">
                      {tx.type === 'EXPENSE' ? formatCurrency(tx.amount) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Link
                        href={`/dashboard/transactions/${tx.id}/edit`}
                        className="inline-flex items-center justify-center w-8 h-8 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                        title="Edit transaksi"
                      >
                        <Pencil size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

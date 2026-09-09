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
} from 'lucide-react';
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
    fetchDashboard(activeRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRange, selectedUnit]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const today = new Date();

  // Determine role-based display (server-side check for label)
  // Note: In client component, we rely on data from API which already applies RBAC
  const role = 'Pengguna';

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
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Dashboard Keuangan
        </h1>
        <p className="text-slate-600 mt-1">
          {role}
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-slate-500" />
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => handleRangeChange('today')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                activeRange === 'today'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => handleRangeChange('7d')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                activeRange === '7d'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => handleRangeChange('30d')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                activeRange === '30d'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => handleRangeChange('90d')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                activeRange === '90d'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              90 Hari
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
            >
              <option value="">Semua Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700 font-medium">Total Saldo</p>
              <p className="text-xl font-bold text-emerald-800">
                {formatCurrency(summary.totalBalance)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Total Pemasukan</p>
              <p className="text-xl font-bold text-green-800">
                {formatCurrency(summary.totalIncome)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-700 font-medium">Total Pengeluaran</p>
              <p className="text-xl font-bold text-red-800">
                {formatCurrency(summary.totalExpense)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Transaksi Hari Ini</p>
              <p className="text-xl font-bold text-blue-800">
                {summary.todayTransactions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Virtual Cards per Unit */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Ringkasan per Unit
        </h2>
        {units.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Tidak ada unit dengan transaksi pada periode ini
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {units.map((unit) => {
            const net = unit.income - unit.expense;
            return (
              <div
                key={unit.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800">{unit.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      unit.type === 'Kantin'
                        ? 'bg-orange-100 text-orange-700'
                        : unit.type === 'Koperasi'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {unit.type}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Saldo Terkini</span>
                    <span className="text-sm font-medium text-slate-800">
                      {formatCurrency(unit.balance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Pemasukan</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(unit.income)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Pengeluaran</span>
                    <span className="text-sm font-medium text-red-600">
                      {formatCurrency(unit.expense)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Transaksi</span>
                    <span className="text-sm font-medium text-slate-800">
                      {unit.transactions}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Net Result</span>
                    <span
                      className={`text-sm font-medium ${
                        net >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {net >= 0 ? '+' : ''}{formatCurrency(net)}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/dashboard/reports?unit=${unit.id}`}
                  className="block mt-3 text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            Transaksi Terbaru
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Tanggal
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Unit
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Keterangan
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Pemasukan
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Pengeluaran
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ada transaksi terbaru
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100">
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {format(new Date(tx.date), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-emerald-600">
                      {tx.unitName}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-800">
                      {tx.description}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-green-600">
                      {tx.type === 'INCOME' ? formatCurrency(tx.amount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-red-600">
                      {tx.type === 'EXPENSE' ? formatCurrency(tx.amount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">
                      {formatCurrency(tx.amount)}
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

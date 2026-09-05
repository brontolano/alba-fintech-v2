'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  PieChart as PieChartIcon,
  FileText as FileTextIcon,
  Download as DownloadIcon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { DoughnutChart } from '@/components/charts/DoughnutChart';
import { toast } from 'sonner';

interface MonthlyDataItem {
  month: string;
  income: number;
  expense: number;
  transfer: number;
}

interface UnitDistributionItem {
  id: string;
  name: string;
  income: number;
  expense: number;
  percentage: number;
}

interface TypeDistribution {
  income: number;
  expense: number;
  transfer: number;
}

interface StatCards {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitRatio: number;
}

interface ReportsResponse {
  data: {
    monthlyData: MonthlyDataItem[];
    unitDistributionData: UnitDistributionItem[];
    typeDistribution: TypeDistribution;
    statCards: StatCards;
    summary: {
      totalTransactions: number;
      totalUnits: number;
      period: string;
    };
  };
}

interface Unit {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filters, setFilters] = useState({
    period: '6months',
    unitId: '',
  });

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('period', filters.period);
      if (filters.unitId) params.set('unitId', filters.unitId);

      const res = await fetch(`/api/reports/aggregations?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memuat laporan');
      }
      const data: ReportsResponse = await res.json();
      setReportData(data.data);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      if (!res.ok) throw new Error('Gagal memuat unit');
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [filters]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  // Build chart data from API response
  const monthlyChartData = reportData
    ? {
        labels: reportData.monthlyData.map((m) => {
          const [year, month] = m.month.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return date.toLocaleDateString('id-ID', { month: 'short' });
        }),
        datasets: [
          {
            label: 'Pemasukan',
            data: reportData.monthlyData.map((m) => m.income),
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
          },
          {
            label: 'Pengeluaran',
            data: reportData.monthlyData.map((m) => m.expense),
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
          },
        ],
      }
    : { labels: [], datasets: [] };

  const unitDistributionChartData = reportData
    ? {
        labels: reportData.unitDistributionData.map((u) => u.name),
        datasets: [
          {
            data: reportData.unitDistributionData.map((u) => u.income),
            backgroundColor: [
              'rgba(16, 185, 129, 0.7)',
              'rgba(139, 92, 246, 0.7)',
              'rgba(249, 115, 22, 0.7)',
              'rgba(6, 182, 219, 0.7)',
              'rgba(251, 113, 131, 0.7)',
              'rgba(147, 51, 234, 0.7)',
            ],
            borderColor: [
              'rgb(16, 185, 129)',
              'rgb(139, 92, 246)',
              'rgb(249, 115, 22)',
              'rgb(6, 182, 219)',
              'rgb(251, 113, 131)',
              'rgb(147, 51, 234)',
            ],
            borderWidth: 1,
          },
        ],
      }
    : { labels: [], datasets: [] };

  const statCards = reportData
    ? [
        {
          title: 'Total Pemasukan',
          value: formatCurrency(reportData.statCards.totalIncome),
          change: '',
          icon: <TrendingUp className="w-6 h-6 text-green-600" />,
          bgColor: 'bg-green-100',
        },
        {
          title: 'Total Pengeluaran',
          value: formatCurrency(reportData.statCards.totalExpense),
          change: '',
          icon: <TrendingDown className="w-6 h-6 text-red-600" />,
          bgColor: 'bg-red-100',
        },
        {
          title: 'Laba Bersih',
          value: formatCurrency(reportData.statCards.netProfit),
          change: '',
          icon: <PieChartIcon className="w-6 h-6 text-emerald-600" />,
          bgColor: 'bg-emerald-100',
        },
        {
          title: 'Rasio Profit',
          value: `${reportData.statCards.profitRatio}%`,
          change: '',
          icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
          bgColor: 'bg-blue-100',
        },
      ]
    : [];

  const handleExportCSV = () => {
    if (!reportData) return;

    const csvContent = [
      ['Unit', 'Nama', 'Pemasukan', 'Pengeluaran', 'Persentase'],
      ...reportData.unitDistributionData.map((u) => [
        u.id,
        u.name,
        u.income,
        u.expense,
        `${u.percentage}%`,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-keuangan-${filters.period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Laporan Keuangan</h1>
          <p className="text-slate-600 mt-1">
            Analisis dan laporan keuangan mendetail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm"
          >
            <FileTextIcon size={16} />
            <span>Cetak Laporan</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm"
          >
            <DownloadIcon size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-500" />
            <div className="flex-1">
              <select
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              >
                <option value="6months">6 Bulan Terakhir</option>
                <option value="12months">12 Bulan Terakhir</option>
              </select>
            </div>
          </div>

          <select
            value={filters.unitId}
            onChange={(e) => setFilters({ ...filters, unitId: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
          >
            <option value="">Semua Unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>

          <select
            value="all"
            onChange={() => {}}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
          >
            <option value="all">Semua Tipe</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>

          <select
            value="summary"
            onChange={() => {}}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
          >
            <option value="summary">Ringkasan</option>
            <option value="detailed">Detail</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">
          Memuat data laporan...
        </div>
      ) : !reportData ? (
        <div className="text-center py-12 text-slate-500">
          Tidak ada data laporan tersedia
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((stat, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-800 mb-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bgColor}`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Tren Pemasukan vs Pengeluaran
                </h2>
                <select
                  value={filters.period}
                  onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                  className="px-2 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="6months">6 Bulan Terakhir</option>
                  <option value="12months">12 Bulan Terakhir</option>
                </select>
              </div>
              <div className="h-64">
                <BarChart
                  data={monthlyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                    },
                    scales: {
                      y: {
                        ticks: {
                          callback: (value: any) => {
                            return formatCurrency(value as number);
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Doughnut Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Distribusi Pemasukan per Unit
                </h2>
              </div>
              <div className="h-64">
                <DoughnutChart
                  data={unitDistributionChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Detailed Report Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                Laporan Detail per Unit
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Unit</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Pemasukan</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Pengeluaran</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Laba/Rugi</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Persentase</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.unitDistributionData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Tidak ada data unit tersedia
                      </td>
                    </tr>
                  ) : (
                    reportData.unitDistributionData.map((unit) => {
                      const profit = unit.income - unit.expense;
                      return (
                        <tr key={unit.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-medium text-slate-800">
                            {unit.name}
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-green-600">
                            {formatCurrency(unit.income)}
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-red-600">
                            {formatCurrency(unit.expense)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {formatCurrency(profit)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-slate-600">
                            {unit.percentage}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-emerald-600 font-medium text-sm">
                              Detail
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
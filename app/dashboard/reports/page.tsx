import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import Link from 'next/link';
import {
  BarChart3,
  Filter,
  Download,
  Calendar,
  PieChart,
  FileText,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const role = user?.role || 'STAFF';

  // Mock data for reports
  const units = ['KPAK', 'Koperasi Buku', 'Kantin Umi', 'Kantin Baru'];

  const monthlyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Pemasukan',
        data: [40000000, 30000000, 20000000, 25000000, 30000000, 28000000],
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
      {
        label: 'Pengeluaran',
        data: [20000000, 15000000, 25000000, 20000000, 22000000, 18000000],
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
    ],
  };

  const unitDistributionData = {
    labels: units,
    datasets: [
      {
        data: [40000000, 15000000, 8000000, 7000000],
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(249, 115, 22, 0.7)',
          'rgba(6, 182, 219, 0.7)',
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(139, 92, 246)',
          'rgb(249, 115, 22)',
          'rgb(6, 182, 219)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const statCards = [
    {
      title: 'Total Pemasukan',
      value: '191,000,000',
      change: '+12% dari bulan lalu',
      icon: <TrendingUp className="w-6 h-6 text-green-600" />,
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Pengeluaran',
      value: '125,000,000',
      change: '-8% dari bulan lalu',
      icon: <TrendingDown className="w-6 h-6 text-red-600" />,
      bgColor: 'bg-red-100',
    },
    {
      title: 'Laba Bersih',
      value: '66,000,000',
      change: '+25% dari bulan lalu',
      icon: <PieChart className="w-6 h-6 text-emerald-600" />,
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Rasio Profit',
      value: '34.5%',
      change: '+3.2% dari bulan lalu',
      icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
      bgColor: 'bg-blue-100',
    },
  ];

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
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm">
            <FileText size={16} />
            <span>Cetak Laporan</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm">
            <Download size={16} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-500" />
            <div className="flex-1">
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
                <option>Januari 2024</option>
                <option>Februari 2024</option>
                <option>Januari - Juni 2024</option>
                <option>Juli - Desember 2024</option>
                <option>2024 (Tahun Penuh)</option>
              </select>
            </div>
          </div>

          <select className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
            <option value="">Semua Unit</option>
            {units.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>

          <select className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
            <option value="all">Semua Tipe</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>

          <select className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
            <option value="summary">Ringkasan</option>
            <option value="detailed">Detail</option>
          </select>
        </div>
      </div>

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
                <p className="text-xs text-slate-500">{stat.change}</p>
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
        {/* Bar Chart - Monthly Income vs Expense */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Tren Pemasukan vs Pengeluaran
            </h2>
            <select className="px-2 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option>6 Bulan Terakhir</option>
              <option>12 Bulan Terakhir</option>
            </select>
          </div>
          <div className="h-64">
            <Bar
              data={monthlyData}
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
                      callback: (value) => {
                        return formatCurrency(value as number);
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Doughnut Chart - Unit Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Distribusi Pemasukan per Unit
            </h2>
          </div>
          <div className="h-64">
            <Doughnut
              data={unitDistributionData}
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
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Unit
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Pemasukan
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Pengeluaran
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Laba/Rugi
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Saldo
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit, idx) => {
                const income = [40, 15, 8, 7][idx] * 1000000;
                const expense = [20, 10, 7, 6][idx] * 1000000;
                const balance = [125, 75, 32, 28][idx] * 1000000;
                const profit = income - expense;

                return (
                  <tr
                    key={unit}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">
                      {unit}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-green-600">
                      {formatCurrency(income)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-red-600">
                      {formatCurrency(expense)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={
                          profit >= 0
                            ? 'text-green-600 font-medium'
                            : 'text-red-600 font-medium'
                        }
                      >
                        {formatCurrency(profit)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-800">
                      {formatCurrency(balance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href={`/dashboard/reports/${unit.toLowerCase().replace(/\s+/g, '-')}`}
                        className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

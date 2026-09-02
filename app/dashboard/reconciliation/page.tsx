import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import {
  Search,
  CheckCircle,
  Clock,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default async function ReconciliationPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  

  const units = ['KPAK', 'Koperasi Buku', 'Kantin Umi', 'Kantin Baru'];
  const today = new Date();

  // Mock reconciliation data
  const reconciliationTasks = [
    {
      id: '1',
      date: today,
      unit: 'KPAK',
      manager: 'Abdul Rahman',
      staff: 'Siti Aisyah',
      income: 15000000,
      expense: 12000000,
      cashOnHand: 135000000,
      systemBalance: 134800000,
      variance: 200000,
      status: 'PENDING',
    },
    {
      id: '2',
      date: today,
      unit: 'Koperasi Buku',
      manager: 'Budi Santoso',
      staff: 'Rina Wijaya',
      income: 8500000,
      expense: 6500000,
      cashOnHand: 75000000,
      systemBalance: 75000000,
      variance: 0,
      status: 'RECONCILED',
    },
    {
      id: '3',
      date: today,
      unit: 'Kantin Umi',
      manager: 'Dewi Lestari',
      staff: 'Heru Kurniawan',
      income: 4200000,
      expense: 3800000,
      cashOnHand: 32000000,
      systemBalance: 31950000,
      variance: 50000,
      status: 'PENDING',
    },
    {
      id: '4',
      date: today,
      unit: 'Kantin Baru',
      manager: 'Fajar Mustakim',
      staff: 'Nurul Huda',
      income: 3800000,
      expense: 3500000,
      cashOnHand: 28000000,
      systemBalance: 28000000,
      variance: 0,
      status: 'PENDING',
    },
  ];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECONCILED':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            Selesai
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
            Pending
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
            Draft
          </span>
        );
    }
  };

  const totalVariance = reconciliationTasks.reduce(
    (sum, task) => sum + task.variance,
    0
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Rekonsiliasi Keuangan
          </h1>
          <p className="text-slate-600 mt-1">
            Rekonsiliasi harian per unit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm">
            <Download size={16} />
            <span>Export Laporan</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari unit..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>

          <select className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="reconciled">Selesai</option>
            <option value="disputed">Disputed</option>
          </select>

          <div className="flex items-center gap-2">
            <Clock size={18} className="text-slate-500" />
            <input
              type="date"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              defaultValue={format(today, 'yyyy-MM-dd')}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 font-medium mb-1">
            Total Unit
          </p>
          <p className="text-2xl font-bold text-slate-800">{units.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 font-medium mb-1">
            Selesai
          </p>
          <p className="text-2xl font-bold text-green-600">
            {
              reconciliationTasks.filter(
                (t) => t.status === 'RECONCILED'
              ).length
            }
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 font-medium mb-1">
            Perlu Rekonsiliasi
          </p>
          <p className="text-2xl font-bold text-yellow-600">
            {
              reconciliationTasks.filter(
                (t) => t.status === 'PENDING'
              ).length
            }
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 font-medium mb-1">
            Total Selisih
          </p>
          <p
            className={`text-2xl font-bold ${
              totalVariance >= 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {formatCurrency(totalVariance)}
          </p>
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                  Manager
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Staff
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Pemasukan
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Pengeluaran
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Kas di Registrikan
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Sistem
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Selisih
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Status
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {reconciliationTasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {format(task.date, 'dd MMM yyyy', { locale: id })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-emerald-600">
                      {task.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-800">
                    {task.manager}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {task.staff}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-green-600">
                    {formatCurrency(task.income)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-red-600">
                    {formatCurrency(task.expense)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-800">
                    {formatCurrency(task.cashOnHand)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-600">
                    {formatCurrency(task.systemBalance)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`text-sm font-medium ${
                        task.variance === 0
                          ? 'text-slate-800'
                          : task.variance > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {task.variance !== 0 && (task.variance > 0 ? '+ ' : '- ')}
                      {formatCurrency(Math.abs(task.variance))}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {getStatusBadge(task.status)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                      <CheckCircle size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

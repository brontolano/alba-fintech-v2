import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const role = user?.role || 'STAFF';

  // Mock data for units - this would come from database in production
  const units = [
    {
      id: 'kpk',
      name: 'KPAK',
      type: 'Kantor Pelayanan Administrasi Keuangan',
      balance: 125000000,
      income: 15000000,
      expense: 12000000,
      transactions: 24,
    },
    {
      id: 'koperasi',
      name: 'Koperasi Buku',
      type: 'Koperasi',
      balance: 75000000,
      income: 8500000,
      expense: 6500000,
      transactions: 18,
    },
    {
      id: 'kantin-umi',
      name: 'Kantin Umi',
      type: 'Kantin',
      balance: 32000000,
      income: 4200000,
      expense: 3800000,
      transactions: 15,
    },
    {
      id: 'kantin-baru',
      name: 'Kantin Baru',
      type: 'Kantin',
      balance: 28000000,
      income: 3800000,
      expense: 3500000,
      transactions: 12,
    },
  ];

  const totalBalance = units.reduce((sum, unit) => sum + unit.balance, 0);
  const totalIncome = units.reduce((sum, unit) => sum + unit.income, 0);
  const totalExpense = units.reduce((sum, unit) => sum + unit.expense, 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const today = new Date();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Dashboard Keuangan
        </h1>
        <p className="text-slate-600 mt-1">
          {user?.name || 'Pengguna'} • {role}
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-slate-500" />
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
            <option>Hari Ini</option>
            <option>7 Hari Terakhir</option>
            <option>30 Hari Terakhir</option>
            <option>90 Hari Terakhir</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm">
            <Filter size={16} />
            <span>Filter Unit</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm">
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
                {formatCurrency(totalBalance)}
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
                {formatCurrency(totalIncome)}
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
                {formatCurrency(totalExpense)}
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
                {units.reduce((sum, unit) => sum + unit.transactions, 0)}
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
              <tr className="border-b border-slate-100">
                <td className="py-3 px-4 text-sm text-slate-600">
                  {format(today, 'dd MMM yyyy', { locale: id })}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-emerald-600">
                  KPAK
                </td>
                <td className="py-3 px-4 text-sm text-slate-800">
                  Pembayaran Administrasi Sekolah
                </td>
                <td className="py-3 px-4 text-right text-sm text-green-600">
                  {formatCurrency(5000000)}
                </td>
                <td className="py-3 px-4 text-right text-slate-500">
                  -
                </td>
                <td className="py-3 px-4 text-right text-sm text-slate-600">
                  {formatCurrency(125000000)}
                </td>
              </tr>
              {/* More mock transactions would be here */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

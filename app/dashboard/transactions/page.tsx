import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  Download,
} from 'lucide-react';
import Link from 'next/link';

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const role = user?.role || 'STAFF';

  // In a real app, fetch actual data from the database
  const transactions = [
    {
      id: '1',
      date: '2024-01-15',
      unit: 'KPAK',
      type: 'INCOME',
      description: 'Pembayaran Administrasi Sekolah',
      amount: 5000000,
      status: 'APPROVED',
      reference: 'TRX-001',
    },
    {
      id: '2',
      date: '2024-01-15',
      unit: 'Koperasi Buku',
      type: 'EXPENSE',
      description: 'Pembelian Buku',
      amount: 2500000,
      status: 'PENDING',
      reference: 'TRX-002',
    },
    {
      id: '3',
      date: '2024-01-14',
      unit: 'Kantin Umi',
      type: 'INCOME',
      description: 'Penjualan Makanan',
      amount: 1800000,
      status: 'APPROVED',
      reference: 'TRX-003',
    },
  ];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transaksi</h1>
          <p className="text-slate-600 mt-1">
            Kelola semua transaksi keuangan
          </p>
        </div>
        <Link
          href="/dashboard/transactions/create"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus size={18} />
          <span>Buat Transaksi</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari transaksi..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>

          <select className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
            <option value="">Semua Unit</option>
            <option value="kpk">KPAK</option>
            <option value="koperasi">Koperasi Buku</option>
            <option value="kantin-umi">Kantin Umi</option>
            <option value="kantin-baru">Kantin Baru</option>
          </select>

          <select className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="draft">Draft</option>
          </select>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-500" />
            <span className="text-sm text-slate-600">Tanggal:</span>
            <input
              type="date"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
            <span className="text-slate-500">s/d</span>
            <input
              type="date"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  #
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Tanggal
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Unit
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Ref
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Keterangan
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Jumlah
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <tr
                  key={tx.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-3 px-4 text-sm text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {tx.date}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-emerald-600">
                    {tx.unit}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {tx.reference}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-800">
                    {tx.description}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={
                        tx.type === 'INCOME'
                          ? 'text-green-600 font-medium'
                          : 'text-red-600 font-medium'
                      }
                    >
                      {tx.type === 'INCOME' ? '+' : '- '}
                      {formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        tx.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : tx.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : tx.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                        title="Lihat"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Menampilkan 1-10 dari 100 transaksi
        </p>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
            Sebelumnya
          </button>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
            1
          </span>
          <button className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
            2
          </button>
          <button className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
            ...
          </button>
          <button className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
            10
          </button>
          <button className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}

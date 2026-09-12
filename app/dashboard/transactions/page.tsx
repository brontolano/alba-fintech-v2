'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  Trash2,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  date: string;
  unitId: string | null;
  unitName?: string;
  accountName?: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  description: string;
  amount: number;
  categoryName?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  reference?: string;
  createdByName?: string;
  createdAt: string;
}

interface Unit {
  id: string;
  name: string;
}

interface TransactionsResponse {
  data: Transaction[];
  summary: {
    total: number;
    totalIncome: number;
    totalExpense: number;
    totalTransfer: number;
    pages: number;
    currentPage: number;
  };
}

export default function TransactionsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    unitId: '',
    type: '',
    status: '',
    categoryId: '',
    startDate: '',
    endDate: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Set default unit filter for MANAGER/STAFF
  useEffect(() => {
    if (session?.user?.role === 'MANAGER' || session?.user?.role === 'STAFF') {
      if (session?.user?.unitId) {
        setFilters((prev) => ({ ...prev, unitId: session.user.unitId || '' }));
      }
    }
  }, [session]);

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

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/financial-categories');
      if (!res.ok) throw new Error('Gagal memuat kategori');
      const data = await res.json();
      setCategories(data.data ?? []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());
      if (filters.unitId) params.set('unitId', filters.unitId);
      if (filters.type) params.set('type', filters.type);
      if (filters.status) params.set('status', filters.status);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.search) params.set('search', filters.search);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memuat transaksi');
      }
      const result: TransactionsResponse = await res.json();
      setTransactions(result.data ?? []);
      setTotalPages(result.summary?.pages ?? 1);
      setTotalItems(result.summary?.total ?? 0);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters.unitId, filters.type, filters.status, filters.categoryId, filters.startDate, filters.endDate]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page on new filter
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus transaksi');
      }
      toast.success('Transaksi berhasil dihapus');
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus transaksi');
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Disetujui';
      case 'PENDING':
        return 'Pending';
      case 'REJECTED':
        return 'Ditolak';
      case 'DRAFT':
        return 'Draft';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

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
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Cari deskripsi atau referensi..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            <select
              value={filters.unitId}
              onChange={(e) => handleFilterChange('unitId', e.target.value)}
              className="flex-1 lg:flex-none min-w-[140px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
            >
              <option value="">Semua Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>

            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="flex-1 lg:flex-none min-w-[130px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
            >
              <option value="">Semua Tipe</option>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
              <option value="TRANSFER">Transfer</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="flex-1 lg:flex-none min-w-[130px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
              <option value="DRAFT">Draft</option>
            </select>

            <select
              value={filters.categoryId}
              onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              className="flex-1 lg:flex-none min-w-[160px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto border-t xl:border-t-0 pt-4 xl:pt-0">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-500" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Periode:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-36 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              />
              <span className="text-slate-400">s/d</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-36 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          {Object.values(filters).some((v) => v !== '' && v !== undefined) && (
            <button
              onClick={() => {
                setFilters({
                  search: '',
                  unitId: '',
                  type: '',
                  status: '',
                  categoryId: '',
                  startDate: '',
                  endDate: '',
                });
                setCurrentPage(1);
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded transition"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">#</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Tanggal</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Unit</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Ref</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Keterangan</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Jumlah</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada transaksi ditemukan
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {(currentPage - 1) * limit + idx + 1}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(tx.date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-emerald-600">
                      {tx.unitName || tx.unitId || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {tx.reference || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-800">
                      {tx.description}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={
                          tx.type === 'INCOME'
                            ? 'text-green-600 font-medium'
                            : tx.type === 'EXPENSE'
                            ? 'text-red-600 font-medium'
                            : 'text-blue-600 font-medium'
                        }
                      >
                        {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '- ' : ''}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}
                      >
                        {getStatusLabel(tx.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/dashboard/transactions/${tx.id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                          title="Lihat"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Menampilkan {loading ? '...' : (currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, transactions.length)} dari {totalItems} transaksi
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft size={14} />
            Sebelumnya
          </button>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
            {currentPage}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages || loading}
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-1"
          >
            Berikutnya
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
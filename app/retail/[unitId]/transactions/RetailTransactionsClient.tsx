// app/retail/[unitId]/transactions/RetailTransactionsClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../components/santri/Button';
import { Badge } from '../../../../components/santri/Badge';
import { Input } from '../../../../components/santri/Input';
import { Select } from '../../../../components/santri/Select';
import { Modal } from '../../../../components/santri/Modal';
import { RetailTransaction } from '../../../../types/santri';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FilterState {
  search: string;
  status: string;
  paymentMethod: string;
  startDate: string;
  endDate: string;
}

export function RetailTransactionsClient() {
  const params = useParams();
  const { unitId } = params;

  const [transactions, setTransactions] = useState<RetailTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
  });
  const [selectedTransaction, setSelectedTransaction] = useState<RetailTransaction | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        retailUnitId: unitId as string,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const res = await fetch(`/api/retail-transactions?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat transaksi');
      const data = await res.json();
      setTransactions(data.data || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [unitId, pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabels: Record<string, string> = {
    PENDING: 'Pending',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
    REFUNDED: 'Direfund',
  };

  const statusColors: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
    PENDING: 'warning',
    COMPLETED: 'success',
    CANCELLED: 'error',
    REFUNDED: 'info',
  };

  const paymentMethodLabels: Record<string, string> = {
    CASH: 'Tunai',
    TABUNGAN: 'Tabungan',
    CARD: 'Kartu',
  };

  const paymentMethodColors: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    CASH: 'success',
    TABUNGAN: 'info',
    CARD: 'warning',
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        {error}
        <button className="ml-4 underline" onClick={() => window.location.reload()}>Coba lagi</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/retail/${unitId}`} className="text-sm text-blue-600 hover:underline mb-1 inline-block">
            ← Kembali ke POS
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Riwayat Transaksi</h1>
          <p className="text-sm text-gray-500">Unit: {unitId}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Cari (Santri/NIS)</label>
            <Input
              id="search"
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Nama/NIS santri..."
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              id="status"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Semua</option>
              <option value="COMPLETED">Selesai</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Dibatalkan</option>
              <option value="REFUNDED">Direfund</option>
            </select>
          </div>
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">Metode Bayar</label>
            <select
              id="paymentMethod"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={filters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            >
              <option value="">Semua</option>
              <option value="CASH">Tunai</option>
              <option value="TABUNGAN">Tabungan</option>
              <option value="CARD">Kartu</option>
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
          <div className="lg:col-span-5 flex gap-2">
            <Button type="submit" variant="primary">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 13a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </Button>
            <Button type="button" variant="secondary" onClick={() => setFilters({ search: '', status: '', paymentMethod: '', startDate: '', endDate: '' })}>
              Reset
            </Button>
          </div>
        </form>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Belum ada transaksi</h3>
            <p className="mt-1 text-gray-500">Transaksi POS akan muncul di sini.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Santri</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kasir</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map(transaction => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(transaction.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transaction.santri ? (
                          <>
                            <p className="font-medium">{transaction.santri.name}</p>
                            <p className="text-xs text-gray-500">NIS: {transaction.santri.studentNumber}</p>
                          </>
                        ) : (
                          <span className="text-gray-400">Walk-in</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="max-w-xs">
                          {transaction.items?.slice(0, 3).map((item: any, idx: number) => (
                            <div key={idx} className="truncate">
                              {item.product?.name} x{item.quantity}
                            </div>
                          ))}
                          {transaction.items && transaction.items.length > 3 && (
                            <div className="text-xs text-gray-500">+{transaction.items.length - 3} item lagi</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.totalAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Badge variant={paymentMethodColors[transaction.paymentMethod] || 'default'}>
                          {paymentMethodLabels[transaction.paymentMethod] || transaction.paymentMethod}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Badge variant={statusColors[transaction.status] || 'default'}>
                          {statusLabels[transaction.status] || transaction.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {transaction.user?.name || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowDetail(true);
                          }}
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Menampilkan {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Detail Transaksi"
        description="Detail lengkap transaksi retail"
        actionLabel="Tutup"
        onAction={() => setShowDetail(false)}
        variant="primary"
      />
    </div>
  );
}
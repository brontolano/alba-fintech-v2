// app/retail/[unitId]/inventory/InventoryClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../components/santri/Button';
import { Badge } from '../../../../components/santri/Badge';
import { Input } from '../../../../components/santri/Input';
import { Select } from '../../../../components/santri/Select';
import { Modal } from '../../../../components/santri/Modal';
import { RetailProduct, RetailInventory, InventoryItem } from '../../../../types/santri';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FilterState {
  search: string;
  stockStatus: string;
  category: string;
}

export function InventoryClient() {
  const params = useParams();
  const { unitId } = params;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    stockStatus: '',
    category: '',
  });
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showOpnameModal, setShowOpnameModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({ quantity: 0, type: 'IN' as 'IN' | 'OUT', reason: '' });

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        retailUnitId: unitId as string,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (filters.search) params.set('search', filters.search);
      if (filters.stockStatus) params.set('stockStatus', filters.stockStatus);

      const res = await fetch(`/api/retail-inventory?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat inventory');
      const data = await res.json();
      setItems(data.data || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [unitId, pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleOpenAdjustment = (item: InventoryItem, type: 'IN' | 'OUT') => {
    setSelectedItem(item);
    setAdjustmentData({ quantity: 0, type, reason: '' });
    setShowAdjustmentModal(true);
  };

  const handleAdjustmentSubmit = async () => {
    if (!selectedItem || adjustmentData.quantity <= 0) return;
    
    try {
      const res = await fetch('/api/retail-inventory/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailUnitId: unitId,
          productId: selectedItem.id,
          quantity: adjustmentData.quantity,
          type: adjustmentData.type,
          reason: adjustmentData.reason,
        }),
      });
      if (!res.ok) throw new Error('Gagal adjustment stok');
      setShowAdjustmentModal(false);
      fetchInventory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpnameSubmit = async () => {
    if (!selectedItem) return;
    
    try {
      const res = await fetch('/api/retail-inventory/opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailUnitId: unitId,
          productId: selectedItem.id,
          countedQuantity: adjustmentData.quantity,
          reason: adjustmentData.reason,
        }),
      });
      if (!res.ok) throw new Error('Gagal stock opname');
      setShowOpnameModal(false);
      fetchInventory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const getStockStatus = (stock: number, minStock: number): 'OK' | 'LOW' | 'OUT' => {
    if (stock === 0) return 'OUT';
    if (stock <= minStock) return 'LOW';
    return 'OK';
  };

  const getStatusVariant = (status: 'OK' | 'LOW' | 'OUT') => {
    switch (status) {
      case 'OK': return 'success';
      case 'LOW': return 'warning';
      case 'OUT': return 'error';
    }
  };

  const statusLabels = { OK: 'Normal', LOW: 'Rendah', OUT: 'Habis' };

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href={`/retail/${unitId}`} className="text-sm text-blue-600 hover:underline mb-1 inline-block">
            ← Kembali ke POS
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Inventory</h1>
          <p className="text-sm text-gray-500">Stok, Adjustment, Stock Opname</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/retail/${unitId}/products`} className="btn btn-secondary">
            Kelola Produk
          </Link>
          <Link href={`/retail/${unitId}`} className="btn btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            POS
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Produk</p>
          <p className="text-2xl font-bold text-gray-800">{items.length > 0 ? pagination.total : 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Stok Normal</p>
          <p className="text-2xl font-bold text-green-600">
            {items.filter(i => getStockStatus(i.currentStock, i.minStock) === 'OK').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Stok Rendah</p>
          <p className="text-2xl font-bold text-yellow-600">
            {items.filter(i => getStockStatus(i.currentStock, i.minStock) === 'LOW').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Stok Habis</p>
          <p className="text-2xl font-bold text-red-600">
            {items.filter(i => getStockStatus(i.currentStock, i.minStock) === 'OUT').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Cari Produk</label>
            <Input
              id="search"
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Nama/Kode produk..."
            />
          </div>
          <div>
            <label htmlFor="stockStatus" className="block text-sm font-medium text-gray-700 mb-1">Status Stok</label>
            <select
              id="stockStatus"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={filters.stockStatus}
              onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
            >
              <option value="">Semua</option>
              <option value="OK">Normal</option>
              <option value="LOW">Rendah</option>
              <option value="OUT">Habis</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <Button variant="secondary" onClick={() => setFilters({ search: '', stockStatus: '', category: '' })}>
              Reset Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Belum ada produk</h3>
            <p className="mt-1 text-gray-500">Tambah produk terlebih dahulu dari halaman Produk.</p>
            <Link href={`/retail/${unitId}/products/new`} className="mt-6 inline-block btn btn-primary">
              Tambah Produk
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Jual</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Saat Ini</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai Stok</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map(item => {
                    const status = getStockStatus(item.currentStock, item.minStock);
                    const stockValue = item.currentStock * item.price;
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${status === 'OUT' ? 'bg-red-50' : status === 'LOW' ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.code}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">{item.minStock}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono text-lg font-bold ${status === 'OUT' ? 'text-red-600' : status === 'LOW' ? 'text-yellow-600' : 'text-green-600'}`}>
                            {item.currentStock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-left text-sm">
                          <Badge variant={getStatusVariant(status)}>{statusLabels[status]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(stockValue)}</td>
                        <td className="px-4 py-3 text-right text-sm">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenAdjustment(item, 'IN')}
                              title="Tambah Stok (Pembelian/Return)"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenAdjustment(item, 'OUT')}
                              title="Kurangi Stok (Rusak/Hilang)"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedItem(item); setAdjustmentData({ quantity: item.currentStock, type: 'IN', reason: 'Stock Opname' }); setShowOpnameModal(true); }}
                              title="Stock Opname"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
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

      {/* Adjustment Modal */}
      <Modal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        title={selectedItem ? `Adjustment Stok: ${selectedItem.name}` : 'Adjustment Stok'}
        description={selectedItem ? `Stok saat ini: ${selectedItem.currentStock} (Min: ${selectedItem.minStock})` : ''}
        actionLabel={adjustmentData.type === 'IN' ? 'Tambah Stok' : 'Kurangi Stok'}
        onAction={handleAdjustmentSubmit}
        variant={adjustmentData.type === 'IN' ? 'primary' : 'danger'}
        customContent={
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah <span className="text-red-500">*</span></label>
              <Input
                type="number"
                min="1"
                value={adjustmentData.quantity}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
              <select
                value={adjustmentData.type}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, type: e.target.value as 'IN' | 'OUT' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="IN">Masuk (Pembelian/Return)</option>
                <option value="OUT">Keluar (Rusak/Hilang/Pakai Sendiri)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alasan <span className="text-red-500">*</span></label>
              <textarea
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Contoh: Pembelian dari supplier, Barang rusak, Pakai sendiri, Koreksi stock opname"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>
          </div>
        }
      />

      {/* Stock Opname Modal */}
      <Modal
        isOpen={showOpnameModal}
        onClose={() => setShowOpnameModal(false)}
        title={selectedItem ? `Stock Opname: ${selectedItem.name}` : 'Stock Opname'}
        description={selectedItem ? `Stok sistem: ${selectedItem.currentStock} | Masukkan jumlah fisik aktual` : ''}
        actionLabel="Simpan Opname"
        onAction={handleOpnameSubmit}
        variant="primary"
        customContent={
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Stok Sistem Saat Ini</p>
              <p className="text-2xl font-bold text-gray-800">{selectedItem?.currentStock || 0}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Fisik Aktual <span className="text-red-500">*</span></label>
              <Input
                type="number"
                min="0"
                value={adjustmentData.quantity}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                className="w-full text-xl text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan/Keterangan</label>
              <textarea
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Contoh: Stock opname bulanan, Koreksi stok, Ditemukan barang rusak"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
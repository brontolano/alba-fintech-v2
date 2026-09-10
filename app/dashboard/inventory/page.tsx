'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  unitId: string | null;
  unitName?: string;
  unit: { id: string; name: string } | null;
  currentStock: number;
  minStock: number;
  unitPrice: number;
  purchasePrice: number;
  isActive: boolean;
  orderItems: Array<{ id: string; quantity: number; totalPrice: number }>;
  createdAt: string;
  updatedAt: string;
}

interface Unit {
  id: string;
  name: string;
}

interface InventoryResponse {
  data: InventoryItem[];
  summary: {
    total: number;
    pages: number;
  };
}

interface UnitsResponse {
  data: Unit[];
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const [filters, setFilters] = useState({
    search: '',
    unitId: '',
    category: '',
    stockStatus: 'all',
  });

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      if (!res.ok) throw new Error('Gagal memuat unit');
      const data: UnitsResponse = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());
      if (filters.unitId) params.set('unitId', filters.unitId);
      if (filters.category) params.set('category', filters.category);
      params.set('isActive', 'true'); // Only active items for POS view

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memuat inventori');
      }
      const data: InventoryResponse = await res.json();
      const fetchedItems = data.data ?? [];
      setItems(fetchedItems);
      setTotalPages(data.summary?.pages ?? 1);
      setTotalItems(data.summary?.total ?? 0);

      // Extract unique categories
      const cats = Array.from(new Set(fetchedItems
        .map((item) => item.category)
        .filter((c): c is string => c !== null && c !== undefined)
      ));
      setCategories(cats);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat inventori');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus barang ini?')) return;
    // Note: inventory currently doesn't have a delete endpoint
    // This would need a proper API route - for now show informational message
    toast.info('Fitur hapus barang membutuhkan endpoint API yang belum tersedia');
  };

  // Client-side search filter
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(filters.search.toLowerCase());
    const matchStock =
      filters.stockStatus === 'all'
        ? true
        : filters.stockStatus === 'low'
        ? item.currentStock <= item.minStock && item.currentStock > 0
        : filters.stockStatus === 'out'
        ? item.currentStock <= 0
        : item.currentStock > item.minStock;
    return matchSearch && matchStock;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) return 'out';
    if (current <= min) return 'low';
    return 'good';
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case 'out':
        return (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            Habis
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
            Stok Rendah
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            Tersedia
          </span>
        );
    }
  };

  const lowStockCount = filteredItems.filter(
    (item) => getStockStatus(item.currentStock, item.minStock) !== 'good'
  ).length;

  const totalValue = filteredItems.reduce(
    (sum, item) => sum + Number(item.currentStock) * Number(item.unitPrice),
    0
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventori Barang</h1>
          <p className="text-slate-600 mt-1">
            Kelola stok barang untuk unit retail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
            <Plus size={18} />
            <span>Tambah Barang</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">
                Total Barang
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {filteredItems.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">
                Stok Rendah
              </p>
              <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">
                Nilai Stok
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">
                Unit Aktif
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {units.length} Unit Terdaftar
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari barang..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>

          <select
            value={filters.unitId}
            onChange={(e) => handleFilterChange('unitId', e.target.value)}
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
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
          >
            <option value="">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={filters.stockStatus}
            onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
          >
            <option value="all">Semua Status Stok</option>
            <option value="low">Stok Rendah</option>
            <option value="good">Tersedia</option>
            <option value="out">Habis</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">#</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nama Barang</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">SKU</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Kategori</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Unit</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Stok</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Harga Beli</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Harga Jual</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nilai</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    Tidak ada barang ditemukan
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const stockStatus = getStockStatus(item.currentStock, item.minStock);
                  const totalValue = Number(item.currentStock) * Number(item.unitPrice);

                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {(currentPage - 1) * limit + idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Package className="w-4 h-4 text-slate-500" />
                          </div>
                          <span className="text-sm font-medium text-slate-800">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{item.sku}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{item.category || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {item.unit?.name || item.unitName || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`text-sm font-medium ${
                            stockStatus === 'good'
                              ? 'text-green-600'
                              : stockStatus === 'low'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {item.currentStock} / {item.minStock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">
                        {formatCurrency(Number(item.purchasePrice))}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-emerald-600">
                        {formatCurrency(Number(item.unitPrice))}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-slate-800 font-medium">
                        {formatCurrency(totalValue)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStockBadge(stockStatus)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-1">
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Menampilkan {totalItems > 0 ? (currentPage - 1) * limit + 1 : 0}-{Math.min(currentPage * limit, totalItems)} dari {totalItems} barang
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-5 flex items-center gap-1 disabled:opacity-50"
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
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-5 flex items-center gap-1 disabled:opacity-50"
          >
            Berikutnya
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
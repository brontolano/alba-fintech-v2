'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Package, Plus, Search, Edit, Trash2, Upload, Download, RefreshCw, X, Save, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface Lembaga { id: string; name: string }
interface Unit { id: string; name: string; code: string; lembagaId?: string }
interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  unitId: string;
  unit: { id: string; name: string; code: string };
  currentStock: number;
  minStock: number;
  unitPrice?: number;
  category?: string;
  isActive: boolean;
  createdAt: string;
}

interface AddItemForm {
  name: string;
  sku: string;
  unitId: string;
  currentStock: number;
  minStock: number;
  unitPrice?: number;
  category?: string;
}

export default function InventoryPage() {
  const { data: session, status } = useSession({ required: true });
  const role = session?.user?.role as string | undefined;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lembagas, setLembagas] = useState<Lembaga[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [lembagaFilter, setLembagaFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<'name' | 'category' | 'currentStock' | 'unitPrice'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<InventoryItem[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add item form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addItemForm, setAddItemForm] = useState<AddItemForm>({
    name: '',
    sku: '',
    unitId: '',
    currentStock: 0,
    minStock: 0,
    unitPrice: undefined,
    category: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperadmin = role === 'SUPERADMIN';
  const hasSelectedItems = selectedIds.size > 0;
  const selectedCount = hasSelectedItems ? selectedIds.size : 0;

  // Load lembaga list (superadmin only, for dropdown)
  const fetchLembagas = useCallback(async () => {
    if (!isSuperadmin) return;
    try {
      const res = await fetch('/api/lembaga');
      const data = await res.json();
      setLembagas(data.data ?? []);
    } catch (err) {
      console.error('Fetch lembaga error:', err);
    }
  }, [isSuperadmin]);

  // Load units — filtered by selected lembaga if superadmin
  const fetchUnits = useCallback(async (lembagaId?: string) => {
    try {
      const params = new URLSearchParams();
      if (lembagaId) params.set('lembagaId', lembagaId);
      const res = await fetch(`/api/units?${params.toString()}`);
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error('Fetch units error:', err);
    }
  }, []);

  // Load inventory items filtered by unit (or lembaga for superadmin)
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isSuperadmin && lembagaFilter) {
        params.set('lembagaId', lembagaFilter);
      }
      if (unitFilter) {
        params.set('unitId', unitFilter);
      }
      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();
      setItems(data.data ?? []);
    } catch (err) {
      console.error('Fetch inventory error:', err);
      toast.error('Gagal memuat inventaris');
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, lembagaFilter, unitFilter]);

  useEffect(() => {
    if (status === 'loading') return;
    if (isSuperadmin) {
      fetchLembagas();
      if (lembagaFilter) fetchUnits(lembagaFilter);
    }
    fetchItems();
  }, [status, isSuperadmin, lembagaFilter, unitFilter, fetchLembagas, fetchUnits, fetchItems]);

  // When lembaga changes, refetch units + reset unit filter
  const handleLembagaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLembagaFilter(e.target.value);
    setUnitFilter('');
    if (e.target.value) {
      fetchUnits(e.target.value);
    } else {
      fetchUnits();
    }
  };

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Selection handlers
  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (hasSelectedItems) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const handleDeleteSelected = () => {
    const selectedItems = filtered.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;

    setItemsToDelete(selectedItems);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const promises = Array.from(selectedIds).map((id) => {
        return fetch(`/api/inventory/${id}`, {
          method: 'DELETE',
        });
      });

      await Promise.all(promises);
      toast.success(`Berhasil menghapus ${selectedIds.size} item`);
      setSelectedIds(new Set());
      setItemsToDelete([]);
      setShowDeleteConfirm(false);
      fetchItems();
    } catch (err: any) {
      toast.error('Gagal menghapus item: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setItemsToDelete([]);
    setShowDeleteConfirm(false);
  };

  // Handle add item submit
  const handleAddItem = async () => {
    if (!addItemForm.name || !addItemForm.sku || !addItemForm.unitId) {
      toast.error('Nama, SKU, dan Unit harus diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addItemForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menambahkan item');
      }

      toast.success('Item inventaris berhasil ditambahkan');
      setShowAddModal(false);
      setAddItemForm({
        name: '',
        sku: '',
        unitId: lembagaFilter ? units.find(u => u.lembagaId === lembagaFilter)?.id || '' : units[0]?.id || '',
        currentStock: 0,
        minStock: 0,
        unitPrice: undefined,
        category: '',
      });
      fetchItems(); // Refresh items list
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan item inventaris');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const searched = search
      ? items.filter((i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          (i.sku ?? '').toLowerCase().includes(search.toLowerCase()),
        )
      : items;
    const sorted = [...searched];
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') return dir * a.name.localeCompare(b.name);
      if (sortKey === 'category') return dir * ((a.category ?? '').localeCompare(b.category ?? ''));
      if (sortKey === 'currentStock') return dir * (a.currentStock - b.currentStock);
      return dir * ((a.unitPrice ?? 0) - (b.unitPrice ?? 0));
    });
    return sorted;
  }, [items, search, sortKey, sortDir]);

  const getStatus = (item: InventoryItem) => {
    if (item.currentStock === 0) return { label: 'Habis', cls: 'bg-red-100 text-red-700' };
    if (item.currentStock <= item.minStock) return { label: 'Stok Rendah', cls: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Tersedia', cls: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventaris</h1>
            <p className="text-sm text-slate-500">Kelola stok barang per unit</p>
          </div>
        </div>
        {isSuperadmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition flex items-center gap-2"
          >
            <Plus size={16} />
            Tambah Barang
          </button>
        )}
      </div>

      {/* Filter Row: Lembaga + Unit Search */}
      {isSuperadmin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lembaga</label>
            <select
              value={lembagaFilter}
              onChange={handleLembagaChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
            >
              <option value="">Semua Lembaga</option>
              {lembagas.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
            >
              <option value="">Semua Unit</option>
              {units
                .filter((u) => !lembagaFilter || u.lembagaId === lembagaFilter)
                .map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                ))}
            </select>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
            />
          </div>
        </div>
      )}
      {!isSuperadmin && (
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
          />
        </div>
      )}

      {/* Bulk Action Bar */}
      {hasSelectedItems && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            {selectedCount} item{selectedCount > 1 ? 's' : ''} dipilih
          </span>
          <button
            onClick={handleDeleteSelected}
            className="px-3 py-1.5 text-sm text-white bg-red-600 rounded hover:bg-red-700 transition flex items-center gap-1"
          >
            <Trash2 size={14} />
            Hapus
          </button>
          <button
            onClick={() => {
              toast.info('Fitur edit massal akan tersedia segera');
              setSelectedIds(new Set());
            }}
            className="px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition flex items-center gap-1"
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition"
          >
            Batal Pilih
          </button>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Tambah Barang Inventaris</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Row 1: Name and SKU */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nama Barang *</label>
                  <input
                    type="text"
                    placeholder="Masukkan nama barang"
                    value={addItemForm.name}
                    onChange={(e) => setAddItemForm({ ...addItemForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SKU *</label>
                  <input
                    type="text"
                    placeholder="Masukkan SKU"
                    value={addItemForm.sku}
                    onChange={(e) => setAddItemForm({ ...addItemForm, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Unit Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Unit *</label>
                <select
                  value={addItemForm.unitId}
                  onChange={(e) => setAddItemForm({ ...addItemForm, unitId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                >
                  <option value="">Pilih Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                  ))}
                </select>
              </div>

              {/* Row 3: Stock and Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Stok Awal</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={addItemForm.currentStock}
                    onChange={(e) => setAddItemForm({ ...addItemForm, currentStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Harga Satuan</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={addItemForm.unitPrice ?? ''}
                    onChange={(e) => setAddItemForm({ ...addItemForm, unitPrice: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Row 4: Min Stock and Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Min Stok</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={addItemForm.minStock}
                    onChange={(e) => setAddItemForm({ ...addItemForm, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Kategori</label>
                  <input
                    type="text"
                    placeholder="Misal: Makanan, Minuman, Perlengkapan"
                    value={addItemForm.category ?? ''}
                    onChange={(e) => setAddItemForm({ ...addItemForm, category: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleAddItem}
                disabled={isSubmitting}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Konfirmasi Hapus</h3>
              <p className="text-sm text-slate-600 mb-4">
                Anda yakin ingin menghapus {itemsToDelete.length} item{itemsToDelete.length > 1 ? 's' : ''} ini?
                Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Ya, Hapus
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <Package size={48} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-900 mb-2">Belum Ada Inventaris</h3>
          <p className="text-sm text-slate-500">Tidak ada item inventaris ditemukan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="w-8 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={hasSelectedItems && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border border-slate-300 focus:ring-2 focus:ring-brand-500"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs cursor-pointer" onClick={() => handleSort('name')}>
                  Nama Barang {sortKey === 'name' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs">SKU</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs">Unit</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 uppercase text-xs cursor-pointer" onClick={() => handleSort('currentStock')}>
                  Stok {sortKey === 'currentStock' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 uppercase text-xs">Min Stok</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 uppercase text-xs cursor-pointer" onClick={() => handleSort('unitPrice')}>
                  Harga {sortKey === 'unitPrice' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs cursor-pointer" onClick={() => handleSort('category')}>
                  Kategori {sortKey === 'category' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-center py-3 px-4 font-medium text-slate-500 uppercase text-xs">Status</th>
                <th className="w-8 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const st = getStatus(item);
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr key={item.id} className={`border-b border-slate-50 hover:bg-slate-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(item.id)}
                        className="w-4 h-4 rounded border border-slate-300 focus:ring-2 focus:ring-brand-500"
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{item.sku ?? '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{item.unit.name} ({item.unit.code})</td>
                    <td className="py-3 px-4 text-right text-slate-800 font-medium">{item.currentStock}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{item.minStock}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{item.unitPrice ? `Rp ${Number(item.unitPrice).toLocaleString()}` : '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{item.category ?? '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="py-3 px-3">
                      {isSuperadmin && (
                        <button
                          onClick={() => toast.info('Fitur edit akan tersedia sebentar')}
                          className="p-1 hover:bg-slate-100 rounded transition"
                        >
                          <Edit size={16} className="text-slate-600" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => toast.info('Fitur impor akan tersedia')}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex items-center gap-2"
        >
          <Upload size={16} /> Import
        </button>
        <button
          onClick={() => toast.info('Fitur ekspor akan tersedia')}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex items-center gap-2"
        >
          <Download size={16} /> Export
        </button>
        <button
          onClick={fetchItems}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex items-center gap-2"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
    </div>
  );
}
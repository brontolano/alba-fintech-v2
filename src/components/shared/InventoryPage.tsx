'use client';

import { useEffect, useState, useMemo } from 'react';
import { Package, Plus, Search, Edit, Trash2, Upload, Download, RefreshCw } from 'lucide-react';
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

  const isSuperadmin = role === 'SUPERADMIN';

  // Load lembaga list (superadmin only, for dropdown)
  const fetchLembagas = async () => {
    if (!isSuperadmin) return;
    try {
      const res = await fetch('/api/lembaga');
      const data = await res.json();
      setLembagas(data.data ?? []);
    } catch (err) {
      console.error('Fetch lembaga error:', err);
    }
  };

  // Load units — filtered by selected lembaga if superadmin
  const fetchUnits = async (lembagaId?: string) => {
    try {
      const params = new URLSearchParams();
      if (lembagaId) params.set('lembagaId', lembagaId);
      const res = await fetch(`/api/units?${params.toString()}`);
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error('Fetch units error:', err);
    }
  };

  // Load inventory items filtered by unit (or lembaga for superadmin)
  const fetchItems = async () => {
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
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (isSuperadmin) {
      fetchLembagas();
      if (lembagaFilter) fetchUnits(lembagaFilter);
    }
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isSuperadmin, lembagaFilter, unitFilter]);

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
      {/* Header */}
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
            onClick={() => toast.info('Fitur tambah barang akan tersedia di versi mendatang')}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition flex items-center gap-2"
          >
            <Plus size={16} />
            Tambah Barang
          </button>
        )}
      </div>

      {/* Filter Row: Lembaga + Unit Search */}
      {isSuperadmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const st = getStatus(item);
                return (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
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

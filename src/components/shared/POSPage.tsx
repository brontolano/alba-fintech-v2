'use client';

import { useEffect, useState, useMemo } from 'react';
import { ShoppingCart, Package, TrendingUp, TrendingDown, Download, RefreshCw, Calendar } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

type SortKey = 'description' | 'amount' | 'type' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface Lembaga { id: string; name: string }
interface Unit { id: string; name: string; code: string; lembagaId?: string }

interface Transaction {
  id: string;
  unitId: string;
  unit: { id: string; name: string };
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

export default function POSPage() {
  const { data: session, status: sessionStatus } = useSession({ required: true });
  const role = session?.user?.role as string | undefined;
  const isSuperadmin = role === 'SUPERADMIN';

  const [lembagas, setLembagas] = useState<Lembaga[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [lembagaFilter, setLembagaFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions];
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'description') return dir * a.description.localeCompare(b.description);
      if (sortKey === 'amount') return dir * (a.amount - b.amount);
      if (sortKey === 'type') return dir * a.type.localeCompare(b.type);
      return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
    return sorted;
  }, [transactions, sortKey, sortDir]);

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

  // Fetch transactions filtered by lembaga/unit
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (lembagaFilter) params.set('lembagaId', lembagaFilter);
      if (unitFilter) params.set('unitId', unitFilter);
      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      setTransactions(data.data ?? []);
    } catch (err) {
      console.error('Fetch transactions error:', err);
      toast.error('Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (isSuperadmin) {
      fetchLembagas();
      if (lembagaFilter) fetchUnits(lembagaFilter);
    }
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, isSuperadmin, lembagaFilter, unitFilter]);

  const handleLembagaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLembagaFilter(e.target.value);
    setUnitFilter('');
    if (e.target.value) {
      fetchUnits(e.target.value);
    } else {
      fetchUnits();
    }
  };

  // Compute summary stats
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todaysTxns = transactions.filter((t) => t.createdAt.split('T')[0] === todayStr);
  const todayIncome = todaysTxns.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const todayExpense = todaysTxns.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const todayCount = todaysTxns.length;
  const totalCount = transactions.length;
  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : '0.0';

  const formatCurrency = (n: number) => `Rp ${Number(n || 0).toLocaleString()}`;

  if (sessionStatus === 'loading') {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart size={24} className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Point of Sale</h1>
            <p className="text-sm text-slate-500">Kelola penjualan dan kas harian per unit</p>
          </div>
        </div>
        <button
          onClick={() => toast.info('Fitur export akan tersedia')}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex items-center gap-2"
        >
          <Download size={16} /> Export
        </button>
      </div>

      {/* Filter Row: Lembaga + Unit (superadmin only) */}
      {isSuperadmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(todayIncome)}</div>
              <p className="text-xs text-slate-500">Penjualan Hari Ini</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-700">{todayCount}</div>
              <p className="text-xs text-slate-500">Transaksi Hari Ini</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingDown size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-700">{margin}%</div>
              <p className="text-xs text-slate-500">Margin</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <ShoppingCart size={20} className="text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-700">{formatCurrency(netBalance)}</div>
              <p className="text-xs text-slate-500">Saldo Bersih</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <ShoppingCart size={48} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-900 mb-2">Belum Ada Transaksi</h3>
          <p className="text-sm text-slate-500">Transaksi akan muncul di sini setelah dibuat.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs cursor-pointer" onClick={() => handleSort('createdAt')}>
                  Tanggal {sortKey === 'createdAt' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs cursor-pointer" onClick={() => handleSort('description')}>
                  Deskripsi {sortKey === 'description' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs">Unit</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs cursor-pointer" onClick={() => handleSort('type')}>
                  Tipe {sortKey === 'type' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 uppercase text-xs cursor-pointer" onClick={() => handleSort('amount')}>
                  Jumlah {sortKey === 'amount' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
                {sortedTransactions.slice(0, 15).map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-600">{new Date(t.createdAt).toLocaleDateString('id-ID')}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{t.description}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{t.unit?.name ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span className={t.type === 'INCOME' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {t.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(t.amount)}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-end">
        <button
          onClick={fetchTransactions}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex items-center gap-2"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
    </div>
  );
}

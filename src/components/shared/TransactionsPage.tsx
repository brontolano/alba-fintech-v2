'use client';

import { useEffect, useState, useMemo } from 'react';
import { Wallet, Plus, Search, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Modal, Button, Badge, Select, TransactionStatusBadge, TransactionTypeBadge } from '@/components/ui';
import { toast } from 'sonner';

type UserRole = 'SUPERADMIN' | 'PIMPINAN' | 'MANAGER' | 'STAFF';

type SortKey = 'description' | 'amount' | 'status' | 'type' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface Transaction {
  id: string;
  unitId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  reference?: string;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  unit: { name: string; code: string };
  createdBy: { name?: string; email: string };
}

interface Unit {
  id: string;
  name: string;
  code: string;
}

interface CreateForm {
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  description: string;
  reference: string;
  unitId: string;
  photoUrl: string;
  photoFile: File | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [form, setForm] = useState<CreateForm>({
    type: 'INCOME',
    amount: '',
    description: '',
    reference: '',
    unitId: '',
    photoUrl: '',
    photoFile: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('STAFF');
  const [lembagaFilter, setLembagaFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [lembagas, setLembagas] = useState<{ id: string; name: string }[]>([]);
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

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/transactions', { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      setTransactions(data.data ?? []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      toast.error('Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    if (userRole === 'SUPERADMIN' || userRole === 'PIMPINAN') {
      try {
        const res = await fetch('/api/units', { headers: { 'Content-Type': 'application/json' } });
        const data = await res.json();
        setUnits(data.data ?? []);
      } catch (err) {
        console.error('Error fetching units:', err);
      }
    }
  };

  const fetchLembagas = async () => {
    try {
      const res = await fetch('/api/lembaga');
      const data = await res.json();
      setLembagas(data.data ?? []);
    } catch (err) {
      console.error('Error fetching lembaga:', err);
    }
  };

  const fetchUserRole = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setUserRole(data.user?.role || 'STAFF');
    } catch {
      setUserRole('STAFF');
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchUserRole();
    fetchLembagas();
  }, []);

  useEffect(() => {
    if (userRole === 'SUPERADMIN' || userRole === 'PIMPINAN') {
      fetchUnits();
    }
  }, [userRole]);

  const filtered = useMemo(() => {
    const byUnit = unitFilter
      ? transactions.filter((t) => t.unitId === unitFilter)
      : transactions;
    const searched = search
      ? byUnit.filter((t) =>
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          (t.reference ?? '').toLowerCase().includes(search.toLowerCase())
        )
      : byUnit;
    const sorted = [...searched];
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'description') return dir * a.description.localeCompare(b.description);
      if (sortKey === 'amount') return dir * (a.amount - b.amount);
      if (sortKey === 'status') return dir * a.status.localeCompare(b.status);
      if (sortKey === 'type') return dir * a.type.localeCompare(b.type);
      return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
    return sorted;
  }, [transactions, search, unitFilter, sortKey, sortDir]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', form.type);
      formData.append('amount', parseFloat(form.amount).toString());
      formData.append('description', form.description);
      formData.append('reference', form.reference || '');
      formData.append('unitId', userRole === 'SUPERADMIN' || userRole === 'PIMPINAN' ? form.unitId : '');
      if (form.photoFile) {
        formData.append('photo', form.photoFile);
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat transaksi');
      }
      const result = await res.json();
      toast.success('Transaksi berhasil dibuat');
      setTransactions([result.data, ...transactions]);
      setShowModal(false);
      setForm({ type: 'INCOME', amount: '', description: '', reference: '', unitId: '', photoUrl: '', photoFile: null });
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tx: Transaction) => {
    if (!confirm(`Hapus transaksi "${tx.description}"?`)) return;
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus');
      }
      toast.success('Transaksi dihapus');
      setTransactions(transactions.filter((t) => t.id !== tx.id));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus transaksi');
    }
  };

  const handleView = (tx: Transaction) => {
    toast.info(`${tx.type} - ${tx.description}`, {
      description: `Jumlah: ${formatCurrency(tx.amount)}\nStatus: ${tx.status}\nUnit: ${tx.unit?.code ?? '-'}`,
      duration: 5000,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transaksi Keuangan</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola semua transaksi keuangan</p>
        </div>
        <Button variant="default" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          <span className="ml-2">Buat Transaksi</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative max-w-md flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
          />
        </div>
        {(userRole === 'SUPERADMIN' || userRole === 'PIMPINAN') && units.length > 0 && (
          <div className="w-full sm:w-48">
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
            >
              <option value="">Semua Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Belum ada transaksi</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daftar Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">No</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('description')}>
                      Deskripsi {sortKey === 'description' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('type')}>
                      Jenis {sortKey === 'type' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('amount')}>
                      Jumlah {sortKey === 'amount' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('status')}>
                      Status {sortKey === 'status' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Unit</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('createdAt')}>
                      Dibuat {sortKey === 'createdAt' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx, idx) => (
                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{tx.description}</p>
                        {tx.reference && <p className="text-xs text-slate-400">{tx.reference}</p>}
                        {tx.photoUrl && (
                          <img
                            src={tx.photoUrl}
                            alt="Nota"
                            className="mt-1 max-w-20 max-h-20 rounded border border-slate-200 object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                      </td>
                      <td className="py-3 px-4"><TransactionTypeBadge type={tx.type} /></td>
                      <td className="py-3 px-4 text-right">
                        <span className={tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                          {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4"><TransactionStatusBadge status={tx.status} /></td>
                      <td className="py-3 px-4 text-sm text-slate-600">{tx.unit?.code ?? '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleView(tx)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                            aria-label="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(tx)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600"
                            aria-label="Delete"
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
          </CardContent>
        </Card>
      )}

      {/* Create Transaction Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Buat Transaksi Baru" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jenis</label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as 'INCOME' | 'EXPENSE' })}>
                <option value="INCOME">Pendapatan</option>
                <option value="EXPENSE">Pengeluaran</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah (IDR)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                placeholder="0"
                required
                min="0"
                step="any"
              />
            </div>
          </div>

          {(userRole === 'SUPERADMIN' || userRole === 'PIMPINAN') && units.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <Select value={form.unitId} onValueChange={(v) => setForm({ ...form, unitId: v })}>
                <option value="">Pilih Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
              placeholder="Deskripsi transaksi"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Referensi (opsional)</label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
              placeholder="No. referensi / bukti transfer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Foto Nota</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setForm({ ...form, photoFile: file, photoUrl: '' });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
            <p className="text-xs text-slate-400 mt-1">
              Buka kamera atau pilih dari galeri untuk ambil foto nota transaksi.
            </p>
            {form.photoFile && (
              <p className="text-xs text-slate-500 mt-1">
                File terpilih: {form.photoFile.name} ({(form.photoFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <Button type="submit" loading={submitting} disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


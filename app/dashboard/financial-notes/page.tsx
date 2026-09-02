'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  Edit,
  Trash2,
  Download,
  TrendingUp,
  TrendingDown,
  Save,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

interface FinancialNote {
  id: string;
  unitId: string | null;
  unitName?: string;
  title: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  date: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  isReconciled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateForm {
  title: string;
  description: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  date: string;
  unitId: string;
  categoryId?: string;
}

export default function FinancialNotesPage() {
  const [notes, setNotes] = useState<FinancialNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [form, setForm] = useState<CreateForm>({
    title: '',
    description: '',
    amount: '',
    type: 'INCOME',
    date: new Date().toISOString().split('T')[0],
    unitId: '',
  });
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch notes
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/financial-notes', {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setNotes(data.data ?? []);
    } catch (err) {
      console.error('Error fetching financial notes:', err);
      toast.error('Gagal memuat catatan keuangan');
    } finally {
      setLoading(false);
    }
  };

  // Fetch units
  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchUnits();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const matchSearch =
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.description.toLowerCase().includes(search.toLowerCase());
    const matchUnit = unitFilter ? note.unitId === unitFilter : true;
    const matchType = typeFilter ? note.type === typeFilter : true;
    const matchDate = dateFilter ? note.date.startsWith(dateFilter) : true;
    return matchSearch && matchUnit && matchType && matchDate;
  });

  // Summary
  const totalIncome = filteredNotes.reduce(
    (sum, note) => sum + (note.type === 'INCOME' ? note.amount : 0),
    0
  );
  const totalExpense = filteredNotes.reduce(
    (sum, note) => sum + (note.type === 'EXPENSE' ? note.amount : 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/financial-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan catatan');
      }

      const result = await res.json();
      toast.success('Catatan keuangan berhasil disimpan');
      setNotes([result.data, ...notes]);
      setShowModal(false);
      setForm({
        title: '',
        description: '',
        amount: '',
        type: 'INCOME',
        date: new Date().toISOString().split('T')[0],
        unitId: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan catatan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus catatan keuangan ini?')) return;
    try {
      const res = await fetch(`/api/financial-notes/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus');
      }
      toast.success('Catatan dihapus');
      setNotes(notes.filter((n) => n.id !== id));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus catatan');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Catatan Keuangan Pimpinan
          </h1>
          <p className="text-slate-600 mt-1">
            Catat pemasukan dan pengeluaran langsung pimpinan
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus size={18} />
          <span>Buat Catatan</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
          >
            <option value="">Semua Jenis</option>
            <option value="INCOME">Pemasukan</option>
            <option value="EXPENSE">Pengeluaran</option>
            <option value="TRANSFER">Transfer</option>
          </select>

          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 font-medium mb-1">Total Pemasukan</p>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 font-medium mb-1">Total Pengeluaran</p>
          <p className="text-xl font-bold text-red-600">
            {formatCurrency(totalExpense)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 font-medium mb-1">Selisih</p>
          <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 font-medium mb-1">Total Catatan</p>
          <p className="text-xl font-bold text-slate-800">
            {filteredNotes.length}
          </p>
        </div>
      </div>

      {/* Notes Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Tanggal</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Unit</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Judul</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Deskripsi</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Jumlah</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Tidak ada catatan keuangan
                  </td>
                </tr>
              ) : (
                filteredNotes.map((note) => (
                  <tr key={note.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {format(new Date(note.date), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-emerald-600">
                      {note.unitName || note.unitId || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">
                      {note.title}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate">
                      {note.description}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={note.type === 'INCOME' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {note.type === 'INCOME' ? '+' : '- '}{formatCurrency(note.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          note.status === 'APPROVED'
                            ? 'bg-green-100 text-green-700'
                            : note.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : note.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {note.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
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

      {/* Create Note Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Buat Catatan Keuangan</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    placeholder="Judul catatan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jenis</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'INCOME' | 'EXPENSE' | 'TRANSFER' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  >
                    <option value="INCOME">Pemasukan</option>
                    <option value="EXPENSE">Pengeluaran</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah (IDR)</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    placeholder="0"
                    required
                    min="0"
                    step="any"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                <select
                  value={form.unitId}
                  onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                >
                  <option value="">Pilih Unit (opsional)</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm resize-none"
                  rows={3}
                  placeholder="Deskripsi detail catatan keuangan"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <><Save size={16} className="animate-spin" /> Menyimpan...</> : <><Save size={16} /> Simpan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

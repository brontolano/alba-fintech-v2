'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Calendar,
  Edit,
  Trash2,
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

export default function FinancialNotesPage() {
  const [notes, setNotes] = useState<FinancialNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);

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
        <Link
          href="/dashboard/financial-notes/create"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus size={18} />
          <span>Buat Catatan</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Cari catatan atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 lg:flex-none min-w-[130px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
            >
              <option value="">Semua Jenis</option>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto border-t xl:border-t-0 pt-4 xl:pt-0">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-500" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tanggal:</span>
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
          </div>

          {(search || unitFilter || typeFilter || dateFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setUnitFilter('');
                setTypeFilter('');
                setDateFilter('');
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded transition"
            >
              Reset
            </button>
          )}
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
        {/* Mobile: card list */}
        <div className="md:hidden">
          {loading ? (
            <div className="p-6 text-center text-slate-500">Memuat data...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-6 text-center text-slate-500">Tidak ada catatan keuangan</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredNotes.map((note) => (
                <div key={note.id} className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Tanggal</span>
                    <span className="text-sm text-slate-600">
                      {format(new Date(note.date), 'dd MMM yyyy', { locale: id })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Unit</span>
                    <span className="text-sm font-medium text-emerald-600">
                      {note.unitName || note.unitId || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Judul</span>
                    <span className="text-sm font-medium text-slate-800">{note.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Deskripsi</span>
                    <span className="text-sm text-slate-600">{note.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Jumlah</span>
                    <span className={note.type === 'INCOME' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {note.type === 'INCOME' ? '+' : '- '}{formatCurrency(note.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Status</span>
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
                  </div>
                  <div className="pt-2 flex justify-end gap-1">
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
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Desktop: tabel normal */}
        <div className="hidden md:block">
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

    </div>
  );
}

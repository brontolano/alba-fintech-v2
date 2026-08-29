'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Filter, Search, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface FinancialNote {
  id: string;
  title: string;
  description?: string;
  amount: number;
  type: 'PEMASUKAN' | 'PENGELUARAN' | 'REKONSILIASI';
  noteDate: string;
  reference?: string;
  isSummary: boolean;
  createdAt: string;
  updatedAt: string;
  unit?: { id: string; name: string; code: string };
  lembaga?: { id: string; name: string; code: string };
  createdBy: { id: string; name?: string; email: string; role: string };
}

interface FinancialNoteSummary {
  totalNotes: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  net: number;
}

export default function PimpinanFinancialNotesPage() {
  const [notes, setNotes] = useState<FinancialNote[]>([]);
  const [summary, setSummary] = useState<FinancialNoteSummary>({
    totalNotes: 0,
    totalPemasukan: 0,
    totalPengeluaran: 0,
    net: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    description: '',
    amount: '',
    type: 'PEMASUKAN' as 'PEMASUKAN' | 'PENGELUARAN',
    noteDate: '',
    reference: '',
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/financial-notes');
      if (!res.ok) throw new Error('Gagal memuat catatan keuangan');
      const data = await res.json();
      setNotes(data.data);
      setSummary(data.summary);
    } catch (error: any) {
      toast.error('Gagal memuat data', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNote.title || !newNote.amount) {
      toast.error('Judul dan jumlah harus diisi');
      return;
    }

    try {
      const res = await fetch('/api/financial-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newNote,
          amount: parseFloat(newNote.amount),
          noteDate: newNote.noteDate || new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Gagal menyimpan catatan');
      
      toast.success('Catatan keuangan berhasil disimpan');
      setIsCreateOpen(false);
      setNewNote({
        title: '',
        description: '',
        amount: '',
        type: 'PEMASUKAN',
        noteDate: '',
        reference: '',
      });
      fetchNotes();
    } catch (error: any) {
      toast.error('Gagal menyimpan', { description: error.message });
    }
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || note.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catatan Keuangan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pencatatan masuk/keluar dan ringkasan rekonsiliasi unit
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition flex items-center gap-2"
        >
          <Plus size={18} />
          Catat Baru
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Total Catatan</p>
          <p className="text-2xl font-bold text-slate-900">{summary.totalNotes}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Total Pemasukan</p>
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" />
            <p className="text-2xl font-bold text-green-600">
              Rp {summary.totalPemasukan.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Total Pengeluaran</p>
          <div className="flex items-center gap-2">
            <TrendingDown size={18} className="text-red-500" />
            <p className="text-2xl font-bold text-red-600">
              Rp {summary.totalPengeluaran.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">Selisih (Net)</p>
          <p className={`text-2xl font-bold ${summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Rp {summary.net.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
          />
        </div>
        <select
          value={filterType || ''}
          onChange={(e) => setFilterType(e.target.value || null)}
          className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
        >
          <option value="">Semua Tipe</option>
          <option value="PEMASUKAN">Pemasukan</option>
          <option value="PENGELUARAN">Pengeluaran</option>
          <option value="REKONSILIASI">Rekonsiliasi</option>
        </select>
      </div>

      {/* Notes List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Memuat...</div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText size={48} className="mx-auto mb-3 text-slate-300" />
          <p>Belum ada catatan keuangan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      note.type === 'PEMASUKAN' ? 'bg-green-100 text-green-700' :
                      note.type === 'PENGELUARAN' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {note.type === 'PEMASUKAN' ? 'Pemasukan' :
                       note.type === 'PENGELUARAN' ? 'Pengeluaran' : 'Rekonsiliasi'}
                    </span>
                    {note.isSummary && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        Ringkasan
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {format(new Date(note.noteDate), 'dd MMM yyyy', { locale: localeId })}
                    </span>
                  </div>
                  <h3 className="font-medium text-slate-900 mt-2">{note.title}</h3>
                  {note.description && (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{note.description}</p>
                  )}
                  {note.reference && (
                    <p className="text-xs text-slate-400 mt-1">Referensi: {note.reference}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span>Dibuat oleh: {note.createdBy.name || note.createdBy.email}</span>
                    {note.unit && <span>Unit: {note.unit.name}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${note.type === 'PEMASUKAN' ? 'text-green-600' : 'text-red-600'}`}>
                    Rp {note.amount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Note Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-slide-up">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Catat Keuangan Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="Contoh: Pendapatan kantin pagi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah</label>
                <input
                  type="number"
                  value={newNote.amount}
                  onChange={(e) => setNewNote({ ...newNote, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                <select
                  value={newNote.type}
                  onChange={(e) => setNewNote({ ...newNote, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="PEMASUKAN">Pemasukan</option>
                  <option value="PENGELUARAN">Pengeluaran</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={newNote.noteDate}
                  onChange={(e) => setNewNote({ ...newNote, noteDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi (opsional)</label>
                <textarea
                  value={newNote.description}
                  onChange={(e) => setNewNote({ ...newNote, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                  placeholder="Detail tambahan..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Referensi (opsional)</label>
                <input
                  type="text"
                  value={newNote.reference}
                  onChange={(e) => setNewNote({ ...newNote, reference: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="Contoh: Rekonsiliasi unit kantin"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleCreateNote}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

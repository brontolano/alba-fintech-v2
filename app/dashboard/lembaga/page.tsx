'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Lembaga {
  id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    units: number;
    users: number;
  };
}

export default function LembagaPage() {
  const [lembagas, setLembagas] = useState<Lembaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    address: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchLembagas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lembaga');
      const data = await res.json();
      setLembagas(data.data ?? []);
    } catch (err) {
      console.error('Error fetching lembaga:', err);
      toast.error('Gagal memuat lembaga');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLembagas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/lembaga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat lembaga');
      }

      const result = await res.json();
      toast.success('Lembaga berhasil dibuat');
      setLembagas([result.data, ...lembagas]);
      setShowModal(false);
      setForm({
        name: '',
        code: '',
        description: '',
        address: '',
        isActive: true,
      });
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat lembaga');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLembagas = lembagas.filter(
    (lembaga) =>
      lembaga.name.toLowerCase().includes(search.toLowerCase()) ||
      lembaga.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Lembaga</h1>
          <p className="text-slate-600 mt-1">
            Kelola lembaga/pesantren di sistem
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus size={18} />
          <span>Tambah Lembaga</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Cari lembaga..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      </div>

      {/* Lembaga List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : filteredLembagas.length === 0 ? (
        <div className="text-center py-12">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Tidak ada lembaga ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLembagas.map((lembaga) => (
            <div
              key={lembaga.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Building2 size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{lembaga.name}</h3>
                    <p className="text-sm text-slate-500">{lembaga.code}</p>
                    {lembaga.address && (
                      <p className="text-sm text-slate-600 mt-1">{lembaga.address}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lembaga.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {lembaga.isActive ? 'Aktif' : 'Non-aktif'}
                  </span>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600"
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {lembaga.description && (
                <p className="text-sm text-slate-600 mt-2 ml-12">
                  {lembaga.description}
                </p>
              )}

              <div className="mt-3 ml-12 grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-1 text-slate-600">
                  <span>Unit:</span>
                  <span className="font-medium">
                    {lembaga._count?.units || 0}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <span>Pengguna:</span>
                  <span className="font-medium">
                    {lembaga._count?.users || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Tambah Lembaga Baru</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nama Lembaga
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  placeholder="Nama lembaga"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kode Lembaga
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm uppercase"
                  placeholder="Kode lembaga"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Alamat
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm resize-none"
                  rows={2}
                  placeholder="Alamat lengkap"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm resize-none"
                  rows={3}
                  placeholder="Deskripsi lembaga"
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
                  disabled={submitting || !form.name || !form.code}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

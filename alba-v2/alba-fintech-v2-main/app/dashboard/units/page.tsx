'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building,
  Wallet,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';

interface Unit {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  isRetail: boolean;
  type: string;
  lembagaId?: string | null;
  _count: {
    users: number;
    transactions: number;
  };
}

interface CreateForm {
  name: string;
  code: string;
  description: string;
  type: string;
  isRetail: boolean;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CreateForm>({
    name: '',
    code: '',
    description: '',
    type: 'UMUM',
    isRetail: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch units
  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/units', {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error('Error fetching units:', err);
      toast.error('Gagal memuat unit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          isRetail: form.type === 'KOPERASI' || form.type === 'KANTIN',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat unit');
      }

      const result = await res.json();
      toast.success('Unit berhasil dibuat');
      setUnits([result.data, ...units]);
      setShowModal(false);
      setForm({
        name: '',
        code: '',
        description: '',
        type: 'UMUM',
        isRetail: false,
      });
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat unit');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'KPAK':
        return <Wallet className="w-5 h-5 text-emerald-600" />;
      case 'KOPERASI':
        return <Building className="w-5 h-5 text-purple-600" />;
      case 'KANTIN':
        return <ShoppingCart className="w-5 h-5 text-orange-600" />;
      default:
        return <Building className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'KPAK':
        return 'bg-emerald-100 text-emerald-700';
      case 'KOPERASI':
        return 'bg-purple-100 text-purple-700';
      case 'KANTIN':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredUnits = units.filter(
    (unit) =>
      unit.name.toLowerCase().includes(search.toLowerCase()) ||
      unit.code.toLowerCase().includes(search.toLowerCase()) ||
      unit.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Unit</h1>
          <p className="text-slate-600 mt-1">
            Kelola unit-unit di Pondok Pesantren Al-Basyariyah
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus size={18} />
          <span>Tambah Unit</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Cari unit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      </div>

      {/* Units Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Tidak ada unit ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnits.map((unit) => (
            <div
              key={unit.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    {getTypeIcon(unit.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{unit.name}</h3>
                    <p className="text-sm text-slate-500">{unit.code}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(unit.type)}`}
                >
                  {unit.type}
                </span>
              </div>

              {unit.description && (
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                  {unit.description}
                </p>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-500">Staff</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {unit._count?.users || 0}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-500">Transaksi</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {unit._count?.transactions || 0}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs text-slate-500">Status</p>
                  <p className={`text-sm font-semibold ${unit.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {unit.isActive ? 'Aktif' : 'Non-aktif'}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {unit.isRetail ? 'Unit Retail' : 'Unit Standar'}
                </span>
              </div>

              <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3">
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
          ))}
        </div>
      )}

      {/* Create Unit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Tambah Unit Baru</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Unit</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  placeholder="Nama unit"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kode Unit</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm uppercase"
                  placeholder="Kode unit"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Unit</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                >
                  <option value="KPAK">KPAK (Kantor Pelayanan Administrasi Keuangan)</option>
                  <option value="KOPERASI">Koperasi Buku</option>
                  <option value="KANTIN">Kantin</option>
                  <option value="UMUM">Umum</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi (opsional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm resize-none"
                  rows={3}
                  placeholder="Deskripsi unit"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRetail"
                    checked={form.isRetail}
                    onChange={(e) => {
                      const retail = e.target.checked;
                      let type = form.type;
                      if (type === 'UMUM') type = 'KANTIN';
                      setForm({ ...form, isRetail: retail, type: retail ? (type === 'UMUM' ? 'KANTIN' : type) : form.type });
                    }}
                    className="h-4 w-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="isRetail" className="text-sm text-slate-700">
                    Unit Retail (dengan inventory & POS)
                  </label>
                </div>
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
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
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

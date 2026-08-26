'use client';

import { useEffect, useState } from 'react';
import { Building, Plus, Search, Edit, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Modal, Button } from '@/components/ui';
import { toast } from 'sonner';

interface Lembaga {
  id: string;
  name: string;
  code: string | null;
  description?: string;
  isActive: boolean;
  _count?: { units: number };
  createdAt: string;
}

interface CreateForm {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

export default function LembagaPage() {
  const [lembagas, setLembagas] = useState<Lembaga[]>([]);
  const [unitsByLembaga, setUnitsByLembaga] = useState<Record<string, { id: string; name: string; code: string; userCount: number }[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLembaga, setEditingLembaga] = useState<Lembaga | null>(null);
  const [form, setForm] = useState<CreateForm>({
    name: '',
    code: '',
    description: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchLembagas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lembaga', { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      setLembagas(data.data ?? []);

      // Fetch units for each lembaga
      const unitsRes = await fetch('/api/units');
      const unitsData = await unitsRes.json();
      const allUnits = unitsData.data ?? [];

      const unitMap: Record<string, { id: string; name: string; code: string; userCount: number }[]> = {};
      lembagas.forEach((l) => {
        unitMap[l.id] = allUnits.filter((u: any) => u.lembagaId === l.id);
      });
      setUnitsByLembaga(unitMap);
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

  const filtered = search
    ? lembagas.filter((l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.code && l.code.toLowerCase().includes(search.toLowerCase()))
      )
    : lembagas;

  const openCreateModal = () => {
    setEditingLembaga(null);
    setForm({ name: '', code: '', description: '', isActive: true });
    setShowModal(true);
  };

  const openEditModal = (lembaga: Lembaga) => {
    setEditingLembaga(lembaga);
    setForm({
      name: lembaga.name,
      code: lembaga.code ?? '',
      description: lembaga.description ?? '',
      isActive: lembaga.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingLembaga ? `/api/lembaga/${editingLembaga.id}` : '/api/lembaga';
      const method = editingLembaga ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan lembaga');
      }

      const result = await res.json();
      const savedLembaga = result.data;

      if (editingLembaga) {
        setLembagas(lembagas.map((l) => (l.id === savedLembaga.id ? savedLembaga : l)));
        toast.success('Lembaga berhasil diperbarui');
      } else {
        setLembagas([savedLembaga, ...lembagas]);
        toast.success('Lembaga berhasil ditambahkan');
      }

      setShowModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan lembaga');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (lembaga: Lembaga) => {
    if (!confirm(`Hapus lembaga "${lembaga.name}"?`)) return;
    try {
      const res = await fetch(`/api/lembaga/${lembaga.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus');
      }
      toast.success('Lembaga berhasil dihapus');
      setLembagas(lembagas.filter((l) => l.id !== lembaga.id));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus lembaga');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Lembaga</h1>
          <p className="text-slate-500 text-sm mt-1">Lembaga induk untuk pencatatan keuangan terpusat</p>
        </div>
        <Button variant="default" onClick={openCreateModal}>
          <Plus size={16} />
          <span className="ml-2">Tambah Lembaga</span>
        </Button>
      </div>

      <div className="relative max-w-md mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari lembaga..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Belum ada lembaga</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daftar Lembaga ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nama Lembaga</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Kode</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Unit</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const lembagaUnits = unitsByLembaga[l.id] ?? [];
                  const totalUsers = lembagaUnits.reduce((sum, u) => sum + (u.userCount ?? 0), 0);
                  return (
                    <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-800">{l.name}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 font-mono">{l.code ?? '-'}</td>
                      <td className="py-3 px-4"><Badge variant={l.isActive ? 'success' : 'outline'}>{l.isActive ? 'Aktif' : 'Non-aktif'}</Badge></td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">{lembagaUnits.length}</td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">{totalUsers}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditModal(l)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                            aria-label="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(l)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600"
                            aria-label="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Lembaga Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingLembaga ? 'Edit Lembaga' : 'Tambah Lembaga Baru'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lembaga</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
              placeholder="Nama lembaga induk"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kode Lembaga (opsional)</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm font-mono"
              placeholder="KODE"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi (opsional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
              placeholder="Deskripsi lembaga"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">Aktif</label>
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
              {submitting ? 'Menyimpan...' : editingLembaga ? 'Perbarui' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

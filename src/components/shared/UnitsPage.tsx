'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Modal, Button } from '@/components/ui';
import { toast } from 'sonner';

interface Unit {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  _count?: { users: number; transactions: number };
  createdAt: string;
}

interface CreateForm {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [form, setForm] = useState<CreateForm>({
    name: '',
    code: '',
    description: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/units', { headers: { 'Content-Type': 'application/json' } });
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

  const filtered = search
    ? units.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.code.toLowerCase().includes(search.toLowerCase())
      )
    : units;

  const openCreateModal = () => {
    setEditingUnit(null);
    setForm({ name: '', code: '', description: '', isActive: true });
    setShowModal(true);
  };

  const openEditModal = (unit: Unit) => {
    setEditingUnit(unit);
    setForm({
      name: unit.name,
      code: unit.code,
      description: unit.description ?? '',
      isActive: unit.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingUnit ? `/api/units/${editingUnit.id}` : '/api/units';
      const method = editingUnit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan unit');
      }

      const result = await res.json();
      const savedUnit = result.data;

      if (editingUnit) {
        setUnits(units.map((u) => (u.id === savedUnit.id ? savedUnit : u)));
        toast.success('Unit berhasil diperbarui');
      } else {
        setUnits([savedUnit, ...units]);
        toast.success('Unit berhasil ditambahkan');
      }

      setShowModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (unit: Unit) => {
    if (!confirm(`Hapus unit "${unit.name}" (${unit.code})?`)) return;
    try {
      const res = await fetch(`/api/units/${unit.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus');
      }
      toast.success('Unit berhasil dihapus');
      setUnits(units.filter((u) => u.id !== unit.id));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus unit');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Unit</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola unit usaha</p>
        </div>
        <Button variant="default" onClick={openCreateModal}>
          <Plus size={16} />
          <span className="ml-2">Tambah Unit</span>
        </Button>
      </div>

      <div className="relative max-w-md mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari unit..."
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
            <Building2 size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Belum ada unit</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daftar Unit ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nama</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Kode</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{u.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 font-mono">{u.code}</td>
                    <td className="py-3 px-4"><Badge variant={u.isActive ? 'success' : 'outline'}>{u.isActive ? 'Aktif' : 'Non-aktif'}</Badge></td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">{u._count?.users ?? 0}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                          aria-label="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
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
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Unit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingUnit ? 'Edit Unit' : 'Tambah Unit Baru'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Unit</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
              placeholder="Nama unit usaha"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kode Unit</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm font-mono"
              placeholder="KODE"
              required
              maxLength={20}
              disabled={!!editingUnit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi (opsional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
              placeholder="Deskripsi unit"
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
              {submitting ? 'Menyimpan...' : editingUnit ? 'Perbarui' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

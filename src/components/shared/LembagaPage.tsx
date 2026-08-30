'use client';

import { useEffect, useState } from 'react';
import { Building, Plus, Search, Edit, Trash2, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Modal, Button } from '@/components/ui';
import Link from 'next/link';
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

type SortKey = 'name' | 'code' | 'unitCount' | 'userCount' | 'createdAt';
type SortDir = 'asc' | 'desc';

function SortIcon({ dir }: { dir: SortDir }) {
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function LembagaPage() {
  const [lembagas, setLembagas] = useState<Lembaga[]>([]);
  const [unitsByLembaga, setUnitsByLembaga] = useState<Record<string, { id: string; name: string; code: string; userCount: number }[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingLembaga, setEditingLembaga] = useState<Lembaga | null>(null);
  const [form, setForm] = useState<CreateForm>({
    name: '',
    code: '',
    description: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<Lembaga[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const fetchLembagas = async () => {
    setLoading(true);
    try {
      const [res, usersRes] = await Promise.all([
        fetch('/api/lembaga', { headers: { 'Content-Type': 'application/json' } }),
        fetch('/api/users'),
      ]);
      const data = await res.json();
      const fetchedLembagas = data.data ?? [];
      const usersData = await usersRes.json();
      const allUsers = usersData.data ?? [];

      // Fetch units and count users per unit
      const unitsRes = await fetch('/api/units');
      const unitsData = await unitsRes.json();
      const allUnits = unitsData.data ?? [];

      const unitMap: Record<string, { id: string; name: string; code: string; userCount: number }[]> = {};
      fetchedLembagas.forEach((l: any) => {
        const unitsForLembaga = allUnits
          .filter((u: any) => u.lembagaId === l.id)
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            code: u.code ?? '',
            userCount: allUsers.filter((usr: any) => String(usr.unitId) === String(u.id)).length,
          }));
        unitMap[l.id] = unitsForLembaga;
      });

      setLembagas(fetchedLembagas);
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

  const filtered = (search
    ? lembagas.filter((l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.code && l.code.toLowerCase().includes(search.toLowerCase()))
      )
    : lembagas
  ).sort((a, b) => {
    let aVal: any, bVal: any;
    if (sortKey === 'unitCount') {
      aVal = unitsByLembaga[a.id]?.length ?? 0;
      bVal = unitsByLembaga[b.id]?.length ?? 0;
    } else if (sortKey === 'userCount') {
      aVal = unitsByLembaga[a.id]?.reduce((sum, u) => sum + (u.userCount ?? 0), 0) ?? 0;
      bVal = unitsByLembaga[b.id]?.reduce((sum, u) => sum + (u.userCount ?? 0), 0) ?? 0;
    } else if (sortKey === 'name') {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortKey === 'code') {
      aVal = (a.code ?? '').toLowerCase();
      bVal = (b.code ?? '').toLowerCase();
    } else {
      aVal = a.createdAt;
      bVal = b.createdAt;
    }
    if (typeof aVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

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
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus lembaga');
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const hasSelectedItems = selectedIds.size > 0;

  const handleBulkDelete = () => {
    if (filtered.length === 0) return;
    setItemsToDelete(filtered);
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const promises = Array.from(selectedIds).map((id) => {
        return fetch(`/api/lembaga/${id}`, { method: 'DELETE' });
      });
      await Promise.all(promises);
      toast.success(`Berhasil menghapus ${selectedIds.size} lembaga`);
      setLembagas(lembagas.filter((l) => !selectedIds.has(l.id)));
      setSelectedIds(new Set());
      setItemsToDelete([]);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      toast.error('Gagal menghapus beberapa lembaga');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setItemsToDelete([]);
    setShowDeleteConfirm(false);
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
          {/* Bulk Action Bar */}
          {hasSelectedItems && (
            <div className="flex items-center justify-between bg-amber-50 border-b border-amber-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasSelectedItems}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-amber-900">
                  {selectedIds.size} dipilih
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Hapus yang Dipilih
              </Button>
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-lg">Daftar Lembaga ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                  <input
                    type="checkbox"
                    checked={hasSelectedItems}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                  />
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('name')}>
                  Nama Lembaga <SortIcon dir={sortDir === 'desc' && sortKey === 'name' ? 'desc' : 'asc'} />
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('code')}>
                  Kode
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('unitCount')}>
                  Unit <SortIcon dir={sortDir === 'desc' && sortKey === 'unitCount' ? 'desc' : 'asc'} />
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('userCount')}>
                  User <SortIcon dir={sortDir === 'desc' && sortKey === 'userCount' ? 'desc' : 'asc'} />
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const lembagaUnits = unitsByLembaga[l.id] ?? [];
                  const totalUsers = lembagaUnits.reduce((sum, u) => sum + (u.userCount ?? 0), 0);
                  return (
                    <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(l.id)}
                          onChange={() => toggleSelectItem(l.id)}
                          className="h-4 w-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{l.name}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 font-mono">{l.code ?? '-'}</td>
                      <td className="py-3 px-4"><Badge variant={l.isActive ? 'success' : 'outline'}>{l.isActive ? 'Aktif' : 'Non-aktif'}</Badge></td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">
                      <Link href={`/dashboard/superadmin/lembaga/${l.id}`} className="hover:text-brand-600 font-medium">
                        {lembagaUnits.length} unit
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-600">
                      <Link href={`/dashboard/superadmin/lembaga/${l.id}`} className="hover:text-brand-600 font-medium">
                        {totalUsers} user
                      </Link>
                    </td>
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

      {/* Bulk Delete Confirmation Modal */}
      <Modal open={showDeleteConfirm} onClose={cancelDelete} title="Konfirmasi Hapus Bulk">
        <div className="space-y-4">
          <p className="text-slate-600">
            Anda yakin ingin menghapus <strong>{itemsToDelete.length}</strong> lembaga yang dipilih?
            <br />
            <span className="text-sm text-slate-500">Tindakan ini tidak dapat dibatalkan.</span>
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={cancelDelete}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
              disabled={isDeleting}
            >
              Batal
            </button>
            <Button
              variant="destructive"
              loading={isDeleting}
              disabled={isDeleting}
              onClick={confirmBulkDelete}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus Semua'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

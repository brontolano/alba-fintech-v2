'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Search, Edit, Trash2, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Modal, Button, Select } from '@/components/ui';
import { toast } from 'sonner';

type UserRole = 'SUPERADMIN' | 'PIMPINAN' | 'MANAGER' | 'STAFF';

interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  unitId?: string;
  isActive: boolean;
  createdAt: string;
}

interface Unit {
  id: string;
  name: string;
  code: string;
}

interface CreateForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  unitId: string;
  isActive: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  PIMPINAN: 'Pimpinan',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

const ROLE_BADGE: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  SUPERADMIN: 'danger',
  PIMPINAN: 'warning',
  MANAGER: 'info',
  STAFF: 'success',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [form, setForm] = useState<CreateForm>({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    unitId: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      setUsers(data.data ?? []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Gagal memuat user');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units', { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUnits();
  }, []);

  const filtered = search
    ? users.filter((u) =>
        (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', role: 'STAFF', unitId: '', isActive: true });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name ?? '',
      email: user.email,
      password: '',
      role: user.role,
      unitId: user.unitId ?? '',
      isActive: user.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser ? form : { ...form, password: form.password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan user');
      }

      const result = await res.json();
      const savedUser = result.data;

      if (editingUser) {
        setUsers(users.map((u) => (u.id === savedUser.id ? savedUser : u)));
        toast.success('User berhasil diperbarui');
      } else {
        setUsers([savedUser, ...users]);
        toast.success('User berhasil ditambahkan');
      }

      setShowModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Hapus user "${user.name ?? user.email}"?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus');
      }
      toast.success('User berhasil dihapus');
      setUsers(users.filter((u) => u.id !== user.id));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen User</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola pengguna sistem</p>
        </div>
        <Button variant="default" onClick={openCreateModal}>
          <Plus size={16} />
          <span className="ml-2">Tambah User</span>
        </Button>
      </div>

      <div className="relative max-w-md mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Belum ada user</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daftar User ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nama</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{u.name ?? u.email}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{u.email}</td>
                    <td className="py-3 px-4"><Badge variant={ROLE_BADGE[u.role] ?? 'default'}>{ROLE_LABEL[u.role] ?? u.role}</Badge></td>
                    <td className="py-3 px-4"><Badge variant={u.isActive ? 'success' : 'outline'}>{u.isActive ? 'Aktif' : 'Non-aktif'}</Badge></td>
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

      {/* Create/Edit User Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit User' : 'Tambah User Baru'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                placeholder="Nama lengkap"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                placeholder="user@email.com"
                required
                disabled={!!editingUser}
              />
            </div>
          </div>

          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                  placeholder="Password (min. 6 karakter)"
                  required
                  minLength={6}
                />
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                {Object.entries(ROLE_LABEL).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <Select value={form.unitId} onValueChange={(v) => setForm({ ...form, unitId: v })}>
                <option value="">Tanpa Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                ))}
              </Select>
            </div>
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
              {submitting ? 'Menyimpan...' : editingUser ? 'Perbarui' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

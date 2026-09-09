'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: 'SUPERADMIN' | 'PIMPINAN' | 'MANAGER' | 'STAFF';
  isActive: boolean;
  unitId: string | null;
  lembagaId: string | null;
  unit?: { id: string; name: string; code: string } | null;
  lembaga?: { id: string; name: string; code: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface Unit {
  id: string;
  name: string;
  code: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF' as 'SUPERADMIN' | 'PIMPINAN' | 'MANAGER' | 'STAFF',
    unitId: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setUsers(data.data ?? []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Gagal memuat pengguna');
    } finally {
      setLoading(false);
    }
  };

  // Fetch units
  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units', {
        headers: { 'Content-Type': 'application/json' },
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          password: form.password,
          unitId: form.unitId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat pengguna');
      }

      const result = await res.json();
      toast.success('Pengguna berhasil dibuat');
      setUsers([result.data, ...users]);
      setShowModal(false);
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'STAFF',
        unitId: '',
        isActive: true,
      });
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat pengguna');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return <ShieldCheck size={18} className="text-red-500" />;
      case 'PIMPINAN':
        return <ShieldAlert size={18} className="text-blue-500" />;
      case 'MANAGER':
        return <ShieldHalf size={18} className="text-purple-500" />;
      case 'STAFF':
        return <Shield size={18} className="text-green-500" />;
      default:
        return <Shield size={18} className="text-slate-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-red-100 text-red-700';
      case 'PIMPINAN':
        return 'bg-blue-100 text-blue-700';
      case 'MANAGER':
        return 'bg-purple-100 text-purple-700';
      case 'STAFF':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Pengguna</h1>
          <p className="text-slate-600 mt-1">
            Kelola pengguna aplikasi keuangan
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus size={18} />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Cari pengguna..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Tidak ada pengguna ditemukan</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">#</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nama</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Role</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Unit</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">
                      {user.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-slate-600">
                      {user.unit?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {user.isActive ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-1">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Tambah Pengguna Baru</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    placeholder="nama@contoh.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'SUPERADMIN' | 'PIMPINAN' | 'MANAGER' | 'STAFF' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                >
                  <option value="STAFF">STAFF - Staff Unit</option>
                  <option value="MANAGER">MANAGER - Manager Unit</option>
                  <option value="PIMPINAN">PIMPINAN - Pimpinan Pondok</option>
                  <option value="SUPERADMIN">SUPERADMIN - Administrator Sistem</option>
                </select>
              </div>

              {form.role === 'STAFF' || form.role === 'MANAGER' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                  <select
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  >
                    <option value="">Pilih Unit</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <ShieldCheck size={20} className="text-blue-500" />
                  <span className="text-sm text-slate-700">
                    {form.role === 'PIMPINAN'
                      ? 'Pimpinan akan memiliki akses ke seluruh unit'
                      : 'SuperAdmin memiliki akses penuh ke sistem'}
                  </span>
                </div>
              )}

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
                  disabled={submitting || !form.name || !form.email || !form.password}
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

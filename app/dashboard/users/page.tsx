'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  const [search, setSearch] = useState('');

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

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengguna ini? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      const res = await fetch(`/api/users/${id}`,
      {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus pengguna');
      }
      toast.success('Pengguna berhasil dihapus');
      setUsers(users.filter((u) => u.id !== id));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus pengguna');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
        <Link
          href="/dashboard/users/create"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus size={18} />
          <span>Tambah Pengguna</span>
        </Link>
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
                        <Link
                          href={`/dashboard/users/${user.id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(user.id)}
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
    </div>
  );
}

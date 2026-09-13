'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Save,
  Users,
  Mail,
  Lock,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  params: Promise<{ id: string }>;
}

interface Lembaga {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
  code: string;
}

export default function EditUserPage({ params }: Props) {
  const router = useRouter();
  const userId = use(params).id;
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;

  const [units, setUnits] = useState<Unit[]>([]);
  const [lembagas, setLembagas] = useState<Lembaga[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF' as 'SUPERADMIN' | 'PIMPINAN' | 'MANAGER' | 'STAFF',
    unitId: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (role && role !== 'SUPERADMIN') {
      toast.error('Akses ditolak. Hanya SuperAdmin yang dapat mengedit pengguna.');
      router.push('/dashboard/users');
    }
  }, [role, router]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Status ${res.status}: ${text.substring(0, 100)}`);
      }
      if (!res.ok) throw new Error(data.error || 'Pengguna tidak ditemukan');
      const user = data.data;
      setForm({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'STAFF',
        unitId: user.unitId || '',
        isActive: user.isActive ?? true,
      });
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat pengguna');
      router.push('/dashboard/users');
    } finally {
      setLoading(false);
    }
  };

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
    fetchUser();
    fetchUnits();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Harap isi semua field yang wajib');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          ...(form.password && { password: form.password }),
          role: form.role,
          unitId: form.unitId || null,
          isActive: form.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui pengguna');
      }
      toast.success('Pengguna berhasil diperbarui');
      router.push('/dashboard/users');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui pengguna');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SUPERADMIN': return <ShieldCheck size={16} className="text-red-500" />;
      case 'PIMPINAN': return <ShieldCheck size={16} className="text-blue-500" />;
      case 'MANAGER': return <Shield size={16} className="text-purple-500" />;
      default: return <Shield size={16} className="text-green-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => router.push('/dashboard/users')} className="mr-4 p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Edit Pengguna</h1>
            <p className="text-slate-600 mt-1">Memuat data pengguna...</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={() => router.push('/dashboard/users')} className="mr-4 p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Edit Pengguna</h1>
            <p className="text-slate-600 mt-1">
              Perbarui informasi: {form.name}
            </p>
          </div>
        </div>
        {getRoleIcon(form.role)}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama Lengkap *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                placeholder="Nama lengkap"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                placeholder="nama@contoh.com"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password Baru
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                placeholder="Kosongkan jika tidak ingin mengganti"
                minLength={6}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Minimal 6 karakter. Kosongkan untuk mempertahankan password lama.</p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Role *
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'SUPERADMIN' | 'PIMPINAN' | 'MANAGER' | 'STAFF' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
              required
            >
              <option value="STAFF">STAFF - Staff Unit</option>
              <option value="MANAGER">MANAGER - Manager Unit</option>
              <option value="PIMPINAN">PIMPINAN - Pimpinan Pondok</option>
              <option value="SUPERADMIN">SUPERADMIN - Administrator Sistem</option>
            </select>
          </div>

          {/* Unit */}
          {(form.role === 'STAFF' || form.role === 'MANAGER') ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unit
              </label>
              <select
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
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

          {/* Active Status */}
          <div className="md:col-span-2 flex items-center pt-2 space-x-3">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              Pengguna aktif
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard/users')}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || !form.name || !form.email}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Lock size={16} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Lock size={16} />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

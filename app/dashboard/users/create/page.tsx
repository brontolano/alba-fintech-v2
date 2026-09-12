'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ArrowLeft,
  Save,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface Unit {
  id: string;
  name: string;
  code: string;
}

export default function CreateUserPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF' as 'SUPERADMIN' | 'PIMPINAN' | 'MANAGER' | 'STAFF',
    unitId: '',
    isActive: true,
  });

  // Fetch units for dropdown
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
    fetchUnits();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      toast.error('Harap isi semua field yang wajib');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          unitId: form.unitId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat pengguna');
      }

      const result = await res.json();
      toast.success('Pengguna berhasil dibuat');
      router.push(`/dashboard/users`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat pengguna');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.push('/dashboard/users')}
          className="mr-4 p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tambah Pengguna Baru</h1>
          <p className="text-slate-600 mt-1">
            Buat akun pengguna baru untuk aplikasi keuangan
          </p>
        </div>
      </div>

      {/* Form */}
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
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              placeholder="nama@contoh.com"
              required
            />
          </div>

          {/* Password */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password *
            </label>
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

          {/* Unit Selection */}
          {(form.role === 'STAFF' || form.role === 'MANAGER') ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unit *
              </label>
              <select
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
                required={form.role === 'STAFF' || form.role === 'MANAGER'}
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
            disabled={submitting || !form.name || !form.email || !form.password}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Save size={16} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Simpan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

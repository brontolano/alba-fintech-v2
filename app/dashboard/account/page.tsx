'use client';

import { useState, useEffect } from 'react';
import { User, Save, Shield, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  unitId: string | null;
  lembagaId: string | null;
  isActive: boolean;
  createdAt: string;
  unit?: { id: string; name: string; code: string } | null;
  lembaga?: { id: string; name: string; code: string } | null;
}

export default function AccountPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/profile');
      const data = await res.json();
      setProfile(data.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast.error('Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setUpdating(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui profil');
      }

      toast.success('Profil berhasil diperbarui');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui profil');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error('Harap isi semua field password');
      return;
    }

    if (passwords.new !== passwords.confirm) {
      toast.error('Password baru tidak cocok');
      return;
    }

    if (passwords.new.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengganti password');
      }

      toast.success('Password berhasil diganti');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengganti password');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Akun Saya</h1>
        <p className="text-slate-600 mt-1">
          Kelola profil dan pengaturan akun Anda
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-slate-100 rounded-xl"></div>
          <div className="h-20 bg-slate-100 rounded-xl"></div>
          <div className="h-20 bg-slate-100 rounded-xl"></div>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center">
                <User size={28} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {profile.name || 'Pengguna'}
                </h2>
                <p className="text-slate-600">{profile.email}</p>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {profile.role}
                </span>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={profile.name || ''}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={profile.unit?.name || 'Tidak memiliki unit'}
                  disabled
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm text-slate-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{updating ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Lock size={20} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Ganti Password
                </h2>
                <p className="text-sm text-slate-600">
                  Perbarui password akun Anda
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password Saat Ini
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password Baru
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.new}
                  onChange={(e) =>
                    setPasswords({ ...passwords, new: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="showPassword" className="text-sm text-slate-700">
                  Tampilkan password
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 mt-4">
              <button
                onClick={handleChangePassword}
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                <Lock size={16} />
                <span>
                  {updating ? 'Mengganti...' : 'Ganti Password'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <User size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Profil tidak ditemukan</p>
        </div>
      )}
    </div>
  );
}

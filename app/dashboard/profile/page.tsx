'use client';

import { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Shield, UserCheck, Calendar, MapPin, User, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  role: string;
  unitId: string | null;
  lembagaId: string | null;
  isActive: boolean;
  createdAt: string;
  unit?: { id: string; name: string; code: string } | null;
  lembaga?: { id: string; name: string; code: string } | null;
}

interface ProfileData {
  profile: UserProfile | null;
}

const roleLabels: Record<string, { label: string; icon: string; color: string }> = {
  SUPERADMIN: { label: 'Super Admin', icon: '👑', color: 'purple' },
  PIMPINAN: { label: 'Pimpinan', icon: '🏢', color: 'emerald' },
  MANAGER: { label: 'Manager', icon: '🧑‍💼', color: 'blue' },
  STAFF: { label: 'Staff', icon: '👤', color: 'slate' },
};

const roleColors = {
  purple: 'bg-purple-100 text-purple-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  slate: 'bg-slate-100 text-slate-700',
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData>({
    profile: null,
  });
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const profileRes = await fetch('/api/users/profile');
      const profileData = await profileRes.json();

      setData({
        profile: profileData.data,
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Gagal memuat data profil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Hanya gambar yang diizinkan');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5MB');
      return;
    }

    setPreviewImage(URL.createObjectURL(file));
    setSelectedImage(file);
  };

  const handleSaveImage = async () => {
    if (!selectedImage) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const res = await fetch('/api/users/profile/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengunggah gambar');
      }

      const result = await res.json();
      setData((prev) => ({
        ...prev,
        profile: result.data,
      }));
      toast.success('Foto profil berhasil diperbarui');
      URL.revokeObjectURL(previewImage || '');
      setPreviewImage(null);
      setSelectedImage(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah gambar');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    URL.revokeObjectURL(previewImage || '');
    setPreviewImage(null);
    setSelectedImage(null);
  };

  const { profile } = data;
  const roleInfo = profile ? (roleLabels[profile.role as keyof typeof roleLabels] || roleLabels.STAFF) : roleLabels.STAFF;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded-xl w-1/3"></div>
          <div className="h-64 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <UserIcon size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Profil Tidak Ditemukan</h3>
          <p className="text-slate-500">Tidak dapat memuat data profil pengguna</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Detail Profil</h1>
        <p className="text-slate-600 mt-1">Lihat dan Kelola Informasi Akun Anda</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar Section */}
            <div className="relative">
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center overflow-hidden">
                {previewImage ? (
                  <Image
                    src={previewImage}
                    alt="Preview"
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                ) : profile.image ? (
                  <Image
                    src={profile.image}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {profile.name?.[0] || 'U'}
                  </span>
                )}
              </div>
              {previewImage && (
                <>
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 cursor-pointer hover:bg-red-600 transition shadow-lg"
                    title="Batal pilih"
                  >
                    <X size={12} />
                  </button>
                </>
              )}
              <label
                htmlFor="profile-image"
                className="absolute -bottom-2 -right-2 bg-emerald-600 text-white rounded-full p-1.5 cursor-pointer hover:bg-emerald-700 transition shadow-lg"
                title="Ganti foto"
              >
                <Camera size={14} />
                <input
                  type="file"
                  id="profile-image"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Info Section */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-800">
                  {profile.name || 'Pengguna'}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${roleColors[roleInfo.color as keyof typeof roleColors]}`}
                >
                  {roleInfo.icon} {roleInfo.label}
                </span>
              </div>
              <p className="text-slate-600 mb-3">{profile.email}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <User size={16} />
                  <span>{profile.role === 'SUPERADMIN' ? 'Super Admin' : profile.role === 'PIMPINAN' ? 'Pimpinan' : profile.role === 'MANAGER' ? 'Manager' : 'Staff'}</span>
                </div>
                {profile.unit && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={16} />
                    <span>{profile.unit.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar size={16} />
                  <span>Bergabung {new Date(profile.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}</span>
                </div>
                {profile.isActive === false && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Shield size={16} className="text-amber-500" />
                    <span>Akun Non-Aktif</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {previewImage && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-3">
                Foto baru dipilih. Klik &quot;Simpan Gambar&quot; untuk mengunggah.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveImage}
                  disabled={uploadingImage}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <Camera size={16} />
                  <span>{uploadingImage ? 'Mengunggah...' : 'Simpan Gambar'}</span>
                </button>
                <button
                  onClick={handleRemoveImage}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Tindakan Cepat</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/dashboard/account'}
              className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <User size={20} className="text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800">Edit Profil</p>
                <p className="text-xs text-slate-500">UbahNama Email</p>
              </div>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/account'}
              className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail size={20} className="text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800">Ganti Password</p>
                <p className="text-xs text-slate-500">Amankan akun Anda</p>
              </div>
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/settings'}
              className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield size={20} className="text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800">Pengaturan</p>
                <p className="text-xs text-slate-500">Privasi dan notifikasi</p>
              </div>
            </button>
          </div>
        </div>

        {/* Account Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Detail Akun</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3">Informasi Pengguna</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Nama</p>
                  <p className="text-slate-800">{profile.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Email</p>
                  <p className="text-slate-800">{profile.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Role</p>
                  <p className="text-slate-800 capitalize">{roleInfo.label.toLowerCase()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Status</p>
                  <span className={`inline px-2 py-0.5 rounded-full text-xs font-medium ${
                    profile.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {profile.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3">Unit & Lembaga</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Unit</p>
                  <p className="text-slate-800">
                    {profile.unit ? `${profile.unit.name} (${profile.unit.code})` : 'Tidak ada unit'}
                  </p>
                </div>
                {profile.lembaga && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Lembaga</p>
                    <p className="text-slate-800">{profile.lembaga.name} ({profile.lembaga.code})</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
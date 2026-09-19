"use client";

import { useState, useEffect } from "react";
import {
  User as UserIcon,
  Mail,
  Shield,
  UserCheck,
  MapPin,
  User,
  Camera,
  X,
  LogOut,
  Building2,
  CalendarDays,
  KeyRound,
  Settings2,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import Image from "next/image";

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

const roleLabels: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  SUPERADMIN: {
    label: "Super Admin",
    icon: <UserCheck className="w-3.5 h-3.5" />,
    color: "primary",
  },
  PIMPINAN: {
    label: "Pimpinan",
    icon: <Shield className="w-3.5 h-3.5" />,
    color: "primary",
  },
  MANAGER: {
    label: "Manager",
    icon: <User className="w-3.5 h-3.5" />,
    color: "primary",
  },
  STAFF: {
    label: "Staff",
    icon: <User className="w-3.5 h-3.5" />,
    color: "primary",
  },
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
      const profileRes = await fetch("/api/users/profile");
      const profileData = await profileRes.json();

      setData({
        profile: profileData.data,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Gagal memuat data profil");
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

    if (!file.type.startsWith("image/")) {
      toast.error("Hanya gambar yang diizinkan");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB");
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
      formData.append("image", selectedImage);

      const res = await fetch("/api/users/profile/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengunggah gambar");
      }

      const result = await res.json();
      setData((prev) => ({
        ...prev,
        profile: result.data,
      }));
      toast.success("Foto profil berhasil diperbarui");
      URL.revokeObjectURL(previewImage || "");
      setPreviewImage(null);
      setSelectedImage(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah gambar");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    URL.revokeObjectURL(previewImage || "");
    setPreviewImage(null);
    setSelectedImage(null);
  };

  const { profile } = data;
  const roleInfo = profile
    ? roleLabels[profile.role as keyof typeof roleLabels] || roleLabels.STAFF
    : roleLabels.STAFF;

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-1/3 rounded-xl bg-muted" />
          <div className="h-64 rounded-[22px] border border-border bg-card/80" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <UserIcon size={32} className="text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Profil Tidak Ditemukan
          </h3>
          <p className="text-muted-foreground">
            Tidak dapat memuat data profil pengguna
          </p>
        </div>
      </div>
    );
  }

  const joinedDate = new Date(profile.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-full bg-background px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Ruang akun
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Detail Profil
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Kelola identitas dan akses Anda di ALBA Finance dalam satu tempat.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full ${profile.isActive ? "bg-emerald-500" : "bg-destructive"}`}
            />
            {profile.isActive ? "Akun aktif" : "Akun nonaktif"}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_40px_rgba(16,24,40,0.06)]">
            <div className="relative bg-gradient-to-br from-primary via-primary to-slate-900 px-6 pb-7 pt-6 text-primary-foreground sm:px-8">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full border-[18px] border-white/10" />
              <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                Profil pengguna
              </p>
              <div className="relative mt-7 flex flex-col gap-5 sm:flex-row sm:items-end">
                <div className="relative shrink-0">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-4 border-white/20 bg-white/15 shadow-xl backdrop-blur-sm">
                    {previewImage ? (
                      <Image
                        src={previewImage}
                        alt="Preview foto profil"
                        width={112}
                        height={112}
                        className="h-full w-full object-cover"
                      />
                    ) : profile.image ? (
                      <Image
                        src={profile.image}
                        alt={`Foto profil ${profile.name || "pengguna"}`}
                        width={112}
                        height={112}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl font-bold text-white">
                        {profile.name?.[0] || "U"}
                      </span>
                    )}
                  </div>
                  {previewImage && (
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition hover:scale-105"
                      title="Batal pilih"
                      aria-label="Batal pilih foto"
                    >
                      <X size={15} />
                    </button>
                  )}
                  <label
                    htmlFor="profile-image"
                    className="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-primary bg-accent text-accent-foreground shadow-lg transition hover:scale-105"
                    title="Ganti foto"
                  >
                    <Camera size={16} />
                    <input
                      type="file"
                      id="profile-image"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="min-w-0 pb-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-2xl font-bold sm:text-3xl">
                      {profile.name || "Pengguna"}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      {roleInfo.icon}
                      {roleInfo.label}
                    </span>
                  </div>
                  <p className="flex items-center gap-2 truncate text-sm text-white/70">
                    <Mail size={15} />
                    {profile.email}
                  </p>
                </div>
              </div>
            </div>

            {previewImage && (
              <div className="flex flex-col gap-3 border-b border-border bg-accent/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <p className="text-sm text-foreground">
                  Foto baru siap disimpan.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveImage}
                    disabled={uploadingImage}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Camera size={15} />
                    {uploadingImage ? "Mengunggah..." : "Simpan foto"}
                  </button>
                  <button
                    onClick={handleRemoveImage}
                    className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-0 sm:grid-cols-3">
              <div className="border-b border-border p-6 sm:border-b-0 sm:border-r sm:px-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Peran
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Shield size={17} className="text-primary" />
                  {roleInfo.label}
                </div>
              </div>
              <div className="border-b border-border p-6 sm:border-b-0 sm:border-r sm:px-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unit kerja
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin size={17} className="text-primary" />
                  {profile.unit?.name || "Tanpa unit"}
                </div>
              </div>
              <div className="p-6 sm:px-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bergabung
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarDays size={17} className="text-primary" />
                  {joinedDate}
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-border bg-card p-6 shadow-[0_12px_40px_rgba(16,24,40,0.06)] sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Navigasi
                </p>
                <h3 className="mt-1 text-xl font-bold text-foreground">
                  Aksi akun
                </h3>
              </div>
              <ArrowUpRight size={20} className="text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <button
                onClick={() => (window.location.href = "/dashboard/account")}
                className="group flex min-h-14 w-full items-center gap-3 rounded-xl border border-border px-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User size={18} />
                </span>
                <span className="flex-1">
                  <strong className="block text-sm text-foreground">
                    Edit profil
                  </strong>
                  <small className="text-xs text-muted-foreground">
                    Nama dan informasi akun
                  </small>
                </span>
                <ArrowUpRight
                  size={16}
                  className="text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard/account")}
                className="group flex min-h-14 w-full items-center gap-3 rounded-xl border border-border px-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
                  <KeyRound size={18} />
                </span>
                <span className="flex-1">
                  <strong className="block text-sm text-foreground">
                    Ganti password
                  </strong>
                  <small className="text-xs text-muted-foreground">
                    Perbarui keamanan akun
                  </small>
                </span>
                <ArrowUpRight
                  size={16}
                  className="text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard/settings")}
                className="group flex min-h-14 w-full items-center gap-3 rounded-xl border border-border px-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Settings2 size={18} />
                </span>
                <span className="flex-1">
                  <strong className="block text-sm text-foreground">
                    Pengaturan
                  </strong>
                  <small className="text-xs text-muted-foreground">
                    Preferensi aplikasi
                  </small>
                </span>
                <ArrowUpRight
                  size={16}
                  className="text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </button>
            </div>
            <button
              onClick={() => signOut()}
              className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/25 text-sm font-semibold text-destructive transition hover:bg-destructive/5"
            >
              <LogOut size={16} />
              Keluar dari sesi
            </button>
          </aside>
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[0_12px_40px_rgba(16,24,40,0.04)] sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Ringkasan identitas
              </p>
              <h3 className="mt-1 text-xl font-bold text-foreground">
                Detail akun
              </h3>
            </div>
            <CheckCircle2
              size={22}
              className={
                profile.isActive ? "text-emerald-500" : "text-destructive"
              }
            />
          </div>
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nama lengkap
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {profile.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">
                  {profile.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status akun
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span
                    className={`h-2 w-2 rounded-full ${profile.isActive ? "bg-emerald-500" : "bg-destructive"}`}
                  />
                  {profile.isActive ? "Aktif" : "Nonaktif"}
                </p>
              </div>
            </div>
            <div className="space-y-5 border-t border-border pt-5 md:border-l md:border-t-0 md:pl-10 md:pt-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unit
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Building2 size={16} className="text-primary" />
                  {profile.unit
                    ? `${profile.unit.name} (${profile.unit.code})`
                    : "Tidak ada unit"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Lembaga
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {profile.lembaga
                    ? `${profile.lembaga.name} (${profile.lembaga.code})`
                    : "Tidak ada lembaga"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Akses
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {roleInfo.label}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

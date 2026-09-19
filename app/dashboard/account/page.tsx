"use client";

import { useState, useEffect } from "react";
import { Save, Lock, User as UserIcon, Camera, X } from "lucide-react";
import { toast } from "sonner";
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

export default function AccountPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [units, setUnits] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/profile");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat profil");
      setProfile(data.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      toast.error("Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/units");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat unit");
      setUnits(data.data ?? []);
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchUnits();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setUpdating(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memperbarui profil");
      }

      toast.success("Profil berhasil diperbarui");
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui profil");
    } finally {
      setUpdating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya gambar yang diizinkan");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB");
      return;
    }

    // Preview
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

      const data = await res.json();
      setProfile(data.data);
      toast.success("Foto profil berhasil diperbarui");

      // Reset preview
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
    setPreviewImage(null);
    setSelectedImage(null);
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error("Harap isi semua field password");
      return;
    }

    if (passwords.new !== passwords.confirm) {
      toast.error("Password baru tidak cocok");
      return;
    }

    if (passwords.new.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengganti password");
      }

      toast.success("Password berhasil diganti");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err: any) {
      toast.error(err.message || "Gagal mengganti password");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Akun Saya
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola profil dan pengaturan akun Anda
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-20 rounded-xl bg-muted"></div>
          <div className="h-20 rounded-xl bg-muted"></div>
          <div className="h-20 rounded-xl bg-muted"></div>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          <div className="rounded-[22px] border border-border bg-card/90 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
                  {previewImage ? (
                    <Image
                      src={previewImage}
                      alt="Preview"
                      width={64}
                      height={64}
                      className="object-cover"
                    />
                  ) : profile.image ? (
                    <Image
                      src={profile.image}
                      alt="Profile"
                      width={64}
                      height={64}
                      className="object-cover"
                    />
                  ) : (
                    <UserIcon size={28} className="text-primary" />
                  )}
                </div>
                <label
                  htmlFor="profile-image"
                  className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary p-1 text-primary-foreground transition hover:bg-primary/90"
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
                {previewImage && (
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -right-2 -top-2 cursor-pointer rounded-full bg-destructive p-1 text-destructive-foreground transition hover:bg-destructive/90"
                    title="Batal pilih"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {profile.name || "Pengguna"}
                </h2>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      profile.role === "SUPERADMIN"
                        ? "bg-purple-100 text-purple-700"
                        : profile.role === "PIMPINAN"
                          ? "bg-emerald-100 text-emerald-700"
                          : profile.role === "MANAGER"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {profile.role === "SUPERADMIN"
                      ? "👑 Super Admin"
                      : profile.role === "PIMPINAN"
                        ? "🏢 Pimpinan"
                        : profile.role === "MANAGER"
                          ? "🧑‍💼 Manager"
                          : "👤 Staff"}
                  </span>
                  {profile.unit && (
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      📍 {profile.unit.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {previewImage && (
              <div className="mb-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
                <p className="mb-2 text-sm text-muted-foreground">
                  Foto baru dipilih. Klik &quot;Simpan Gambar&quot; untuk
                  mengunggah.
                </p>
                <button
                  onClick={handleSaveImage}
                  disabled={uploadingImage}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  <Camera size={16} />
                  <span>
                    {uploadingImage ? "Mengunggah..." : "Simpan Gambar"}
                  </span>
                </button>
                <button
                  onClick={handleRemoveImage}
                  className="ml-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-muted"
                >
                  Batal
                </button>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={profile.name || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Unit
                </label>
                {profile.role === "SUPERADMIN" ? (
                  <select
                    value={profile.unitId || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, unitId: e.target.value || null })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="">Pilih Unit (Tanpa Unit)</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={profile.unit?.name || "Tidak memiliki unit"}
                    disabled
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground"
                  />
                )}
              </div>

              <div className="border-t border-border pt-4">
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{updating ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-[22px] border border-border bg-card/90 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <Lock size={20} className="text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Ganti Password
                </h2>
                <p className="text-sm text-muted-foreground">
                  Perbarui password akun Anda
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Password Saat Ini
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Password Baru
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwords.new}
                  onChange={(e) =>
                    setPasswords({ ...passwords, new: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Konfirmasi Password Baru
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <label
                  htmlFor="showPassword"
                  className="text-sm text-foreground"
                >
                  Tampilkan password
                </label>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <button
                onClick={handleChangePassword}
                disabled={updating}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                <Lock size={16} />
                <span>{updating ? "Mengganti..." : "Ganti Password"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center">
          <UserIcon size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Profil tidak ditemukan</p>
        </div>
      )}
    </div>
  );
}

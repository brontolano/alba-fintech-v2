"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, ArrowLeft, Save, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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
    name: "",
    email: "",
    password: "",
    role: "STAFF" as "SUPERADMIN" | "PIMPINAN" | "MANAGER" | "STAFF",
    unitId: "",
    isActive: true,
  });

  // Fetch units for dropdown
  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/units", {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      toast.error("Harap isi semua field yang wajib");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          unitId: form.unitId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal membuat pengguna");
      }

      const result = await res.json();
      toast.success("Pengguna berhasil dibuat");
      router.push(`/dashboard/users`);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pengguna");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/users")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Tambah Pengguna Baru
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Buat akun pengguna baru untuk aplikasi keuangan
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-[22px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Nama Lengkap *
            </label>
            <div className="relative">
              <Users
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pl-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="Nama lengkap"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="nama@contoh.com"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Password *
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Role *
            </label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value as
                    "SUPERADMIN" | "PIMPINAN" | "MANAGER" | "STAFF",
                })
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              required
            >
              <option value="STAFF">STAFF - Staff Unit</option>
              <option value="MANAGER">MANAGER - Manager Unit</option>
              <option value="PIMPINAN">PIMPINAN - Pimpinan Pondok</option>
              <option value="SUPERADMIN">
                SUPERADMIN - Administrator Sistem
              </option>
            </select>
          </div>

          {/* Unit Selection */}
          {form.role === "STAFF" || form.role === "MANAGER" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Unit *
              </label>
              <select
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                required={form.role === "STAFF" || form.role === "MANAGER"}
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
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              <ShieldCheck size={18} className="text-primary" />
              <span>
                {form.role === "PIMPINAN"
                  ? "Pimpinan akan memiliki akses ke seluruh unit"
                  : "SuperAdmin memiliki akses penuh ke sistem"}
              </span>
            </div>
          )}

          <div className="md:col-span-2 flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <label htmlFor="isActive" className="text-sm text-muted-foreground">
              Pengguna aktif
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard/users")}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || !form.name || !form.email || !form.password}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
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

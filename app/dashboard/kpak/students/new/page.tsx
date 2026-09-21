"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePageGuard } from "@/lib/use-page-guard";

export default function NewStudentPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      ((u?.role === "MANAGER" || u?.role === "STAFF") &&
        u?.unitIsRetail !== true),
  });

  const router = useRouter();
  const [form, setForm] = useState({
    studentNumber: "",
    name: "",
    className: "",
    cardUid: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentNumber.trim() || !form.name.trim()) {
      toast.error("NIS dan Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/savings/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: form.studentNumber.trim(),
          name: form.name.trim(),
          className: form.className.trim() || undefined,
          cardUid: form.cardUid.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mendaftarkan santri");
      toast.success("Santri dan rekening tabungan berhasil dibuat");
      router.push(`/dashboard/kpak/students/${json.data.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/kpak/students"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
          aria-label="Kembali"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Santri Baru</h1>
          <p className="text-sm text-muted-foreground">
            Daftarkan santri — rekening tabungan dibuat otomatis
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border bg-card p-5"
      >
        <div>
          <label className="mb-1 block text-xs font-medium">
            Nomor Induk Santri (NIS) *
          </label>
          <input
            type="text"
            value={form.studentNumber}
            onChange={(e) =>
              setForm({ ...form, studentNumber: e.target.value })
            }
            placeholder="Contoh: 2024001"
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Nama Lengkap *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama lengkap santri"
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Kelas</label>
          <input
            type="text"
            value={form.className}
            onChange={(e) => setForm({ ...form, className: e.target.value })}
            placeholder="Contoh: VII-A"
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">
            UID Kartu NFC{" "}
            <span className="font-normal text-muted-foreground">
              (bisa diisi belakangan oleh Manager)
            </span>
          </label>
          <input
            type="text"
            value={form.cardUid}
            onChange={(e) => setForm({ ...form, cardUid: e.target.value })}
            placeholder="Contoh: AB:CD:EF:12"
            className="w-full rounded-lg border bg-background px-3 py-2.5 font-mono text-sm"
          />
        </div>
        <button
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <UserPlus size={16} />
          )}
          {saving ? "Menyimpan..." : "Simpan Santri"}
        </button>
      </form>
    </div>
  );
}

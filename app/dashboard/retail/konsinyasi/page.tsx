"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UserPlus,
  Loader2,
  ChevronRight,
  Phone,
  Package,
  Plus,
  Pencil,
  Power,
  Trash2,
  X,
  Save,
} from "lucide-react";

type Owner = {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  itemCount?: number;
  whatsappVerified?: boolean | null;
};

export default function KonsinyasiPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/consignments/owners");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memuat UMKM");
      setOwners(body.data || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/consignments/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan");
      setForm({ name: "", phone: "", address: "" });
      setShowForm(false);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, payload: any) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/retail/consignments/owners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan");
      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Hapus "${name}"? Barang titipannya ikut dikeluarkan.`))
      return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/retail/consignments/owners/${id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menghapus");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-3 overflow-x-hidden p-3 sm:p-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">Titipan UMKM</h1>
          <p className="text-xs text-muted-foreground">
            {owners.length} UMKM · ketuk untuk detail
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Tutup" : "UMKM"}
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-600">
          {err}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={create}
          className="space-y-2 rounded-xl border bg-card p-3"
        >
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama UMKM (mis. Ibu Siti)"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="No. WA (08…)"
              inputMode="tel"
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Alamat (opsional)"
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !form.name.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UserPlus size={14} />
            )}
            Simpan
          </button>
        </form>
      )}

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">
          <Loader2 size={18} className="mx-auto animate-spin" />
        </div>
      ) : owners.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm font-medium">Belum ada UMKM</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Daftarkan pemilik titipan untuk mulai menerima barang.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {owners.map((o) =>
            editing === o.id ? (
              <div
                key={o.id}
                className="space-y-2 rounded-xl border bg-card p-3"
              >
                <input
                  defaultValue={o.name}
                  id={`owner-name-${o.id}`}
                  placeholder="Nama"
                  className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm"
                />
                <input
                  defaultValue={o.phone || ""}
                  id={`owner-phone-${o.id}`}
                  placeholder="No. WA"
                  inputMode="tel"
                  className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      update(o.id, {
                        name:
                          (
                            document.getElementById(
                              `owner-name-${o.id}`,
                            ) as HTMLInputElement
                          )?.value?.trim() || o.name,
                        phone:
                          (
                            document.getElementById(
                              `owner-phone-${o.id}`,
                            ) as HTMLInputElement
                          )?.value?.trim() || null,
                      })
                    }
                    disabled={busy}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    <Save size={13} /> Simpan
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold"
                  >
                    <X size={13} /> Batal
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={o.id}
                className="flex items-center gap-2.5 rounded-xl border bg-card p-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-bold text-white">
                  {o.name.charAt(0).toUpperCase()}
                </span>
                <Link
                  href={`/dashboard/retail/konsinyasi/${o.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-semibold">
                    {o.name}
                    {!o.isActive && (
                      <span className="ml-1.5 rounded-full bg-muted px-1.5 py-px align-middle text-[10px] font-medium text-muted-foreground">
                        nonaktif
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex shrink-0 items-center gap-0.5">
                      <Phone size={11} /> {o.phone || "—"}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-0.5">
                      <Package size={11} /> {o.itemCount ?? 0} barang
                    </span>
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditing(o.id)}
                    title="Ubah"
                    className="rounded-lg border p-1.5 hover:bg-muted"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => update(o.id, { isActive: !o.isActive })}
                    disabled={busy}
                    title={o.isActive ? "Nonaktifkan" : "Aktifkan"}
                    className={`rounded-lg border p-1.5 hover:bg-muted disabled:opacity-50 ${
                      o.isActive ? "" : "text-emerald-600"
                    }`}
                  >
                    <Power size={13} />
                  </button>
                  <button
                    onClick={() => remove(o.id, o.name)}
                    disabled={busy}
                    title="Hapus"
                    className="rounded-lg border p-1.5 text-rose-600 hover:bg-muted disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <Link
                  href={`/dashboard/retail/konsinyasi/${o.id}`}
                  aria-label="Detail"
                  className="shrink-0 text-muted-foreground"
                >
                  <ChevronRight size={16} />
                </Link>
              </div>
            ),
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <Link
          href="/dashboard/retail/konsinyasi/laporan"
          className="rounded-xl border bg-card p-2.5 text-center text-xs font-semibold hover:border-primary/50"
        >
          Laporan Penjualan
        </Link>
        <Link
          href="/dashboard/retail/konsinyasi/serah-terima"
          className="rounded-xl border bg-card p-2.5 text-center text-xs font-semibold hover:border-primary/50"
        >
          Serah Terima
        </Link>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  Plus,
  Loader2,
  Pencil,
  Save,
  X,
  Power,
  Trash2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type Owner = { id: string; name: string; phone?: string; isActive: boolean; itemCount?: number };

// Pembagian halaman (anti-duplikat):
// - Halaman ini: kelola PEMILIK titipan + payout/serah terima.
// - Kelola BARANG titipan: /dashboard/retail/inventory/barang-titipan.

export default function KonsinyasiPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Titipan UMKM</h1>
          <p className="text-sm text-muted-foreground">Kelola pemilik titipan</p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali
        </Link>
      </div>

      <Link
        href="/dashboard/retail/inventory/barang-titipan"
        className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm font-semibold hover:border-primary/50"
      >
        Kelola barang titipan di halaman Inventaris
        <ArrowRight size={16} className="text-muted-foreground" />
      </Link>

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">
          {err}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 size={20} className="mx-auto animate-spin" />
        </div>
      ) : (
        <OwnersPanel
          owners={owners}
          onReload={reloadOwners}
          setErr={setErr}
        />
      )}
    </main>
  );

  async function reloadOwners() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/consignments/owners");
      const body = await res.json();
      if (!res.ok) {
        setErr(body.error || "Gagal memuat pemilik");
        return;
      }
      setOwners(body.data || []);
    } catch (e: any) {
      setErr(e.message || "Gagal memuat pemilik");
    } finally {
      setLoading(false);
    }
  }
}

function OwnersPanel({
  owners,
  onReload,
  setErr,
}: {
  owners: Owner[];
  onReload: () => Promise<void>;
  setErr: (m: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    onReload();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/consignments/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan");
      setName("");
      setPhone("");
      await onReload();
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
      await onReload();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Hapus pemilik? Barang titipannya ikut dikeluarkan.")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/retail/consignments/owners/${id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menghapus");
      await onReload();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
        className="rounded-xl border bg-card p-4"
      >
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <UserPlus size={16} /> Daftarkan Pemilik
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama pemilik (mis. Ibu Siti)"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="No. HP (opsional)"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Simpan
        </button>
      </form>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <UserPlus size={16} /> Pemilik Terdaftar
        </h2>
        {owners.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Belum ada pemilik titipan
          </p>
        ) : (
          <div className="divide-y">
            {owners.map((o) =>
              editing === o.id ? (
                <div key={o.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      defaultValue={o.name}
                      id={`owner-name-${o.id}`}
                      placeholder="Nama"
                      className="rounded-lg border bg-background px-3 py-1.5 text-sm"
                    />
                    <input
                      defaultValue={o.phone || ""}
                      id={`owner-phone-${o.id}`}
                      placeholder="No. HP"
                      className="rounded-lg border bg-background px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
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
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      <Save size={13} /> Simpan
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      <X size={13} /> Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {o.name}
                      {!o.isActive && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          nonaktif
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.phone || "—"} · {o.itemCount ?? 0} barang
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
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
                      onClick={() => remove(o.id)}
                      disabled={busy}
                      title="Hapus"
                      className="rounded-lg border p-1.5 text-rose-600 hover:bg-muted disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

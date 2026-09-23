"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PackageOpen,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

type Session = {
  user?: { role?: string; unitId?: string; lembagaId?: string };
};

type Unit = { id: string; name: string };
type Owner = { id: string; name: string; itemCount?: number };

type ConsItem = {
  id: string;
  ownerId: string;
  ownerName: string;
  isActive?: boolean;
  costPrice: number;
  marginType: string;
  marginValue: number;
  agreedPrice: number;
  inventory: {
    name: string;
    sku?: string;
    currentStock?: number;
    unitPrice?: number;
    imageUrl?: string;
  } | null;
};

const AGREED = (cost: number, type: "PERCENT" | "FIXED", value: number) =>
  type === "FIXED"
    ? Math.round((cost + value) * 100) / 100
    : Math.round((cost * (1 + value / 100)) * 100) / 100;

export default function BarangTitipanPage() {
  const [items, setItems] = useState<ConsItem[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selUnit, setSelUnit] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  type Mode = "new" | "edit" | null;
  const [mode, setMode] = useState<Mode>(null);
  const [form, setForm] = useState<{
    itemId: string;
    ownerId: string;
    name: string;
    sku: string;
    category: string;
    costPrice: string;
    marginType: "PERCENT" | "FIXED";
    marginValue: string;
  }>({
    itemId: "",
    ownerId: "",
    name: "",
    sku: "",
    category: "",
    costPrice: "",
    marginType: "PERCENT",
    marginValue: "",
  });

  const [session, setSession] = useState<Session>({});
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(setSession)
      .catch(() => setSession({}));
  }, []);
  const r = String(session?.user?.role || "").toUpperCase();

  useEffect(() => {
    if (r === "SUPERADMIN" || r === "PIMPINAN") {
      fetch("/api/units?active=true")
        .then((r2) => r2.json())
        .then((b) => setUnits(b.units || b.data || []))
        .catch(() => setUnits([]));
    }
  }, [r]);

  const unitParam =
    r === "SUPERADMIN" || r === "PIMPINAN" ? selUnit : undefined;
  // PIMPINAN/SUPERADMIN wajib pilih unit dulu; MANAGER/STAFF pakai unit sendiri secara implisit.
  const needsUnitSelect =
    (r === "SUPERADMIN" || r === "PIMPINAN") && !unitParam;

  const loadOwners = async () => {
    if (needsUnitSelect) {
      setOwners([]);
      return;
    }
    try {
      const url = new URL("/api/retail/consignments/owners", window.location.origin);
      if (unitParam) url.searchParams.set("unitId", unitParam);
      const res = await fetch(url.toString());
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal memuat pemilik");
      setOwners(b.data || []);
    } catch (e: any) {
      setOwners([]);
      setErr(e.message || "Gagal memuat pemilik");
    }
  };

  const load = async () => {
    if (needsUnitSelect) {
      setItems([]);
      setErr(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (unitParam) params.set("unitId", unitParam);
      const res = await fetch(
        `/api/retail/consignments/items?${params.toString()}`,
      );
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal memuat barang titipan");
      setItems(b.data || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwners();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitParam]);

  const openNew = () => {
    if (needsUnitSelect) return;
    if (owners.length === 0) {
      setErr("Pilih unit / Daftar pemilik kosong — tambahkan pemilik dulu di Konsinyasi");
      return;
    }
    setMode("new");
    setForm({
      itemId: "",
      ownerId: "",
      name: "",
      sku: "",
      category: "",
      costPrice: "",
      marginType: "PERCENT",
      marginValue: "",
    });
  };

  const openEdit = (it: ConsItem) => {
    setMode("edit");
    setForm({
      itemId: it.id,
      ownerId: it.ownerId,
      name: it.inventory?.name ?? "",
      sku: it.inventory?.sku ?? "",
      category: "",
      costPrice: String(it.costPrice ?? ""),
      marginType: it.marginType === "FIXED" ? "FIXED" : "PERCENT",
      marginValue: String(it.marginValue ?? 0),
    });
  };

  const computeAgreedLive = () => {
    const cost = Number(form.costPrice) || 0;
    const val = Number(form.marginValue) || 0;
    return AGREED(cost, form.marginType, val);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ownerId) {
      setErr("Pilih pemilik titipan");
      return;
    }
    if (!form.name.trim()) {
      setErr("Nama barang wajib diisi");
      return;
    }
    const cost = Number(form.costPrice) || 0;
    if (cost <= 0) {
      setErr("Harga modal harus > 0");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      let res: Response;
      if (mode === "edit") {
        res = await fetch(`/api/retail/consignments/items/${form.itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerId: form.ownerId,
            name: form.name.trim(),
            category: form.category.trim() || null,
            costPrice: cost,
            marginType: form.marginType,
            marginValue: Number(form.marginValue) || 0,
          }),
        });
      } else {
        res = await fetch(`/api/retail/consignments/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerId: form.ownerId,
            name: form.name.trim(),
            sku: form.sku.trim(),
            category: form.category.trim() || null,
            costPrice: cost,
            marginType: form.marginType,
            marginValue: Number(form.marginValue) || 0,
            startingStock: 0,
            minStock: 0,
          }),
        });
      }
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal menyimpan");
      setMsg(
        mode === "edit"
          ? "Barang titipan diperbarui"
          : "Barang titipan ditambahkan",
      );
      setMode(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (it: ConsItem) => {
    if (!confirm(`Keluarkan "${it.inventory?.name || it.id}" dari titipan?`))
      return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/retail/consignments/items/${it.id}`, {
        method: "DELETE",
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal menghapus");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const canWrite =
    r === "SUPERADMIN" ||
    r === "PIMPINAN" ||
    r === "MANAGER" ||
    r === "STAFF";

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/retail/inventory"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <PackageOpen size={20} /> Barang Titipan (UMKM)
          </h1>
        </div>
        {canWrite && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={15} /> Tambah Barang
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Kelola barang titipan pemilik UMKM di unit ini: harga modal, margin, dan
        harga pakai (agreed). Penjualan dicatat otomatis; serah terima ke
        pemilik ada di menu Konsinyasi.
      </p>

        {(r === "SUPERADMIN" || r === "PIMPINAN") && (
          <div className="flex items-end gap-2">
            <label className="block text-xs font-medium">Unit</label>
            <select
              value={selUnit}
              onChange={(e) => {
                setSelUnit(e.target.value);
                setItems([]);
                setOwners([]);
              }}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">— Pilih unit —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSelUnit("");
                setItems([]);
                setOwners([]);
              }}
              className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold"
            >
              <RefreshCw size={13} /> Reset
            </button>
          </div>
        )}

        {needsUnitSelect && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-600">
            Pilih unit dulu untuk melihat barang titipan di unit tersebut.
          </div>
        )}

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">
          {err}
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600">
          {msg}
        </div>
      )}

      {mode !== null && (
        <form onSubmit={submit} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {mode === "edit" ? "Edit Barang Titipan" : "Barang Baru"}
            </h2>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={form.ownerId}
              onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
              className="col-span-2 rounded-lg border bg-background px-3 py-2 text-sm"
              required
              disabled={owners.length === 0}
            >
              <option value="">— Pilih pemilik titipan —</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <div>
              <label className="block text-xs font-medium">Nama barang</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium">SKU</label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Kategori</label>
              <input
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Harga modal</label>
              <input
                type="number"
                min="0"
                step="100"
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Margin</label>
              <div className="mt-1 flex gap-1">
                <select
                  value={form.marginType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      marginType: e.target.value as "PERCENT" | "FIXED",
                    })
                  }
                  className="w-1/2 rounded-lg border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="PERCENT">%</option>
                  <option value="FIXED">Rp</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.marginValue}
                  onChange={(e) =>
                    setForm({ ...form, marginValue: e.target.value })
                  }
                  className="w-1/2 rounded-lg border bg-background px-2 py-1.5 text-sm text-right"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium">
                Harga pakai (agreed) — otomatis
              </label>
              <input
                type="number"
                min="0"
                value={computeAgreedLive()}
                readOnly
                className="mt-1 w-full rounded-lg border bg-muted px-3 py-2 text-sm font-semibold text-emerald-700"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !form.ownerId || !form.name || !form.costPrice}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {mode === "edit" ? "Perbarui" : "Simpan"}
          </button>
        </form>
      )}

      {/* Daftar */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 text-sm font-semibold">
          Daftar Barang Titipan ({items.length})
        </div>
        {loading ? (
          <div className="py-6 text-center text-muted-foreground">
            <Loader2 size={18} className="mx-auto animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Belum ada barang titipan
          </p>
        ) : (
          <div className="divide-y text-sm">
            {items.map((it) => (
              <div
                key={it.id}
                className={`flex items-center justify-between gap-3 py-2 ${
                  !it.isActive ? "opacity-40" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {it.inventory?.imageUrl ? (
                      <img
                        src={it.inventory?.imageUrl}
                        alt={it.inventory?.name || "barang"}
                        className="h-8 w-8 rounded border object-cover"
                      />
                    ) : (
                      <span className="h-8 w-8 shrink-0 rounded border bg-muted" />
                    )}
                    <p className="truncate font-medium">
                      {it.inventory?.name || "—"} ({it.ownerName})
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    SKU {it.inventory?.sku ?? "—"} · stok{" "}
                    {it.inventory?.currentStock ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    modal {fmt(Number(it.costPrice))} · margin{" "}
                    {it.marginType === "FIXED" ? "Rp" : "%"} {" "}
                    {Number(it.marginValue)} → pakai{" "}
                    <span className="font-medium text-emerald-700">
                      {fmt(Number(it.agreedPrice))}
                    </span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(it)}
                    className="rounded-lg border bg-background px-2 py-1 text-xs"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => remove(it)}
                    className="rounded-lg border bg-background px-2 py-1 text-xs text-rose-600"
                    title="Keluarkan dari titipan"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

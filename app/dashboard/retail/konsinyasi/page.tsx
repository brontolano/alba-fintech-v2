"use client";

import { useState, useEffect } from "react";
import {
  PackageOpen,
  UserPlus,
  Plus,
  Loader2,
  PackagePlus,
  Pencil,
  Save,
  X,
  Power,
  Trash2,
} from "lucide-react";
import Link from "next/link";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

type Owner = { id: string; name: string; phone?: string; isActive: boolean; itemCount?: number };
type Item = {
  id: string;
  costPrice: number;
  agreedPrice: number;
  marginType: string;
  marginValue: number;
  isActive?: boolean;
  owners: { name: string };
  inventory: { name: string; currentStock: number; unitPrice: number } | null;
};

export default function KonsinyasiPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"owners" | "items">("owners");

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Titipan UMKM</h1>
          <p className="text-sm text-muted-foreground">Kelola pemilik & barang konsinyasi</p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali
        </Link>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("owners")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "owners" ? "bg-primary text-primary-foreground" : "border bg-card"
          }`}
        >
          Pemilik ({owners.length})
        </button>
        <button
          onClick={() => setTab("items")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "items" ? "bg-primary text-primary-foreground" : "border bg-card"
          }`}
        >
          Barang Titipan ({items.length})
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">
          {err}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 size={20} className="mx-auto animate-spin" />
        </div>
      ) : tab === "owners" ? (
        <OwnersPanel
          owners={owners}
          onReload={reloadOwners}
          setErr={setErr}
        />
      ) : (
        <ItemsPanel
          owners={owners.filter((o) => o.isActive)}
          items={items}
          onReload={reloadItems}
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

  async function reloadItems() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/consignments/items");
      const body = await res.json();
      if (!res.ok) {
        setErr(body.error || "Gagal memuat barang");
        return;
      }
      setItems(body.data || []);
    } catch (e: any) {
      setErr(e.message || "Gagal memuat barang");
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
          <PackageOpen size={16} /> Pemilik Terdaftar
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

function ItemsPanel({
  owners,
  items,
  onReload,
  setErr,
}: {
  owners: Owner[];
  items: Item[];
  onReload: () => Promise<void>;
  setErr: (m: string | null) => void;
}) {
  const [form, setForm] = useState({
    ownerId: "",
    name: "",
    sku: "",
    costPrice: "",
    marginType: "PERCENT",
    marginValue: "30",
    startingStock: "1",
  });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    onReload();
  }, []);

  const create = async () => {
    if (!form.ownerId || !form.name.trim() || !form.sku.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/consignments/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: form.ownerId,
          name: form.name.trim(),
          sku: form.sku.trim(),
          costPrice: Number(form.costPrice) || 0,
          marginType: form.marginType,
          marginValue: Number(form.marginValue) || 0,
          startingStock: Number(form.startingStock) || 1,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan");
      setForm({ ...form, name: "", sku: "", startingStock: "1" });
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
      const res = await fetch(`/api/retail/consignments/items/${id}`, {
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
          <PackagePlus size={16} /> Terima Barang Titipan
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={form.ownerId}
            onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">— Pilih pemilik —</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama barang"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
          <input
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            placeholder="SKU (mis. KUE06)"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
          <input
            value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            placeholder="Harga modal / dari pemilik"
            type="number"
            min="0"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
          <div className="flex gap-2">
            <select
              value={form.marginType}
              onChange={(e) => setForm({ ...form, marginType: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="PERCENT">Margin %</option>
              <option value="FIXED">Margin Rp</option>
            </select>
            <input
              value={form.marginValue}
              onChange={(e) => setForm({ ...form, marginValue: e.target.value })}
              type="number"
              min="0"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <input
            value={form.startingStock}
            onChange={(e) => setForm({ ...form, startingStock: e.target.value })}
            placeholder="Stok awal"
            type="number"
            min="0"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !form.ownerId || !form.name || !form.sku}
          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Terima Barang
        </button>
      </form>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <PackageOpen size={16} /> Daftar Barang Titipan
        </h2>
        {items.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Belum ada barang titipan
          </p>
        ) : (
          <div className="divide-y">
            {items.map((it) =>
              editing === it.id ? (
                <div key={it.id} className="grid gap-2 py-3">
                  <p className="text-sm font-medium">{it.inventory?.name || it.id}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      defaultValue={Number(it.costPrice)}
                      id={`item-cost-${it.id}`}
                      placeholder="Harga modal"
                      type="number"
                      min="0"
                      className="rounded-lg border bg-background px-3 py-1.5 text-sm"
                    />
                    <select
                      id={`item-margin-type-${it.id}`}
                      defaultValue={it.marginType}
                      className="rounded-lg border bg-background px-3 py-1.5 text-sm"
                    >
                      <option value="PERCENT">Margin %</option>
                      <option value="FIXED">Margin Rp</option>
                    </select>
                    <input
                      defaultValue={Number(it.marginValue)}
                      id={`item-margin-value-${it.id}`}
                      placeholder="Nilai margin"
                      type="number"
                      min="0"
                      className="rounded-lg border bg-background px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        update(it.id, {
                          costPrice:
                            Number(
                              (
                                document.getElementById(
                                  `item-cost-${it.id}`,
                                ) as HTMLInputElement
                              )?.value,
                            ) || 0,
                          marginType:
                            (
                              document.getElementById(
                                `item-margin-type-${it.id}`,
                              ) as HTMLSelectElement
                            )?.value || "PERCENT",
                          marginValue:
                            Number(
                              (
                                document.getElementById(
                                  `item-margin-value-${it.id}`,
                                ) as HTMLInputElement
                              )?.value,
                            ) || 0,
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
                <div key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {it.inventory?.name || it.id}
                      {it.isActive === false && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          nonaktif
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {it.owners?.name} · simpan {it.inventory?.currentStock ?? 0} ·{" "}
                      {it.marginType === "PERCENT" ? `${it.marginValue}%` : `Rp ${it.marginValue}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-right">
                    <div className="text-xs">
                      <span className="block text-muted-foreground">jual {fmt(Number(it.agreedPrice))}</span>
                      <span className="block">modal {fmt(Number(it.costPrice))}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditing(it.id)}
                        title="Ubah margin"
                        className="rounded-lg border p-1.5 hover:bg-muted"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => update(it.id, { isActive: it.isActive === false })}
                        disabled={busy}
                        title={it.isActive === false ? "Aktifkan" : "Nonaktifkan"}
                        className={`rounded-lg border p-1.5 hover:bg-muted disabled:opacity-50 ${
                          it.isActive === false ? "text-emerald-600" : ""
                        }`}
                      >
                        <Power size={13} />
                      </button>
                    </div>
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
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PackagePlus,
  ClipboardCheck,
  Loader2,
  ArrowLeft,
  Search,
  Package,
  Plus,
  X,
  Pencil,
  Trash2,
  Printer,
} from "lucide-react";
import { printData, escapeHtml } from "@/lib/print";
import { toast } from "sonner";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

type Item = {
  id: string;
  name: string;
  sku?: string;
  category?: string | null;
  currentStock: number;
  purchasePrice?: number | null;
  minStock?: number;
  unitPrice?: number;
  imageUrl?: string;
  isActive?: boolean;
  isConsignment?: boolean;
  isConsignmentOwner?: string | null;
};

type Owner = { id: string; name: string };
type Filter = "all" | "pondok" | "titipan";

type Summary = {
  total: number;
  pages: number;
  pondokCount: number;
  titipanCount: number;
  modalValuation: number;
};

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "pondok", label: "Pondok" },
  { key: "titipan", label: "Titipan" },
];

const inputCls =
  "rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary";

export default function RetailInventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [draftCount, setDraftCount] = useState(0);

  const [tab, setTab] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [category, setCategory] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [stockIn, setStockIn] = useState({ itemId: "", qty: "", unitPrice: "" });
  const [counting, setCounting] = useState<Record<string, number>>({});
  const [countingMode, setCountingMode] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    sku: "",
    category: "",
    unitPrice: "",
    purchasePrice: "",
    minStock: "",
  });

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        const mgr = String(s?.user?.role || "").toUpperCase() === "MANAGER";
        setIsManager(mgr);
        if (mgr) {
          fetch("/api/retail/batches?status=DRAFT&limit=1")
            .then((r2) => r2.json())
            .then((b) =>
              setDraftCount(Array.isArray(b.data) ? b.data.length : 0),
            )
            .catch(() => {});
        }
      })
      .catch(() => setIsManager(false));
  }, []);

  useEffect(() => {
    fetch("/api/retail/consignments/owners")
      .then((r) => r.json())
      .then((b) => setOwners(Array.isArray(b.data) ? b.data : []))
      .catch(() => setOwners([]));
    fetch("/api/inventory?limit=500")
      .then((r) => r.json())
      .then((b) => {
        const list = (Array.isArray(b.data) ? b.data : []) as Item[];
        setCategories(
          [...new Set(list.map((i) => i.category).filter(Boolean))].sort() as string[],
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(
    async (f: Filter, search: string, cat: string) => {
      setLoading(true);
      setErr(null);
      try {
        const params = new URLSearchParams({ limit: "500" });
        if (f === "pondok") params.set("isConsignment", "false");
        if (f === "titipan") params.set("isConsignment", "true");
        if (search) params.set("search", search);
        if (cat) params.set("category", cat);
        const res = await fetch(`/api/inventory?${params.toString()}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Gagal memuat stok");
        const list = (Array.isArray(body.data) ? body.data : []) as Item[];
        setItems(list.filter((x: any) => x.isActive !== false));
        refreshCategories(list);
        if (body.summary) setSummary(body.summary as Summary);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(tab, qDebounced, category);
  }, [tab, qDebounced, category, load]);

  const visible = ownerId
    ? items.filter((i) => i.isConsignmentOwner === ownerId)
    : items;

  const pickTab = (f: Filter) => {
    setCountingMode(false);
    setTab(f);
  };

  const post = async (action: string, payload: any) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/retail/inventory?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal");
      setMsg(action === "stock-in" ? "Stok ditambahkan" : "Stocktake diterapkan");
      setStockIn({ itemId: "", qty: "", unitPrice: "" });
      setCountingMode(false);
      await load(tab, qDebounced, category);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitStockIn = () => {
    const qty = Number(stockIn.qty);
    if (!stockIn.itemId || !qty) return;
    post("stock-in", {
      itemId: stockIn.itemId,
      qty,
      unitPrice: stockIn.unitPrice ? Number(stockIn.unitPrice) : undefined,
    });
  };

  const submitStocktake = () => {
    const payload = Object.entries(counting)
      .map(([id, count]) => ({ id, count: Number(count) }))
      .filter((x) => Number.isFinite(x.count));
    if (payload.length === 0) return;
    post("stocktake", { items: payload });
  };

  const toggleCounting = () => {
    const next = !countingMode;
    setCountingMode(next);
    if (next) {
      const init: Record<string, number> = {};
      items.forEach((i) => (init[i.id] = i.currentStock));
      setCounting(init);
    }
  };

  const refreshCategories = (list: Item[]) => {
    setCategories(
      [...new Set(list.map((i) => i.category).filter(Boolean))].sort() as string[],
    );
  };

  const submitCreate = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const unitPrice = Number(newItem.unitPrice);
    if (!newItem.name.trim() || !unitPrice) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name.trim(),
          sku: newItem.sku.trim() || `BAR-${Date.now()}`,
          category: newItem.category.trim() || undefined,
          unitPrice,
          purchasePrice: newItem.purchasePrice
            ? Number(newItem.purchasePrice)
            : undefined,
          minStock: newItem.minStock ? Number(newItem.minStock) : 0,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menambah barang");
      setMsg("Barang berhasil ditambahkan");
      setShowCreate(false);
      setNewItem({
        name: "",
        sku: "",
        category: "",
        unitPrice: "",
        purchasePrice: "",
        minStock: "",
      });
      await load(tab, qDebounced, category);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (i: Item) => {
    if (!window.confirm(`Hapus barang "${i.name}"?`)) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/inventory/${i.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Gagal menghapus barang");
      setMsg("Barang dihapus");
      await load(tab, qDebounced, category);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const lowCount = items.filter(
    (i) => Number(i.currentStock) <= Number(i.minStock ?? -1),
  ).length;

  const printStock = () => {
    if (visible.length === 0) {
      toast.error("Tidak ada data untuk dicetak");
      return;
    }
    const ownerName = (id?: string | null) => {
      if (!id) return "-";
      const o = owners.find((x) => x.id === id);
      return o ? o.name : id.slice(0, 8);
    };
    const rows = visible
      .map(
        (i, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(i.name)}${i.isConsignment ? " (Titipan)" : ""}</td>
          <td>${escapeHtml(i.sku || "-")}</td>
          <td>${escapeHtml(i.category || "-")}</td>
          <td>${i.isConsignment ? `Titipan — ${escapeHtml(ownerName(i.isConsignmentOwner))}` : "Pondok"}</td>
          <td class="num">${i.currentStock}</td>
          <td class="num">${escapeHtml(fmt(Number(i.unitPrice ?? 0)))}</td>
        </tr>`,
      )
      .join("");

    const bodyHtml = `
      <div class="site-header">
        <h1>ALBA FINANCE</h1>
        <p class="sub">Pondok Pesantren Al-Basyariyah · Unit Retail</p>
      </div>
      <h2>Laporan Stok Retail</h2>
      <p class="sub">Daftar ${visible.length} barang · Dicetak ${escapeHtml(
        new Date().toLocaleString("id-ID"),
      )}</p>
      <table>
        <thead>
          <tr>
            <th>No</th><th>Barang</th><th>SKU</th><th>Kategori</th><th>Kepemilikan</th><th>Stok</th><th>Harga</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="num"><strong>Item Pondok</strong></td>
            <td colspan="3" class="num"><strong>${summary?.pondokCount ?? 0}</strong></td>
          </tr>
          <tr>
            <td colspan="4" class="num"><strong>Item Titipan</strong></td>
            <td colspan="3" class="num"><strong>${summary?.titipanCount ?? 0}</strong></td>
          </tr>
          <tr>
            <td colspan="4" class="num"><strong>Nilai Modal</strong></td>
            <td colspan="3" class="num"><strong>${escapeHtml(fmt(summary?.modalValuation ?? 0))}</strong></td>
          </tr>
        </tfoot>
      </table>
      <div class="sign">
        <div><p>Petugas Inventori</p><div class="space"></div><p>_______________</p></div>
        <div><p>Manager Unit</p><div class="space"></div><p>_______________</p></div>
      </div>
      <p class="footer">Dicetak ${escapeHtml(new Date().toLocaleString("id-ID"))} · Dokumen dihasilkan otomatis oleh ALBA Finance</p>
    `;
    printData("Stok Retail", bodyHtml, { pageSize: "A4", margin: "12mm" });
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-3 overflow-x-hidden p-3 sm:p-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/dashboard"
          aria-label="Kembali"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">
          Stok Retail
          {lowCount > 0 && (
            <span className="ml-2 rounded-full bg-rose-500/15 px-2 py-0.5 align-middle text-[11px] font-bold text-rose-600">
              {lowCount} menipis
            </span>
          )}
        </h1>
        {isManager && draftCount > 0 && (
          <Link
            href="/dashboard/retail/stok-masuk/review"
            className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-white"
          >
            Review ({draftCount})
          </Link>
        )}
        <button
          onClick={printStock}
          disabled={visible.length === 0}
          title="Cetak laporan stok"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer size={14} /> Cetak
        </button>
        <Link
          href="/dashboard/retail/stok-masuk"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <PackagePlus size={14} /> Stok Masuk
        </Link>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-600">
          {err}
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-600">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {[
          { label: "Item Aktif", value: String((summary?.pondokCount ?? 0) + (summary?.titipanCount ?? 0)) },
          { label: "Pondok", value: String(summary?.pondokCount ?? 0) },
          { label: "Titipan", value: String(summary?.titipanCount ?? 0) },
          { label: "Nilai Modal", value: fmt(summary?.modalValuation ?? 0) },
        ].map((k) => (
          <div key={k.label} className="min-w-0 rounded-xl border bg-card px-2 py-1.5">
            <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
              {k.label}
            </p>
            <p
              className="break-words text-sm font-bold leading-snug text-foreground sm:text-base"
              title={k.value}
            >
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-2">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama / SKU…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          >
            <option value="">Semua vendor</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => pickTab(t.key)}
              className={`h-8 rounded-lg border px-2.5 text-xs font-medium ${
                tab === t.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
          {isManager && (
            <button
              onClick={toggleCounting}
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold"
            >
              {countingMode ? "Batal" : "Stocktake"}
            </button>
          )}
        </div>
      </div>

      {isManager && !countingMode && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitStockIn();
          }}
          className="rounded-xl border bg-card p-2.5"
        >
          <div className="grid gap-1.5 sm:grid-cols-[1fr_90px_130px_auto]">
            <select
              value={stockIn.itemId}
              onChange={(e) => setStockIn({ ...stockIn, itemId: e.target.value })}
              className={`${inputCls} min-w-0`}
              required
            >
              <option value="">— Pilih barang —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.currentStock})
                </option>
              ))}
            </select>
            <input
              value={stockIn.qty}
              onChange={(e) => setStockIn({ ...stockIn, qty: e.target.value })}
              placeholder="Qty"
              type="number"
              min="1"
              className={inputCls}
              required
            />
            <input
              value={stockIn.unitPrice}
              onChange={(e) =>
                setStockIn({ ...stockIn, unitPrice: e.target.value })
              }
              placeholder="Harga/biji"
              type="number"
              min="0"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={busy || !stockIn.itemId || !stockIn.qty}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <PackagePlus size={14} />
              )}
              Tambah
            </button>
          </div>
        </form>
      )}
      {isManager && !countingMode && (
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 text-sm font-semibold text-primary hover:bg-primary/10"
        >
          {showCreate ? <X size={14} /> : <Plus size={14} />}
          {showCreate ? "Tutup" : "Barang Baru"}
        </button>
      )}

      {isManager && showCreate && !countingMode && (
        <form
          onSubmit={submitCreate}
          className="rounded-xl border bg-card p-2.5"
        >
          <p className="mb-1.5 px-0.5 text-xs font-semibold text-muted-foreground">
            Tambah Barang Baru
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <input
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="Nama barang *"
              className={`${inputCls} min-w-0`}
              required
            />
            <input
              value={newItem.sku}
              onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
              placeholder="SKU (kosongkan → otomatis)"
              className={`${inputCls} min-w-0`}
            />
            <input
              value={newItem.category}
              onChange={(e) =>
                setNewItem({ ...newItem, category: e.target.value })
              }
              placeholder="Kategori"
              className={`${inputCls} min-w-0`}
            />
            <input
              value={newItem.unitPrice}
              onChange={(e) =>
                setNewItem({ ...newItem, unitPrice: e.target.value })
              }
              placeholder="Harga jual *"
              type="number"
              min="0"
              className={`${inputCls} min-w-0`}
              required
            />
            <input
              value={newItem.purchasePrice}
              onChange={(e) =>
                setNewItem({ ...newItem, purchasePrice: e.target.value })
              }
              placeholder="Harga beli"
              type="number"
              min="0"
              className={`${inputCls} min-w-0`}
            />
            <input
              value={newItem.minStock}
              onChange={(e) =>
                setNewItem({ ...newItem, minStock: e.target.value })
              }
              placeholder="Stok minimum"
              type="number"
              min="0"
              className={`${inputCls} min-w-0`}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !newItem.name.trim() || !Number(newItem.unitPrice)}
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Simpan Barang
          </button>
        </form>
      )}

      {!isManager && (
        <Link
          href="/dashboard/retail/stok-masuk"
          className="block rounded-xl border border-dashed bg-card p-2.5 text-center text-xs text-muted-foreground"
        >
          Tambah stok lewat <span className="font-semibold text-primary">Stok Masuk</span>
        </Link>
      )}

      <div className="rounded-xl border bg-card p-2.5">
        <h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
          Daftar Barang ({visible.length})
        </h2>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 size={18} className="mx-auto animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Tidak ada barang
          </p>
        ) : countingMode ? (
          <>
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {visible.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-2 py-1.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      catat: {i.currentStock}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={counting[i.id] ?? i.currentStock}
                    onChange={(e) =>
                      setCounting({ ...counting, [i.id]: Number(e.target.value) })
                    }
                    className="w-20 shrink-0 rounded-lg border bg-background px-2 py-1.5 text-sm text-right"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={submitStocktake}
              disabled={busy}
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ClipboardCheck size={14} />
              )}
              Terapkan
            </button>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {visible.map((i) => {
              const low = Number(i.currentStock) <= Number(i.minStock ?? -1);
              return (
                <div
                  key={i.id}
                  className="min-w-0 overflow-hidden rounded-xl border bg-background"
                >
                  {i.imageUrl ? (
                    <img
                      src={i.imageUrl}
                      alt={i.name}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-muted">
                      <Package size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-0.5 p-1.5">
                    <p className="truncate text-xs font-semibold" title={i.name}>
                      {i.name}
                      {i.isConsignment && (
                        <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-px align-middle text-[10px] font-semibold text-amber-800">
                          UMKM
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-medium text-emerald-700">
                      {i.unitPrice ? fmt(Number(i.unitPrice)) : "—"}
                    </p>
                    <p
                      className={`text-[11px] ${low ? "font-bold text-rose-600" : "text-muted-foreground"}`}
                    >
                      Stok: {i.currentStock}
                      {low ? " · menipis" : ""}
                    </p>
                    <div
                      className={`mt-1 flex gap-1 ${isManager ? "" : "pt-0.5"}`}
                    >
                      <Link
                        href={`/dashboard/retail/inventory/${i.id}`}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-1.5 py-1 text-[10px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        <Pencil size={10} /> {isManager ? "Edit" : "Detail"}
                      </Link>
                      {isManager && (
                        <button
                          onClick={() => removeItem(i)}
                          disabled={Boolean(i.isConsignment)}
                          title={
                            i.isConsignment
                              ? "Barang titipan tidak bisa dihapus langsung"
                              : "Hapus barang"
                          }
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-rose-500/30 px-1.5 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-500/5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={10} /> Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

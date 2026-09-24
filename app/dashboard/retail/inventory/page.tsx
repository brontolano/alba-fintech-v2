"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PackagePlus,
  ClipboardCheck,
  Loader2,
  Boxes,
  PackageOpen,
  ArrowLeft,
  Search,
  Package,
} from "lucide-react";

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
  minStock?: number;
  unitPrice?: number;
  imageUrl?: string;
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
  { key: "pondok", label: "Barang Pondok" },
  { key: "titipan", label: "Titipan (UMKM)" },
];

export default function RetailInventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isManager, setIsManager] = useState(false);

  const [tab, setTab] = useState<Filter>("all");
  const [draftCount, setDraftCount] = useState(0);
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

  // Role untuk gate tombol Stocktake (server tetap menolak non-manager).
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        const mgr =
          String(s?.user?.role || "").toUpperCase() === "MANAGER";
        setIsManager(mgr);
        if (mgr) {
          fetch("/api/retail/batches?status=DRAFT&limit=1")
            .then((r2) => r2.json())
            .then((b) =>
              setDraftCount(
                Array.isArray(b.data) ? b.data.length : 0,
              ),
            )
            .catch(() => {});
        }
      })
      .catch(() => setIsManager(false));
  }, []);

  // Daftar pemilik (filter vendor) + kategori (filter).
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

  // Debounce pencarian 300ms.
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

  // Filter vendor (pemilik) di sisi klien — API tidak punya param owner.
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
      setMsg(
        action === "stock-in" ? "Stok ditambahkan" : "Stocktake diterapkan",
      );
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

  const lowCount = items.filter(
    (i) => Number(i.currentStock) <= Number(i.minStock ?? -1),
  ).length;
  const totalItem = (summary?.pondokCount ?? 0) + (summary?.titipanCount ?? 0);

  const kpis = [
    { label: "Total Item", value: String(totalItem), icon: <Boxes size={18} /> },
    {
      label: "Barang Pondok",
      value: String(summary?.pondokCount ?? 0),
      icon: <Package size={18} />,
    },
    {
      label: "Barang Titipan",
      value: String(summary?.titipanCount ?? 0),
      icon: <PackageOpen size={18} />,
    },
    {
      label: "Total Modal",
      value: fmt(summary?.modalValuation ?? 0),
      icon: <PackagePlus size={18} />,
    },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            aria-label="Kembali"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Boxes size={20} /> Stok Retail
              {lowCount > 0 && (
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                  {lowCount} menipis
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Stok masuk, stocktake & daftar barang unit
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {isManager && draftCount > 0 && (
            <Link
              href="/dashboard/retail/stok-masuk/review"
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white"
            >
              Review ({draftCount})
            </Link>
          )}
          <Link
            href="/dashboard/retail/stok-masuk"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
          >
            <PackagePlus size={15} /> Stok Masuk
          </Link>
          <Link
            href="/dashboard/retail/konsinyasi"
            className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-accent"
          >
            <PackageOpen size={15} /> Pemilik
          </Link>
        </div>
      </div>

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

      {/* 4 KPI */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {k.icon}
              {k.label}
            </div>
            <p className="mt-1 truncate text-lg font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama / SKU…"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
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
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Semua vendor</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tab */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 text-xs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => pickTab(t.key)}
              className={`rounded-lg border bg-background px-2 py-1 ${
                tab === t.key ? "border-primary bg-primary/10" : ""
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {isManager && (
          <button
            onClick={toggleCounting}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold"
          >
            {countingMode ? "Batal Stocktake" : "Stocktake"}
          </button>
        )}
      </div>

      {/* Stok masuk */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitStockIn();
        }}
        className="rounded-xl border bg-card p-4"
      >
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <PackagePlus size={16} /> Stok Masuk
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={stockIn.itemId}
            onChange={(e) => setStockIn({ ...stockIn, itemId: e.target.value })}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">— Pilih barang —</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} (stok {i.currentStock})
              </option>
            ))}
          </select>
          <input
            value={stockIn.qty}
            onChange={(e) => setStockIn({ ...stockIn, qty: e.target.value })}
            placeholder="Jumlah"
            type="number"
            min="1"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
          <input
            value={stockIn.unitPrice}
            onChange={(e) =>
              setStockIn({ ...stockIn, unitPrice: e.target.value })
            }
            placeholder="Harga beli/biji (opsional)"
            type="number"
            min="0"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !stockIn.itemId || !stockIn.qty}
          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <PackagePlus size={15} />
          )}
          Tambah Stok
        </button>
      </form>

      {/* Grid barang */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">
          Daftar Barang ({visibleCount(visible)})
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
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {visible.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      catat: {i.currentStock}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={counting[i.id] ?? i.currentStock}
                    onChange={(e) =>
                      setCounting({
                        ...counting,
                        [i.id]: Number(e.target.value),
                      })
                    }
                    className="w-24 rounded-lg border bg-background px-2 py-1.5 text-sm text-right"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={submitStocktake}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ClipboardCheck size={15} />
              )}
              Terapkan Hitungan
            </button>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((i) => {
              const low =
                Number(i.currentStock) <= Number(i.minStock ?? -1);
              return (
                <div
                  key={i.id}
                  className="overflow-hidden rounded-xl border bg-background"
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
                      <PackagePlus
                        size={22}
                        className="text-muted-foreground"
                      />
                    </div>
                  )}
                  <div className="space-y-0.5 p-2">
                    <p className="truncate text-sm font-semibold" title={i.name}>
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
                      className={`text-xs ${low ? "font-bold text-rose-600" : "text-muted-foreground"}`}
                    >
                      Stok: {i.currentStock}
                      {low ? " · menipis" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );

  function visibleCount(list: Item[]) {
    return list.length;
  }
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  PackagePlus,
  ClipboardCheck,
  Loader2,
  Boxes,
  PackageOpen,
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
  currentStock: number;
  minStock?: number;
  unitPrice?: number;
};

export default function RetailInventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Form stock-in
  const [stockIn, setStockIn] = useState({ itemId: "", qty: "", unitPrice: "" });

  // Mode stocktake
  const [counting, setCounting] = useState<Record<string, number>>({});
  const [countingMode, setCountingMode] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/inventory?limit=500");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memuat stok");
      const list = (body.data && Array.isArray(body.data) ? body.data : body.items || []) as Item[];
      setItems(list.filter((x: any) => x.isActive !== false));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitStockIn = () => {
    const itemId = stockIn.itemId;
    const qty = Number(stockIn.qty);
    if (!itemId || !qty) return;
    post("stock-in", {
      itemId,
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

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Boxes size={20} /> Stok Retail
          </h1>
          <p className="text-sm text-muted-foreground">Stok masuk & stocktake</p>
        </div>
        <Link
          href="/dashboard/retail/inventory/barang-titipan"
          className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-accent"
        >
          <PackageOpen size={15} /> Barang Titipan
        </Link>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali
        </Link>
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
            onChange={(e) => setStockIn({ ...stockIn, unitPrice: e.target.value })}
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
          {busy ? <Loader2 size={15} className="animate-spin" /> : <PackagePlus size={15} />}
          Tambah Stok
        </button>
      </form>

      {/* Mode stocktake */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardCheck size={16} /> Stocktake
          </h2>
          <button
            onClick={() => {
              const next = !countingMode;
              setCountingMode(next);
              if (next) {
                const init: Record<string, number> = {};
                items.forEach((i) => (init[i.id] = i.currentStock));
                setCounting(init);
              }
            }}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {countingMode ? "Batal" : "Mulai Hitung"}
          </button>
        </div>

        {countingMode ? (
          <>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {items.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">catat: {i.currentStock}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={counting[i.id] ?? i.currentStock}
                    onChange={(e) =>
                      setCounting({ ...counting, [i.id]: Number(e.target.value) })
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
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />}
              Terapkan Hitungan
            </button>
          </>
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Klik &quot;Mulai Hitung&quot; untuk sesuaikan stok riil
          </p>
        )}
      </div>

      {/* Daftar stok */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Daftar Barang ({items.length})</h2>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 size={18} className="mx-auto animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">Tidak ada barang</p>
        ) : (
          <div className="divide-y">
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.sku ? `${i.sku} · ` : ""}
                    {i.unitPrice ? `${fmt(Number(i.unitPrice))}/biji` : "harga belum set"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`font-bold ${
                      Number(i.currentStock) <= Number(i.minStock ?? -1)
                        ? "text-rose-600"
                        : ""
                    }`}
                  >
                    {i.currentStock}
                  </p>
                  {Number(i.currentStock) <= Number(i.minStock ?? -1) && (
                    <p className="text-[11px] text-rose-600">stok menipis</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
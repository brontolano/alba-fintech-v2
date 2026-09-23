"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { ShoppingCart, PackagePlus, Loader2, History, Truck, X } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

type InvItem = {
  id: string;
  name: string;
  sku?: string;
  currentStock: number;
  minStock?: number;
  unitPrice?: number;
  purchasePrice?: number;
};
type SuggestItem = InvItem & { suggestedQty: number };
type CartLine = { qty: string; est: string };
type NewItem = { name: string; qty: string; est: string };

type HistoryTx = {
  id: string;
  unit?: { name: string } | null;
  amount: number;
  status: string;
  description?: string;
  createdAt: string;
  createdBy?: { name: string } | null;
  approvals?: { status: string; comment?: string | null }[];
  items: {
    id: string;
    name: string;
    qty: number;
    fulfilled: number;
    status: string;
    isNewItem: boolean;
  }[];
};

export default function RetailBelanjaPage() {
  const [role, setRole] = useState("STAFF");
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [unitId, setUnitId] = useState("");

  const [inv, setInv] = useState<InvItem[]>([]);
  const [sugg, setSugg] = useState<SuggestItem[]>([]);
  const [history, setHistory] = useState<HistoryTx[]>([]);

  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [newItems, setNewItems] = useState<NewItem[]>([]);
  const [note, setNote] = useState("");
  const [manualQty, setManualQty] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [receiving, setReceiving] = useState<HistoryTx | null>(null);
  const [receiveRows, setReceiveRows] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        const r = s?.user?.role || "STAFF";
        setRole(r);
        if (r === "SUPERADMIN" || r === "PIMPINAN") {
          fetch("/api/units")
            .then((x) => x.json())
            .then((b) =>
              setUnits(Array.isArray(b) ? b : b.data || []),
            )
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const hisParams = new URLSearchParams();
      if (unitId) hisParams.set("unitId", unitId);
      hisParams.set("limit", "20");
      const q = unitId ? `?unitId=${unitId}` : "";
      const [sugRes, itRes, hisRes] = await Promise.all([
        fetch(`/api/retail/reorder/suggest${q}`),
        fetch(`/api/inventory?limit=500`),
        fetch(`/api/retail/reorder?${hisParams.toString()}`),
      ]);
      const sugBody = await sugRes.json();
      const itBody = await itRes.json();
      const hisBody = await hisRes.json();
      if (!sugRes.ok) throw new Error(sugBody.error || "Gagal memuat saran");
      if (!itRes.ok) throw new Error(itBody.error || "Gagal memuat stok");
      if (!hisRes.ok) throw new Error(hisBody.error || "Gagal memuat riwayat");
      const list = (
        itBody.data && Array.isArray(itBody.data)
          ? itBody.data
          : itBody.items || []
      ) as InvItem[];
      setInv(list.filter((x: any) => x.isActive !== false));
      setSugg(sugBody.data || []);
      setHistory(hisBody.data || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(() => {
    let t = 0;
    for (const [id, line] of Object.entries(cart)) {
      const src = [...sugg, ...inv].find((i) => i.id === id);
      const est = (line.est && Number(line.est)) || Number(src?.purchasePrice ?? src?.unitPrice ?? 0);
      t += (Number(line.qty) || 0) * est;
    }
    for (const n of newItems) {
      t += (Number(n.qty) || 0) * (Number(n.est) || 0);
    }
    return t;
  }, [cart, newItems, sugg, inv]);

  const addToCart = (id: string, suggestedQty?: number) => {
    const src = [...sugg, ...inv].find((i) => i.id === id);
    const est = Number(src?.purchasePrice ?? src?.unitPrice ?? 0);
    setCart((c) => ({
      ...c,
      [id]: {
        qty: String(suggestedQty ?? manualQty[id] ?? "1"),
        est: est ? String(est) : "",
      },
    }));
  };
  const removeFromCart = (id: string) => {
    const next = { ...cart };
    delete next[id];
    setCart(next);
  };

  const submit = async () => {
    const items = Object.entries(cart)
      .filter(([, l]) => Number(l.qty) > 0)
      .map(([itemId, l]) => ({
        itemId,
        qty: Number(l.qty),
        ...(l.est && Number(l.est) > 0 ? { estUnitCost: Number(l.est) } : {}),
      }));
    const newList = newItems
      .filter((n) => n.name.trim() && Number(n.qty) > 0)
      .map((n) => ({
        name: n.name.trim(),
        qty: Number(n.qty),
        estUnitCost: Number(n.est) || 0,
      }));
    if (items.length === 0 && newList.length === 0) return;

    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/retail/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: unitId || undefined,
          items,
          newItems: newList,
          note: note || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal mengajukan");
      setCart({});
      setNewItems([]);
      setNote("");
      setMsg(
        body.data?.requiresApproval
          ? "Pengajuan dibuat — menunggu persetujuan"
          : "Pengajuan dibuat (langsung disetujui)",
      );
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openReceive = (tx: HistoryTx) => {
    setReceiving(tx);
    const init: Record<string, string> = {};
    for (const it of tx.items) {
      if (it.status !== "FULFILLED") init[it.id] = String(it.qty - (it.fulfilled ?? 0));
    }
    setReceiveRows(init);
  };

  const submitReceive = async () => {
    if (!receiving) return;
    const rows = Object.entries(receiveRows)
      .filter(([, q]) => Number(q) > 0)
      .map(([purchaseItemId, qty]) => ({ purchaseItemId, qty: Number(qty) }));
    if (rows.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/retail/reorder/${receiving.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal terima barang");
      setMsg("Barang diterima");
      setReceiving(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ShoppingCart size={20} /> Pengajuan Belanja
          </h1>
          <p className="text-sm text-muted-foreground">Belanja stok retail (persetujuan otomatis via Approval)</p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali
        </Link>
      </div>

      {(role === "SUPERADMIN" || role === "PIMPINAN") && (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-muted-foreground">Unit:</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Unit saya —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">{err}</div>
      )}
      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600">{msg}</div>
      )}

      {/* Saran otomatis */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Saran Otomatis (stok di bawah minimum)</h2>
        {sugg.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Tidak ada item yang butuh dibelanjakan.</p>
        ) : (
          <div className="space-y-1.5">
            {sugg.map((s) => {
              const inCart = !!cart[s.id];
              return (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={inCart}
                    onChange={(e) => (e.target.checked ? addToCart(s.id, s.suggestedQty) : removeFromCart(s.id))}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      stok {s.currentStock} / min {s.minStock} · saran {s.suggestedQty}
                    </p>
                  </div>
                  {inCart && (
                    <div className="flex shrink-0 items-center gap-1">
                      <input
                        className="w-16 rounded-lg border bg-background px-2 py-1 text-right"
                        type="number" min="1" value={cart[s.id].qty}
                        onChange={(e) => setCart({ ...cart, [s.id]: { ...cart[s.id], qty: e.target.value } })}
                      />
                      <input
                        className="w-24 rounded-lg border bg-background px-2 py-1 text-right"
                        type="number" min="0" placeholder="estimasi"
                        value={cart[s.id].est}
                        onChange={(e) => setCart({ ...cart, [s.id]: { ...cart[s.id], est: e.target.value } })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pilih item lain */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Pilih Item Lain</h2>
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {inv.map((i) => {
            const inCart = !!cart[i.id];
            return (
              <div key={i.id} className={`flex items-center gap-2 text-sm ${inCart ? "opacity-60" : ""}`}>
                <input
                  type="number" min="1" placeholder="qty"
                  className="w-16 rounded-lg border bg-background px-2 py-1 text-right"
                  value={manualQty[i.id] ?? ""}
                  onChange={(e) => setManualQty({ ...manualQty, [i.id]: e.target.value })}
                />
                <button
                  onClick={() => (inCart ? removeFromCart(i.id) : addToCart(i.id))}
                  className="rounded-md border px-2 py-1 text-xs font-semibold"
                  disabled={!inCart && !(Number(manualQty[i.id]) > 0)}
                >
                  {inCart ? "Hapus" : "Tambah"}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    stok {i.currentStock} · {fmt(Number(i.purchasePrice ?? i.unitPrice ?? 0))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Barang baru */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <PackagePlus size={16} /> Barang Baru
          </h2>
          <button
            onClick={() => setNewItems([...newItems, { name: "", qty: "1", est: "" }])}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold"
          >
            + Tambah Baris
          </button>
        </div>
        {newItems.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Belum ada barang baru.</p>
        ) : (
          <div className="space-y-2">
            {newItems.map((n, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <input
                  className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2"
                  placeholder="Nama barang baru"
                  value={n.name}
                  onChange={(e) => setNewItems(newItems.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                />
                <input
                  className="w-16 rounded-lg border bg-background px-2 py-2 text-right"
                  type="number" min="1" value={n.qty}
                  onChange={(e) => setNewItems(newItems.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)))}
                />
                <input
                  className="w-28 rounded-lg border bg-background px-2 py-2 text-right"
                  type="number" min="0" placeholder="harga/biji" value={n.est}
                  onChange={(e) => setNewItems(newItems.map((x, i) => (i === idx ? { ...x, est: e.target.value } : x)))}
                />
                <button
                  onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-rose-600"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ringkasan + submit */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Total Estimasi</span>
          <span className="text-lg font-bold">{fmt(total)}</span>
        </div>
        <input
          className="mb-3 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          placeholder="Catatan (opsional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          onClick={submit}
          disabled={busy || loading || (Object.keys(cart).length === 0 && newItems.length === 0)}
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ShoppingCart size={15} />}
          Ajukan Belanja
        </button>
      </div>

      {/* Riwayat */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <History size={16} /> Riwayat Pengajuan
        </h2>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 size={18} className="mx-auto animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">Belum ada pengajuan</p>
        ) : (
          <div className="divide-y">
            {history.map((tx) => {
              const partiallyOpen =
                tx.status === "APPROVED" && tx.items.some((i) => i.status !== "FULFILLED");
              return (
                <div key={tx.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{tx.unit?.name ?? "Unit"}</p>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        tx.status === "APPROVED"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : tx.status === "REJECTED"
                            ? "bg-rose-500/15 text-rose-600"
                            : "bg-amber-500/15 text-amber-600"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleString("id-ID")} · {fmt(tx.amount)}
                    {tx.createdBy?.name ? ` · ${tx.createdBy.name}` : ""}
                  </p>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {tx.items.map((it) => (
                      <p key={it.id}>
                        {it.isNewItem ? "[BARU] " : ""}
                        {it.name} x{it.qty} — terima {it.fulfilled ?? 0}
                        {it.status !== "FULFILLED" ? ` (${it.status})` : ""}
                      </p>
                    ))}
                  </div>
                  {partiallyOpen && (
                    <button
                      onClick={() => openReceive(tx)}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Truck size={14} /> Terima Barang
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal terima barang */}
      {receiving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Truck size={16} /> Terima Barang
              </h3>
              <button onClick={() => setReceiving(null)} className="rounded-lg p-1.5 hover:text-rose-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {receiving.items
                .filter((i) => i.status !== "FULFILLED")
                .map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
                    <p className="min-w-0 flex-1 truncate">{it.name}</p>
                    <input
                      className="w-20 rounded-lg border bg-background px-2 py-1 text-right"
                      type="number" min="1"
                      max={it.qty - (it.fulfilled ?? 0)}
                      value={receiveRows[it.id] ?? ""}
                      onChange={(e) => setReceiveRows({ ...receiveRows, [it.id]: e.target.value })}
                    />
                  </div>
                ))}
            </div>
            <button
              onClick={submitReceive}
              disabled={busy}
              className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />}
              Konfirmasi Terima
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
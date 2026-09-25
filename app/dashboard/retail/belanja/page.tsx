"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  PackagePlus,
  Loader2,
  History,
  Truck,
  X,
  Copy,
  Ban,
  Check,
  Send,
  ClipboardList,
} from "lucide-react";

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

type ReqItem = {
  id: string;
  itemId: string | null;
  name: string;
  qtyRequested: number;
  estUnitCost: number;
  isNewItem: boolean;
  qtyReceived: number | null;
};
type Req = {
  id: string;
  requestNo: string;
  title: string;
  note?: string | null;
  status: string;
  estimatedTotal: number;
  finalTotal: number | null;
  refusedReason?: string | null;
  supplierName?: string | null;
  supplierPhone?: string | null;
  orderAt?: string | null;
  receivedAt?: string | null;
  receiveNote?: string | null;
  invoiceNumber?: string | null;
  paidAt?: string | null;
  transactionId?: string | null;
  createdAt: string;
  unit?: { id: string; name: string } | null;
  creator?: { name: string } | null;
  orderer?: { name: string } | null;
  receiver?: { name: string } | null;
  payer?: { name: string } | null;
  items: ReqItem[];
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: "Menunggu Pimpinan", cls: "bg-amber-500/15 text-amber-600" },
  ORDERED: { label: "Dipesan", cls: "bg-sky-500/15 text-sky-600" },
  RECEIVED: { label: "Barang Diterima", cls: "bg-violet-500/15 text-violet-600" },
  PAID: { label: "Lunas", cls: "bg-emerald-500/15 text-emerald-600" },
  REJECTED: { label: "Ditolak", cls: "bg-rose-500/15 text-rose-600" },
};

export default function RetailBelanjaPage() {
  const [role, setRole] = useState("STAFF");
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [unitId, setUnitId] = useState("");

  const [inv, setInv] = useState<InvItem[]>([]);
  const [sugg, setSugg] = useState<SuggestItem[]>([]);
  const [list, setList] = useState<Req[]>([]);

  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [newItems, setNewItems] = useState<NewItem[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [manualQty, setManualQty] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [orderFor, setOrderFor] = useState<Req | null>(null);
  const [orderName, setOrderName] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [waCopied, setWaCopied] = useState(false);

  const [receiveFor, setReceiveFor] = useState<Req | null>(null);
  const [receiveRows, setReceiveRows] = useState<Record<string, string>>({});
  const [receiveNote, setReceiveNote] = useState("");

  const [payFor, setPayFor] = useState<Req | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [finalTotal, setFinalTotal] = useState("");

  const [rejectFor, setRejectFor] = useState<Req | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isHighRole = role === "PIMPINAN" || role === "SUPERADMIN";
  const canOperate = role === "MANAGER" || role === "STAFF";

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        const r = s?.user?.role || "STAFF";
        setRole(r);
        if (r === "SUPERADMIN" || r === "PIMPINAN") {
          fetch("/api/units")
            .then((x) => x.json())
            .then((b) => setUnits(Array.isArray(b) ? b : b.data || []))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const q = unitId ? new URLSearchParams({ unitId }).toString() : "";
      const [sugRes, itRes, hisRes] = await Promise.all([
        fetch(`/api/retail/reorder/suggest${q ? `?${q}` : ""}`),
        fetch(`/api/inventory?limit=500`),
        fetch(`/api/purchase-requests?limit=20${q ? `&${q}` : ""}`),
      ]);
      const sugBody = await sugRes.json();
      const itBody = await itRes.json();
      const hisBody = await hisRes.json();
      if (!sugRes.ok) throw new Error(sugBody.error || "Gagal memuat saran");
      if (!itRes.ok) throw new Error(itBody.error || "Gagal memuat stok");
      if (!hisRes.ok) throw new Error(hisBody.error || "Gagal memuat riwayat");
      const listItems = (
        itBody.data && Array.isArray(itBody.data)
          ? itBody.data
          : itBody.items || []
      ) as InvItem[];
      setInv(listItems.filter((x: any) => x.isActive !== false));
      setSugg(sugBody.data || []);
      setList(hisBody.data || []);
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
      const est =
        (line.est && Number(line.est)) || Number(src?.purchasePrice ?? src?.unitPrice ?? 0);
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
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: unitId || undefined,
          title: title.trim() || undefined,
          items,
          newItems: newList,
          note: note.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal mengajukan");
      setCart({});
      setNewItems([]);
      setTitle("");
      setNote("");
      setMsg(`Pengajuan ${body.data?.requestNo ?? ""} dikirim — pemberitahuan ke Pimpinan`);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteRequest = async (id: string) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/purchase-requests/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menghapus");
      setMsg("Pengajuan dihapus");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openOrder = (r: Req) => {
    setOrderFor(r);
    setOrderName(r.supplierName || "");
    setOrderPhone(r.supplierPhone || "");
    setWaCopied(false);
  };

  const buildWaText = (r: Req) => {
    const lines = [
      `Pengajuan Belanja ${r.unit?.name ?? ""} (${r.requestNo})`,
      ...r.items.map(
        (i) => `${i.isNewItem ? "[BARU] " : ""}${i.name} - ${i.qtyRequested} pcs @ ${fmt(i.estUnitCost)}`,
      ),
      `Total estimasi: ${fmt(r.estimatedTotal)}`,
    ];
    return lines.join("\n");
  };

  const copyWa = async (r: Req) => {
    try {
      await navigator.clipboard.writeText(buildWaText(r));
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2000);
    } catch {}
  };

  const submitOrder = async () => {
    if (!orderFor) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/purchase-requests/${orderFor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "order",
          supplierName: orderName.trim(),
          supplierPhone: orderPhone.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memesan");
      setMsg("Pengajuan diorder — pemberitahuan terkirim ke unit");
      setOrderFor(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openReceive = (r: Req) => {
    setReceiveFor(r);
    const init: Record<string, string> = {};
    for (const it of r.items) init[it.id] = String(it.qtyRequested);
    setReceiveRows(init);
    setReceiveNote("");
  };

  const submitReceive = async () => {
    if (!receiveFor) return;
    const rows = Object.entries(receiveRows)
      .filter(([, q]) => q !== "" && Number(q) >= 0)
      .map(([itemId, qtyReceived]) => ({ itemId, qtyReceived: Number(qtyReceived) }));
    if (rows.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/purchase-requests/${receiveFor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive", rows, note: receiveNote.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal lapor terima");
      setMsg("Serah terima dicatat — menunggu Pimpinan mencocokkan invoice");
      setReceiveFor(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const defaultFinal = (r: Req) =>
    r.items.reduce((acc, i) => acc + (i.qtyReceived ?? i.qtyRequested) * i.estUnitCost, 0);

  const openPay = (r: Req) => {
    setPayFor(r);
    setInvoiceNo(r.invoiceNumber || "");
    setFinalTotal(String(defaultFinal(r)));
  };

  const submitPay = async () => {
    if (!payFor) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/purchase-requests/${payFor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay",
          invoiceNumber: invoiceNo.trim(),
          finalTotal: Number(finalTotal),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal membayar");
      setMsg("Pembayaran dicatat — transaksi belanja dibuat");
      setPayFor(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openReject = (r: Req) => {
    setRejectFor(r);
    setRejectReason("");
  };

  const submitReject = async () => {
    if (!rejectFor) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/purchase-requests/${rejectFor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectReason.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menolak");
      setMsg("Pengajuan ditolak");
      setRejectFor(null);
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
            <ShoppingCart size={20} /> Belanja Stok
          </h1>
          <p className="text-sm text-muted-foreground">
            {canOperate
              ? "Ajukan belanja → Pimpinan pesan ke supplier → terima barang → Pimpinan bayar sesuai invoice"
              : "Tinjau pengajuan unit, pesan ke supplier, dan bayar sesuai invoice"}
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali
        </Link>
      </div>

      {isHighRole && (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-muted-foreground">Unit:</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Semua unit lembaga —</option>
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

      {canOperate && (
        <>
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
                        onChange={(e) =>
                          e.target.checked ? addToCart(s.id, s.suggestedQty) : removeFromCart(s.id)
                        }
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
            <h2 className="mb-2 text-sm font-semibold">Pilih Item</h2>
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
                <PackagePlus size={16} /> Barang Baru (belum ada di master)
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
              className="mb-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Judul (opsional, mis. Belanja rutin mingguan)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
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
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Ajukan Belanja (Kirim Pemberitahuan ke Pimpinan)
            </button>
          </div>
        </>
      )}

      {/* Riwayat */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <History size={16} /> Riwayat Pengajuan
        </h2>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 size={18} className="mx-auto animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">Belum ada pengajuan</p>
        ) : (
          <div className="divide-y">
            {list.map((r) => {
              const meta = STATUS_META[r.status] ?? STATUS_META.REQUESTED;
              return (
                <div key={r.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {r.unit?.name ?? "Unit"} <span className="text-muted-foreground">· {r.requestNo}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString("id-ID")} · {fmt(r.estimatedTotal)}
                        {r.creator?.name ? ` · ${r.creator.name}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>

                  {r.title && <p className="mt-1 text-xs font-medium text-foreground/80">{r.title}</p>}

                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {r.items.map((it) => (
                      <p key={it.id}>
                        {it.isNewItem ? "[BARU] " : ""}
                        {it.name} x{it.qtyRequested}
                        {it.qtyReceived !== null && it.qtyReceived !== undefined
                          ? ` — terima ${it.qtyReceived}`
                          : ""}
                      </p>
                    ))}
                  </div>

                  {r.note && <p className="mt-1 text-xs text-muted-foreground/80">Catatan: {r.note}</p>}
                  {r.status === "REJECTED" && r.refusedReason && (
                    <p className="mt-1 text-xs text-rose-600">Alasan: {r.refusedReason}</p>
                  )}
                  {r.status === "PAID" && (
                    <p className="mt-1 text-xs text-emerald-600">
                      Invoice {r.invoiceNumber} · dibayar {fmt(r.finalTotal ?? 0)}
                      {r.paidAt ? ` · ${new Date(r.paidAt).toLocaleString("id-ID")}` : ""}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.status === "REQUESTED" && !isHighRole && (
                      <button
                        onClick={() => deleteRequest(r.id)}
                        disabled={busy}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-rose-600 disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    )}
                    {r.status === "REQUESTED" && isHighRole && (
                      <>
                        <button
                          onClick={() => openOrder(r)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                        >
                          <ClipboardList size={14} /> Pesan ke Supplier
                        </button>
                        <button
                          onClick={() => openReject(r)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-rose-600 disabled:opacity-50"
                        >
                          <Ban size={14} /> Tolak
                        </button>
                      </>
                    )}
                    {r.status === "ORDERED" && canOperate && (
                      <button
                        onClick={() => openReceive(r)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <Truck size={14} /> Terima & Lapor
                      </button>
                    )}
                    {r.status === "RECEIVED" && isHighRole && (
                      <button
                        onClick={() => openPay(r)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <Check size={14} /> Terima & Bayar (Invoice)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal order supplier */}
      {orderFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardList size={16} /> Pesan ke Supplier
              </h3>
              <button onClick={() => setOrderFor(null)} className="rounded-lg p-1.5 hover:text-rose-600">
                <X size={16} />
              </button>
            </div>
            <pre className="mb-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
              {buildWaText(orderFor)}
            </pre>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                onClick={() => copyWa(orderFor)}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
              >
                <Copy size={13} /> {waCopied ? "Tersalin!" : "Salin Pesanan"}
              </button>
              <a
                href={`https://wa.me/${orderPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(buildWaText(orderFor))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
              >
                <Send size={13} /> Kirim WhatsApp
              </a>
            </div>
            <div className="space-y-2 text-sm">
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                placeholder="Nama supplier (mis. Toko Berkah)"
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
              />
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                placeholder="No. WhatsApp supplier (08xx / 628xx)"
                value={orderPhone}
                onChange={(e) => setOrderPhone(e.target.value)}
              />
            </div>
            <button
              onClick={submitOrder}
              disabled={busy || !orderName.trim()}
              className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ClipboardList size={15} />}
              Konfirmasi Pesanan
            </button>
          </div>
        </div>
      )}

      {/* Modal terima barang */}
      {receiveFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Truck size={16} /> Terima & Lapor Serah Terima
              </h3>
              <button onClick={() => setReceiveFor(null)} className="rounded-lg p-1.5 hover:text-rose-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {receiveFor.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
                  <p className="min-w-0 flex-1 truncate">{it.name}</p>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input
                      className="w-20 rounded-lg border bg-background px-2 py-1 text-right"
                      type="number" min="0" max={it.qtyRequested}
                      value={receiveRows[it.id] ?? ""}
                      onChange={(e) => setReceiveRows({ ...receiveRows, [it.id]: e.target.value })}
                    />
                    / {it.qtyRequested}
                  </label>
                </div>
              ))}
            </div>
            <input
              className="mt-3 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Catatan serah terima (opsional)"
              value={receiveNote}
              onChange={(e) => setReceiveNote(e.target.value)}
            />
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

      {/* Modal bayar sesuai invoice */}
      {payFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Check size={16} /> Cocokkan Invoice & Bayar
              </h3>
              <button onClick={() => setPayFor(null)} className="rounded-lg p-1.5 hover:text-rose-600">
                <X size={16} />
              </button>
            </div>
            <div className="mb-3 rounded-lg bg-muted p-3 text-xs">
              {payFor.items.map((it) => (
                <p key={it.id} className="flex justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate">{it.name}</span>
                  <span className="text-muted-foreground">
                    pesan {it.qtyRequested} · terima {it.qtyReceived ?? 0}
                  </span>
                </p>
              ))}
            </div>
            <div className="space-y-2 text-sm">
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                placeholder="No. Invoice dari supplier"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
              />
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-right"
                type="number" min="0"
                placeholder="Nominal sesuai invoice"
                value={finalTotal}
                onChange={(e) => setFinalTotal(e.target.value)}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Transaksi yang dicatat</span>
              <span className="font-bold">{fmt(Number(finalTotal) || 0)}</span>
            </div>
            <button
              onClick={submitPay}
              disabled={busy || !invoiceNo.trim() || !(Number(finalTotal) > 0)}
              className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Bayar & Catat Transaksi
            </button>
          </div>
        </div>
      )}

      {/* Modal tolak */}
      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Ban size={16} /> Tolak Pengajuan
              </h3>
              <button onClick={() => setRejectFor(null)} className="rounded-lg p-1.5 hover:text-rose-600">
                <X size={16} />
              </button>
            </div>
            <textarea
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Alasan penolakan (wajib)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <button
              onClick={submitReject}
              disabled={busy || !rejectReason.trim()}
              className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
              Konfirmasi Tolak
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
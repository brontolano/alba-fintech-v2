"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PackagePlus,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { ImageUpload } from "@/components/retail/ImageUpload";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const todayWib = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

type Session = {
  user?: { role?: string; unitId?: string };
};
type Unit = { id: string; name: string };
type Owner = { id: string; name: string };
type StockItem = { id: string; name: string; sku: string; currentStock: number };
type ApprovalOpt = { id: string; description: string; transactionId: string };

type Row = {
  key: number;
  mode: "existing" | "new";
  inventoryItemId: string;
  name: string;
  sku: string;
  category: string;
  imageUrl: string;
  qty: string;
  unitCost: string;
  minStock: string;
  ownerId: string;
  marginType: "PERCENT" | "FIXED";
  marginValue: string;
};

const blankRow = (key: number): Row => ({
  key,
  mode: "existing",
  inventoryItemId: "",
  name: "",
  sku: "",
  category: "",
  imageUrl: "",
  qty: "",
  unitCost: "",
  minStock: "",
  ownerId: "",
  marginType: "PERCENT",
  marginValue: "",
});

function rowError(r: Row): string | null {
  const qty = Number(r.qty);
  if (!Number.isInteger(qty) || qty < 1) return "Qty minimal 1";
  if (Number(r.unitCost) < 0 || r.unitCost === "")
    return "Harga beli wajib diisi";
  if (r.mode === "existing") {
    if (!r.inventoryItemId) return "Pilih barang";
    return null;
  }
  if (!r.name.trim()) return "Nama wajib diisi";
  if (!r.sku.trim()) return "SKU wajib diisi";
  return null;
}

export default function BatchKedatanganPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [date, setDate] = useState(todayWib());
  const [sourceType, setSourceType] = useState("PEMBELIAN");
  const [sourceRef, setSourceRef] = useState("");
  const [note, setNote] = useState("");
  const [unitId, setUnitId] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow(1)]);
  const [nextKey, setNextKey] = useState(2);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        setSession(s);
        const r2 = String(s?.user?.role || "").toUpperCase();
        if (
          r2 === "SUPERADMIN" ||
          r2 === "PIMPINAN" ||
          r2 === "MANAGER" ||
          r2 === "STAFF"
        ) {
          if (r2 === "MANAGER" || r2 === "STAFF") {
            setUnitId(s.user.unitId || "");
          } else {
            fetch("/api/units?active=true")
              .then((r3) => r3.json())
              .then((b) => setUnits(b.units || b.data || []))
              .catch(() => setUnits([]));
          }
        } else {
          router.push("/login");
        }
      })
      .catch(() => setSession({}))
      .finally(() => setLoading(false));
  }, [router]);

  const r: string = String(session?.user?.role || "").toUpperCase();
  const canWrite =
    r === "PIMPINAN" || r === "MANAGER" || r === "STAFF";

  // Data pendukung scope unit aktif: barang, pemilik, pengajuan disetujui.
  useEffect(() => {
    if (!unitId) return;
    fetch(`/api/inventory?limit=500&unitId=${unitId}`)
      .then((res) => res.json())
      .then((b) =>
        setStockItems(
          (Array.isArray(b.data) ? b.data : []).map((i: any) => ({
            id: i.id,
            name: i.name,
            sku: i.sku,
            currentStock: i.currentStock ?? 0,
          })),
        ),
      )
      .catch(() => setStockItems([]));
    fetch(`/api/retail/consignments/owners?unitId=${unitId}`)
      .then((res) => res.json())
      .then((b) => setOwners(Array.isArray(b.data) ? b.data : []))
      .catch(() => setOwners([]));
    fetch(`/api/approvals?unitId=${unitId}`)
      .then((res) => res.json())
      .then((b) =>
        setApprovals(
          (Array.isArray(b.data) ? b.data : [])
            .filter((a: any) => a.status === "APPROVED")
            .map((a: any) => ({
              id: a.id,
              description: a.description || a.transactionId,
              transactionId: a.transactionId,
            })),
        ),
      )
      .catch(() => setApprovals([]));
  }, [unitId]);

  const patchRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const addRow = () => {
    setRows((rs) => [...rs, blankRow(nextKey)]);
    setNextKey((k) => k + 1);
  };

  const removeRow = (key: number) =>
    setRows((rs) => (rs.length <= 1 ? rs : rs.filter((x) => x.key !== key)));

  const totalQty = rows.reduce(
    (s, x) => s + (Number.isInteger(Number(x.qty)) ? Number(x.qty) : 0),
    0,
  );
  const totalCost = rows.reduce(
    (s, x) => s + (Number(x.qty) || 0) * (Number(x.unitCost) || 0),
    0,
  );
  const rowErrors = rows.map(rowError);
  const validRows = rows.filter((_, i) => !rowErrors[i]).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!unitId) {
      setErr("Unit belum dipilih");
      return;
    }
    if (validRows === 0) {
      setErr("Belum ada baris valid — periksa qty, barang, dan harga");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/retail/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          sourceType,
          sourceRef: sourceRef || null,
          note: note.trim() || null,
          unitId,
          lines: rows
            .filter((_, i) => !rowErrors[i])
            .map((x) => ({
              ...(x.mode === "existing"
                ? { inventoryItemId: x.inventoryItemId }
                : {
                    name: x.name.trim(),
                    sku: x.sku.trim(),
                    category: x.category.trim() || null,
                    imageUrl: x.imageUrl || null,
                    minStock: x.minStock ? Number(x.minStock) : 0,
                  }),
              qty: Number(x.qty),
              unitCost: Number(x.unitCost),
              ...(x.ownerId
                ? {
                    ownerId: x.ownerId,
                    marginType: x.marginType,
                    marginValue: Number(x.marginValue) || 0,
                  }
                : {}),
            })),
        }),
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal menyimpan batch");
      setMsg(
        `Batch ${b.data.batchNo} tersimpan · ${b.data.totalQty} pcs · modal ${fmt(Number(b.data.totalCost))}`,
      );
      setRows([blankRow(nextKey)]);
      setNextKey((k) => k + 1);
      setNote("");
      setSourceRef("");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/retail/inventory"
          className="text-muted-foreground hover:text-foreground"
        >
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold">Kedatangan Barang</h1>
          <p className="text-sm text-muted-foreground">
            Satu batch = satu kedatangan · modal = Σ qty × harga beli
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-muted-foreground">
          <Loader2 size={18} className="mx-auto animate-spin" />
        </div>
      ) : !canWrite ? (
        <p className="py-3 text-sm text-rose-600">
          Anda tidak memiliki akses mencatat kedatangan.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Header batch */}
          <div className="grid gap-2 rounded-xl border bg-card p-4 sm:grid-cols-2">
            {["SUPERADMIN", "PIMPINAN"].includes(r) && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium">Unit</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Pilih unit —</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium">
                Tanggal datang (otomatis)
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Sumber</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="PEMBELIAN">Pembelian (pengajuan pimpinan)</option>
                <option value="TITIPAN">Titipan UMKM</option>
                <option value="LAIN">Lainnya</option>
              </select>
            </div>
            {sourceType === "PEMBELIAN" && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium">
                  Ref pengajuan disetujui (opsional)
                </label>
                <select
                  value={sourceRef}
                  onChange={(e) => setSourceRef(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Tanpa ref —</option>
                  {approvals.map((a) => (
                    <option key={a.id} value={a.transactionId}>
                      {a.description}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium">Catatan</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="cth: Pengiriman supplier Senin"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Baris barang */}
          {rows.map((x, idx) => {
            const e = rowErrors[idx];
            const lineTotal = (Number(x.qty) || 0) * (Number(x.unitCost) || 0);
            return (
              <div key={x.key} className="space-y-2 rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-xs">
                    {(["existing", "new"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => patchRow(x.key, { mode: m })}
                        className={`rounded-lg border px-2 py-1 ${
                          x.mode === m ? "border-primary bg-primary/10" : "bg-background"
                        }`}
                      >
                        {m === "existing" ? "Dari database" : "Barang baru"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(x.key)}
                    disabled={rows.length <= 1}
                    className="text-xs text-rose-600 disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {x.mode === "existing" ? (
                  <select
                    value={x.inventoryItemId}
                    onChange={(e) =>
                      patchRow(x.key, { inventoryItemId: e.target.value })
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— Pilih barang unit ini —</option>
                    {stockItems.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.sku}) · stok {i.currentStock}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={x.name}
                      onChange={(e) => patchRow(x.key, { name: e.target.value })}
                      placeholder="Nama barang baru"
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      value={x.sku}
                      onChange={(e) => patchRow(x.key, { sku: e.target.value })}
                      placeholder="SKU (unik)"
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      value={x.category}
                      onChange={(e) =>
                        patchRow(x.key, { category: e.target.value })
                      }
                      placeholder="Kategori (opsional)"
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      value={x.minStock}
                      onChange={(e) =>
                        patchRow(x.key, { minStock: e.target.value })
                      }
                      placeholder="Stok min (opsional)"
                      type="number"
                      min="0"
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <div className="sm:col-span-2">
                      <ImageUpload
                        value={x.imageUrl}
                        onChange={(url) =>
                          patchRow(x.key, { imageUrl: url ?? "" })
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground">Qty</label>
                    <input
                      value={x.qty}
                      onChange={(e) => patchRow(x.key, { qty: e.target.value })}
                      type="number"
                      min="1"
                      step="1"
                      className="mt-0.5 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-muted-foreground">
                      Harga beli / modal
                    </label>
                    <input
                      value={x.unitCost}
                      onChange={(e) =>
                        patchRow(x.key, { unitCost: e.target.value })
                      }
                      type="number"
                      min="0"
                      step="100"
                      className="mt-0.5 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-muted-foreground">
                      Pemilik (opsional = titipan)
                    </label>
                    <select
                      value={x.ownerId}
                      onChange={(e) =>
                        patchRow(x.key, { ownerId: e.target.value })
                      }
                      className="mt-0.5 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— Bukan titipan —</option>
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {x.ownerId && (
                    <div>
                      <label className="block text-xs text-muted-foreground">
                        Margin
                      </label>
                      <div className="mt-0.5 flex gap-1">
                        <select
                          value={x.marginType}
                          onChange={(e) =>
                            patchRow(x.key, {
                              marginType: e.target.value as "PERCENT" | "FIXED",
                            })
                          }
                          className="w-1/2 rounded-lg border bg-background px-2 py-2 text-sm"
                        >
                          <option value="PERCENT">% persen</option>
                          <option value="FIXED">Rp tetap</option>
                        </select>
                        <input
                          value={x.marginValue}
                          onChange={(e) =>
                            patchRow(x.key, { marginValue: e.target.value })
                          }
                          type="number"
                          min="0"
                          className="w-1/2 rounded-lg border bg-background px-2 py-2 text-sm text-right"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={e ? "text-rose-600" : "text-muted-foreground"}>
                    {e ?? (x.ownerId ? "Baris titipan" : "Baris pondok")}
                  </span>
                  <span className="font-semibold">{fmt(lineTotal)}</span>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-sm font-semibold hover:border-primary/50"
          >
            <Plus size={14} /> Tambah baris
          </button>

          {/* Total + simpan */}
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="text-sm">
              <p className="text-muted-foreground">
                {validRows} baris valid · {totalQty} pcs
              </p>
              <p className="text-lg font-bold">Modal masuk: {fmt(totalCost)}</p>
            </div>
            <button
              type="submit"
              disabled={busy || validRows === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <PackagePlus size={15} />
              )}
              Simpan Batch
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

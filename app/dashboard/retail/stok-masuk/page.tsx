"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PackagePlus,
  PackageOpen,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Printer,
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
type Owner = { id: string; name: string; phone?: string | null };
type StockItem = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  isConsignment?: boolean;
  ownerId?: string | null;
};

// Ketik + saran dari database (pengganti dropdown native).
function ItemPicker({
  items,
  value,
  onPick,
  placeholder,
}: {
  items: StockItem[];
  value: string;
  onPick: (id: string) => void;
  placeholder: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.id === value);
  const query = q.trim().toLowerCase();
  const matches = (query
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.sku.toLowerCase().includes(query),
      )
    : items
  ).slice(0, 6);

  return (
    <div className="relative">
      <input
        value={selected ? `${selected.name} (${selected.sku})` : q}
        onChange={(e) => {
          setQ(e.target.value);
          if (value) onPick("");
          setOpen(true);
        }}
        onFocus={() => {
          setQ("");
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-card shadow-lg">
          {matches.map((i) => (
            <button
              key={i.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(i.id);
                setQ("");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{i.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {i.sku} · stok {i.currentStock}
                </span>
              </span>
              {i.isConsignment && (
                <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-800">
                  UMKM
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && query && matches.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shadow-lg">
          Tidak ketemu — pakai mode “Barang baru”.
        </div>
      )}
    </div>
  );
}
type ApprovalOpt = { id: string; description: string; transactionId: string };
type Kind = "pondok" | "titipan";

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
  marginType: "PERCENT",
  marginValue: "",
});

function rowError(r: Row): string | null {
  const qty = Number(r.qty);
  if (!Number.isInteger(qty) || qty < 1) return "Qty minimal 1";
  if (r.unitCost === "" || Number(r.unitCost) < 0)
    return "Harga modal wajib diisi";
  if (r.mode === "existing") {
    if (!r.inventoryItemId) return "Pilih barang";
    return null;
  }
  if (!r.name.trim()) return "Nama wajib diisi";
  if (!r.sku.trim()) return "SKU wajib diisi";
  return null;
}

type Nota = {
  batchNo: string;
  date: string;
  ownerName: string;
  ownerPhone: string | null;
  lines: { name: string; qty: number; cost: number; total: number }[];
  totalQty: number;
  totalCost: number;
};

export default function StokMasukPage() {
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

  const [kind, setKind] = useState<Kind>("pondok");
  const [date, setDate] = useState(todayWib());
  const [sourceRef, setSourceRef] = useState("");
  const [note, setNote] = useState("");
  const [unitId, setUnitId] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow(1)]);
  const [nextKey, setNextKey] = useState(2);

  // Titipan: pilih / buat UMKM (No WA aktif wajib).
  const [ownerId, setOwnerId] = useState("");
  const [newOwner, setNewOwner] = useState({ name: "", phone: "", address: "" });
  const [nota, setNota] = useState<Nota | null>(null);

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
  // Dropdown ref pengajuan hanya untuk yang boleh baca approvals (Staff = 403).
  const canSeeApprovals = r === "PIMPINAN" || r === "MANAGER" || r === "SUPERADMIN";

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
            isConsignment: Boolean(i.isConsignment),
            ownerId: i.isConsignmentOwner ?? null,
          })),
        ),
      )
      .catch(() => setStockItems([]));
    fetch(`/api/retail/consignments/owners?unitId=${unitId}`)
      .then((res) => res.json())
      .then((b) => setOwners(Array.isArray(b.data) ? b.data : []))
      .catch(() => setOwners([]));
    if (!["PIMPINAN", "MANAGER", "SUPERADMIN"].includes(
      String((session as any)?.user?.role || "").toUpperCase(),
    )) {
      setApprovals([]);
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const patchRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const addRow = () => {
    setRows((rs) => [...rs, blankRow(nextKey)]);
    setNextKey((k) => k + 1);
  };

  const removeRow = (key: number) =>
    setRows((rs) => (rs.length <= 1 ? rs : rs.filter((x) => x.key !== key)));

  const createOwner = async (): Promise<string> => {
    const res = await fetch("/api/retail/consignments/owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newOwner.name.trim(),
        phone: newOwner.phone.trim(),
        address: newOwner.address.trim() || null,
        unitId,
        whatsappVerified: true,
      }),
    });
    const b = await res.json();
    if (!res.ok) throw new Error(b.error || "Gagal mendaftar UMKM");
    const created = b.data;
    setOwners((o) => [...o, created]);
    setOwnerId(created.id);
    setNewOwner({ name: "", phone: "", address: "" });
    return created.id as string;
  };

  // Pool saran: pondok → barang milik unit; titipan → barang UMKM terpilih.
  const pool = stockItems.filter((i) =>
    kind === "pondok"
      ? !i.isConsignment
      : i.isConsignment && (!ownerId || i.ownerId === ownerId),
  );

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

  const printNota = (n: Nota) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = n.lines
      .map(
        (l) => `<tr><td style="padding:4px 8px;">${l.name}</td>` +
          `<td style="padding:4px 8px;text-align:right;">${l.qty}x</td>` +
          `<td style="padding:4px 8px;text-align:right;">${fmt(l.total)}</td></tr>`,
      )
      .join("");
    w.document.write(
      `<html><head><title>Nota Titipan ${n.batchNo}</title>` +
        `<style>@media print{@page{size:80mm auto;margin:2mm;}}` +
        `body{font-family:monospace;padding:4px;width:72mm;}table{width:100%;border-collapse:collapse;}td{font-size:12px;}</style></head><body>` +
        `<h2 style="text-align:center;">NOTA TITIPAN UMKM</h2>` +
        `<p style="font-size:12px;">No: ${n.batchNo}<br>Tanggal: ${n.date}<br>UMKM: ${n.ownerName}</p>` +
        `<table><tbody>${rowsHtml}</tbody></table>` +
        `<p style="text-align:right;font-size:12px;">Total ${n.totalQty} pcs<br><b>Modal ${fmt(n.totalCost)}</b></p>` +
        `<p style="text-align:center;font-size:10px;">Barang dititip, dibayar setelah terjual. Terima kasih!</p>` +
        `</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const waNota = (n: Nota) => {
    if (!n.ownerPhone) {
      setErr("UMKM ini belum punya No WA aktif");
      return;
    }
    const digits = n.ownerPhone.replace(/\D/g, "");
    const to = digits.startsWith("62") ? digits : `62${digits.replace(/^0/, "")}`;
    const text = encodeURIComponent(
      `NOTA TITIPAN UMKM\nNo: ${n.batchNo}\nTanggal: ${n.date}\nUMKM: ${n.ownerName}\n\n` +
        n.lines.map((l) => `${l.name} x${l.qty} = ${fmt(l.total)}`).join("\n") +
        `\n\nTotal ${n.totalQty} pcs\nModal ${fmt(n.totalCost)}\n\nTerima kasih!`,
    );
    window.open(`https://wa.me/${to}?text=${text}`, "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setNota(null);
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
      // Jalur titipan: pastikan UMKM + WA aktif dulu.
      let useOwnerId = "";
      let ownerName = "";
      let ownerPhone: string | null = null;
      if (kind === "titipan") {
        if (ownerId) {
          const o = owners.find((x) => x.id === ownerId);
          if (!o) throw new Error("Pilih UMKM dulu");
          useOwnerId = o.id;
          ownerName = o.name;
          ownerPhone = o.phone ?? null;
        } else {
          if (!newOwner.name.trim() || !newOwner.phone.trim()) {
            throw new Error("Isi nama UMKM + No WA aktif, atau pilih yang sudah ada");
          }
          useOwnerId = await createOwner();
          const o = owners.find((x) => x.id === useOwnerId);
          ownerName = newOwner.name.trim() || o?.name || "UMKM";
          ownerPhone = newOwner.phone.trim();
        }
      }

      const lines = rows
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
          ...(kind === "titipan"
            ? {
                ownerId: useOwnerId,
                marginType: x.marginType,
                marginValue: Number(x.marginValue) || 0,
              }
            : {}),
        }));

      const res = await fetch("/api/retail/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          sourceType: kind === "pondok" ? "PEMBELIAN" : "TITIPAN",
          sourceRef: sourceRef || null,
          note: note.trim() || null,
          unitId,
          asDraft: true,
          lines,
        }),
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal menyimpan draf");
      setMsg(
        `Draf ${b.data.batchNo} tersimpan · menunggu review Manager · modal ${fmt(Number(b.data.totalCost))}`,
      );
      if (kind === "titipan") {
        setNota({
          batchNo: b.data.batchNo,
          date,
          ownerName,
          ownerPhone,
          lines: lines.map((l: any, i: number) => ({
            name: l.name || rows.filter((_, j) => !rowErrors[j])[i]?.name || `Baris ${i + 1}`,
            qty: l.qty,
            cost: l.unitCost,
            total: l.qty * l.unitCost,
          })),
          totalQty: b.data.totalQty,
          totalCost: Number(b.data.totalCost),
        });
      }
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
          <h1 className="text-xl font-bold">Stok Masuk</h1>
          <p className="text-sm text-muted-foreground">
            Draf kedatangan → review Manager → stok bertambah saat approve
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { key: "pondok", label: "Barang Pondok", desc: "Milik unit" },
            { key: "titipan", label: "Titipan UMKM", desc: "Nota + WA pemilik" },
          ] as { key: Kind; label: string; desc: string }[]
        ).map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => {
              setKind(o.key);
              setErr(null);
              setMsg(null);
              setNota(null);
            }}
            className={`rounded-xl border p-3 text-left ${
              kind === o.key
                ? "border-primary bg-primary/10"
                : "bg-card hover:border-primary/50"
            }`}
          >
            <p className="text-sm font-semibold">{o.label}</p>
            <p className="text-xs text-muted-foreground">{o.desc}</p>
          </button>
        ))}
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
          {nota && (
            <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold">
                Nota Titipan {nota.batchNo} · {nota.ownerName}
              </p>
              <p className="text-xs text-muted-foreground">
                {nota.totalQty} pcs · modal {fmt(nota.totalCost)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => printNota(nota)}
                  className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 text-sm font-semibold"
                >
                  <Printer size={14} /> Cetak
                </button>
                <button
                  type="button"
                  onClick={() => waNota(nota)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Kirim WA UMKM
                </button>
              </div>
            </div>
          )}

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
            {kind === "pondok" && canSeeApprovals && (
              <div>
                <label className="block text-xs font-medium">
                  Ref pengajuan (opsional)
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

          {kind === "titipan" && (
            <div className="space-y-2 rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold">UMKM (wajib No WA aktif)</h2>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Buat UMKM baru di bawah —</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              {!ownerId && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={newOwner.name}
                    onChange={(e) =>
                      setNewOwner({ ...newOwner, name: e.target.value })
                    }
                    placeholder="Nama UMKM baru"
                    className="rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    value={newOwner.phone}
                    onChange={(e) =>
                      setNewOwner({ ...newOwner, phone: e.target.value })
                    }
                    placeholder="No WA aktif (08…)"
                    inputMode="tel"
                    className="rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    value={newOwner.address}
                    onChange={(e) =>
                      setNewOwner({ ...newOwner, address: e.target.value })
                    }
                    placeholder="Alamat (opsional)"
                    className="rounded-lg border bg-background px-3 py-2 text-sm sm:col-span-2"
                  />
                </div>
              )}
            </div>
          )}

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
                  <ItemPicker
                    items={pool}
                    value={x.inventoryItemId}
                    onPick={(id) => patchRow(x.key, { inventoryItemId: id })}
                    placeholder={
                      kind === "pondok"
                        ? "Ketik nama / SKU barang pondok…"
                        : ownerId
                          ? "Ketik nama / SKU barang UMKM ini…"
                          : "Ketik nama / SKU barang titipan…"
                    }
                  />
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
                      {kind === "titipan" ? "Harga modal (pemilik)" : "Harga beli"}
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

                {kind === "titipan" && (
                  <div>
                    <label className="block text-xs text-muted-foreground">
                      Margin (harga jual otomatis)
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

                <div className="flex items-center justify-between text-xs">
                  <span className={e ? "text-rose-600" : "text-muted-foreground"}>
                    {e ?? "Baris valid"}
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
              Simpan Draf
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

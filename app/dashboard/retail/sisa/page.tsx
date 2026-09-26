"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Printer } from "lucide-react";
import { printData, escapeHtml } from "@/lib/print";

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

type Owner = { id: string; name: string };
type SisaItem = {
  inventoryItemId: string;
  name: string;
  imageUrl: string | null;
  ownerId: string;
  ownerName: string;
  tercatat: number;
  soldToday: number;
  costPrice: number;
  agreedPrice: number;
};
type HistoryRow = {
  id: string;
  ownerName: string;
  totalSold: number;
  totalHak: number;
  status: string;
  by: string;
  createdAt: string;
};

export default function SisaPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [date, setDate] = useState(todayWib());
  const [items, setItems] = useState<SisaItem[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{
    totalSold: number;
    totalHak: number;
    lines: any[];
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) =>
        setIsManager(String(s?.user?.role || "").toUpperCase() === "MANAGER"),
      )
      .catch(() => setIsManager(false));
    fetch("/api/retail/consignments/owners")
      .then((r) => r.json())
      .then((b) => setOwners(Array.isArray(b.data) ? b.data : []))
      .catch(() => setOwners([]));
  }, []);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ date });
      if (ownerId) params.set("ownerId", ownerId);
      const res = await fetch(`/api/retail/sisa?${params.toString()}`);
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal memuat");
      setItems(b.data.items || []);
      setHistory(b.data.history || []);
      setCounts({});
      setResult(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, date]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const payload = items
      .filter((i) => counts[i.inventoryItemId] !== undefined && counts[i.inventoryItemId] !== "")
      .map((i) => ({
        inventoryItemId: i.inventoryItemId,
        counted: Number(counts[i.inventoryItemId]),
      }))
      .filter((x) => Number.isInteger(x.counted) && x.counted >= 0);
    if (payload.length === 0) {
      setErr("Isi hasil hitung minimal satu barang");
      return;
    }
    setBusy("save");
    try {
      const res = await fetch("/api/retail/sisa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: ownerId || null,
          date,
          counts: payload,
        }),
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal menyimpan");
      setResult({
        totalSold: b.data.totalSold,
        totalHak: Number(b.data.totalHak),
        lines: b.data.lines,
      });
      setMsg("Hitungan tersimpan · menunggu persetujuan Manager");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const review = async (id: string, action: "approve" | "reject") => {
    if (action === "reject" && !reviewNote.trim()) {
      setErr("Alasan penolakan wajib diisi");
      return;
    }
    if (
      action === "approve" &&
      !window.confirm("Setujui? Stok akan diselaraskan ke hasil hitung.")
    )
      return;
    setBusy(id);
    setErr(null);
    try {
      const res = await fetch(`/api/retail/sisa/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNote: reviewNote.trim() || null }),
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal memproses");
      setMsg(action === "approve" ? "Hitungan disetujui" : "Hitungan ditolak");
      setReviewNote("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const printSheet = () => {
    const ownerName =
      owners.find((o) => o.id === ownerId)?.name || "Semua UMKM";
    const countedRows = items.filter(
      (i) => counts[i.inventoryItemId] !== undefined && counts[i.inventoryItemId] !== "",
    );
    const totalTerjual = countedRows.reduce(
      (s, i) => s + Math.max(0, i.tercatat - Number(counts[i.inventoryItemId])),
      0,
    );
    const bodyHtml = `
      <div class="site-header">
        <h1>ALBA FINANCE</h1>
        <p class="sub">Pondok Pesantren Al-Basyariyah · HITUNG JAJANAN SISA</p>
      </div>
      <h2>Laporan Hitung Jajanan Sisa</h2>
      <p class="sub">Tanggal: ${escapeHtml(date)} · UMKM: ${escapeHtml(ownerName)}</p>
      <table>
        <thead>
          <tr><th>No</th><th>Barang</th><th>Pemilik</th><th class="num">Tercatat</th><th class="num">Laku Hari Ini</th><th class="num">Sisa (Hitung)</th><th class="num">Terjual</th></tr>
        </thead>
        <tbody>
          ${
            items.length === 0
              ? `<tr><td colspan="7" style="text-align:center;">Tidak ada barang titipan aktif</td></tr>`
              : items
                  .map((i, idx) => {
                    const counted =
                      counts[i.inventoryItemId] !== undefined &&
                      counts[i.inventoryItemId] !== ""
                        ? Number(counts[i.inventoryItemId])
                        : null;
                    const terjual =
                      counted === null ? null : Math.max(0, i.tercatat - counted);
                    return `<tr>
                      <td>${escapeHtml(String(idx + 1))}</td>
                      <td>${escapeHtml(i.name)}</td>
                      <td>${escapeHtml(i.ownerName)}</td>
                      <td class="num">${escapeHtml(String(i.tercatat))}</td>
                      <td class="num">${escapeHtml(String(i.soldToday))}</td>
                      <td class="num">${counted === null ? "—" : escapeHtml(String(counted))}</td>
                      <td class="num">${terjual === null ? "—" : escapeHtml(String(terjual))}</td>
                    </tr>`;
                  })
                  .join("")
          }
        </tbody>
        ${
          countedRows.length === 0
            ? ""
            : `<tfoot>
                <tr class="total">
                  <td colspan="5" style="text-align:right;">Total terjual (${escapeHtml(String(countedRows.length))} item dihitung)</td>
                  <td></td>
                  <td class="num">${escapeHtml(String(totalTerjual))}</td>
                </tr>
              </tfoot>`
        }
      </table>
      ${
        history.length === 0
          ? ""
          : `<h2>Riwayat Hitungan (${escapeHtml(date)})</h2>
             <table>
               <thead><tr><th>Pemilik</th><th class="num">Terjual</th><th class="num">Hak</th><th>Status</th><th>Oleh</th></tr></thead>
               <tbody>
                 ${history
                   .map(
                     (h) => `<tr>
                       <td>${escapeHtml(h.ownerName)}</td>
                       <td class="num">${escapeHtml(String(h.totalSold))}</td>
                       <td class="num">${escapeHtml(fmt(Number(h.totalHak)))}</td>
                       <td>${escapeHtml(h.status)}</td>
                       <td>${escapeHtml(h.by)}</td>
                     </tr>`,
                   )
                   .join("")}
               </tbody>
             </table>`
      }
      <p class="footer">Dicetak ${escapeHtml(new Date().toLocaleString("id-ID"))} · Dokumen dihasilkan otomatis oleh ALBA Finance</p>
    `;
    printData(`Hitung Sisa ${date}`, bodyHtml);
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/retail/inventory"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Hitung Jajanan Sisa</h1>
          <p className="text-sm text-muted-foreground">
            Sisa fisik → terjual & estimasi hak pemilik otomatis
          </p>
        </div>
        <button
          type="button"
          onClick={printSheet}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          title="Cetak laporan sisa (sesuai tampilan)"
        >
          <Printer size={14} />
          Cetak
        </button>
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
      {result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <p className="font-semibold">Hasil hitungan tersimpan</p>
          <p className="text-muted-foreground">
            Terjual {result.totalSold} pcs · estimasi hak {fmt(result.totalHak)}
          </p>
          <Link
            href="/dashboard/retail/konsinyasi/laporan"
            className="mt-1 inline-block font-semibold text-primary"
          >
            Lanjut ke laporan & payout →
          </Link>
        </div>
      )}

      <div className="grid gap-2 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium">UMKM</label>
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">Semua UMKM</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium">Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <form onSubmit={submit} className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">
          Input sisa fisik ({items.length} barang)
        </h2>
        {loading ? (
          <div className="py-6 text-center text-muted-foreground">
            <Loader2 size={18} className="mx-auto animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Tidak ada barang titipan aktif
          </p>
        ) : (
          <div className="divide-y">
            {items.map((i) => {
              const counted = counts[i.inventoryItemId];
              const terjual =
                counted === undefined || counted === ""
                  ? null
                  : Math.max(0, i.tercatat - Number(counted));
              return (
                <div
                  key={i.inventoryItemId}
                  className="flex items-center gap-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.ownerName} · tercatat {i.tercatat} · laku hari ini{" "}
                      {i.soldToday}
                      {terjual !== null && (
                        <span className="font-semibold text-emerald-700">
                          {" "}
                          → terjual {terjual}
                        </span>
                      )}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={counted ?? ""}
                    onChange={(e) =>
                      setCounts({
                        ...counts,
                        [i.inventoryItemId]: e.target.value,
                      })
                    }
                    placeholder="sisa"
                    className="w-20 rounded-lg border bg-background px-2 py-1.5 text-sm text-right"
                  />
                </div>
              );
            })}
          </div>
        )}
        <button
          type="submit"
          disabled={busy === "save" || items.length === 0}
          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy === "save" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : null}
          Simpan Hitungan
        </button>
      </form>

      {isManager && history.filter((h) => h.status === "DRAFT").length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">
            Menunggu persetujuan ({history.filter((h) => h.status === "DRAFT").length})
          </h2>
          <div className="space-y-2">
            {history
              .filter((h) => h.status === "DRAFT")
              .map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{h.ownerName}</p>
                    <p className="text-xs text-muted-foreground">
                      terjual {h.totalSold} pcs · hak {fmt(Number(h.totalHak))} · oleh {h.by}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => review(h.id, "approve")}
                      disabled={busy === h.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} />
                    </button>
                    <button
                      onClick={() => review(h.id, "reject")}
                      disabled={busy === h.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 px-2 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-50"
                    >
                      <XCircle size={13} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
          <input
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Catatan/alasan (wajib bila tolak)"
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
      )}
    </main>
  );
}

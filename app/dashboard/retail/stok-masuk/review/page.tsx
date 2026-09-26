"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, ArrowLeft, Printer } from "lucide-react";
import { printData, escapeHtml } from "@/lib/print";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

type BatchRow = {
  id: string;
  batchNo: string;
  date: string;
  kind: string;
  status: string;
  totalQty: number;
  totalCost: number;
  by: string;
  createdAt: string;
};

type BatchLine = {
  id: string;
  qty: number;
  unitCost: number;
  finalUnitCost: number | null;
  lineTotal: number;
  itemName: string;
  itemSku: string;
  ownerName: string | null;
};

export default function ReviewBatchPage() {
  const router = useRouter();
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lines, setLines] = useState<BatchLine[]>([]);
  const [finals, setFinals] = useState<Record<string, string>>({});
  const [reviewNote, setReviewNote] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        const r2 = String(s?.user?.role || "").toUpperCase();
        if (r2 === "MANAGER") setIsManager(true);
        else router.push("/dashboard");
      })
      .catch(() => router.push("/dashboard"));
  }, [router]);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/batches?status=DRAFT&limit=100");
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal memuat draf");
      setRows(b.data || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManager) load();
  }, [isManager]);

  const openDetail = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setLoadingDetail(true);
    setErr(null);
    try {
      const res = await fetch(`/api/retail/batches/${id}`);
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal memuat detail");
      setLines(b.data.items || []);
      const init: Record<string, string> = {};
      (b.data.items || []).forEach((l: BatchLine) =>
        l.finalUnitCost != null ? (init[l.id] = String(l.finalUnitCost)) : null,
      );
      setFinals(init);
      setReviewNote("");
      setOpenId(id);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const act = async (id: string, action: "approve" | "reject") => {
    if (action === "reject" && !reviewNote.trim()) {
      setErr("Alasan penolakan wajib diisi");
      return;
    }
    if (
      action === "approve" &&
      !window.confirm("Setujui batch? Stok akan bertambah.")
    )
      return;
    setBusy(id);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/retail/batches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          lines: Object.entries(finals).map(([lid, v]) => ({
            id: lid,
            finalUnitCost: Number(v),
          })),
          reviewNote: reviewNote.trim() || null,
        }),
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal memproses");
      setMsg(
        action === "approve"
          ? `Batch disetujui · modal ${fmt(Number(b.data.totalCost))}`
          : "Batch ditolak",
      );
      setOpenId(null);
      setLines([]);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const liveTotal = lines.reduce((s, l) => {
    const f = finals[l.id] !== undefined ? Number(finals[l.id]) : l.unitCost;
    return s + l.qty * (Number.isFinite(f) ? f : l.unitCost);
  }, 0);

  const printBerita = async (b: BatchRow) => {
    if (lines.length === 0) return;
    const rows = lines
      .map(
        (l, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(l.itemName)}</td>
          <td>${escapeHtml(l.itemSku || "-")}</td>
          <td class="num">${l.qty}</td>
          <td class="num">${fmt(
            finals[l.id] !== undefined
              ? Number(finals[l.id])
              : Number(l.unitCost),
          )}</td>
          <td class="num">${fmt(
            l.qty *
              (finals[l.id] !== undefined
                ? Number(finals[l.id])
                : Number(l.unitCost)),
          )}</td>
        </tr>`,
      )
      .join("");

    const bodyHtml = `
      <div class="site-header">
        <h1>ALBA FINANCE</h1>
        <p class="sub">Pondok Pesantren Al-Basyariyah · Unit Retail</p>
      </div>
      <h2>Berita Acara Penerimaan Barang (Stok Masuk)</h2>
      <p class="sub">${escapeHtml(b.batchNo)} · ${escapeHtml(
        b.kind,
      )} · Tanggal ${escapeHtml(new Date(b.date).toLocaleDateString("id-ID"))}</p>
      <table>
        <thead>
          <tr><th>No</th><th>Barang</th><th>SKU</th><th>Qty</th><th>Harga Satuan</th><th>Total</th></tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="num"><strong>Total ${lines.reduce(
              (s, l) => s + l.qty,
              0,
            )} pcs</strong></td>
            <td colspan="3" class="num"><strong>${fmt(liveTotal)}</strong></td>
          </tr>
        </tfoot>
      </table>
      ${
        reviewNote.trim()
          ? `<p class="sub">Catatan: ${escapeHtml(reviewNote.trim())}</p>`
          : ""
      }
      <div class="sign">
        <div><p>Pengaju / Petugas</p><div class="space"></div><p>_______________</p></div>
        <div><p>Manager Unit</p><div class="space"></div><p>_______________</p></div>
      </div>
      <p class="footer">Dicetak ${escapeHtml(
        new Date().toLocaleString("id-ID"),
      )} · Dokumen dihasilkan otomatis oleh ALBA Finance</p>
    `;
    printData("Berita Acara Stok Masuk", bodyHtml, {
      pageSize: "A4",
      margin: "12mm",
    });
  };

  if (!isManager && loading) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 size={18} className="mx-auto animate-spin" />
        </div>
      </main>
    );
  }

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
          <h1 className="text-xl font-bold">Review Stok Masuk</h1>
          <p className="text-sm text-muted-foreground">
            Draf batch menunggu persetujuan Manager
          </p>
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

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 size={18} className="mx-auto animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Tidak ada draf menunggu review
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <div key={b.id} className="rounded-xl border bg-card p-4">
              <button
                onClick={() => openDetail(b.id)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <p className="text-sm font-bold">{b.batchNo}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.kind} · {b.totalQty} pcs · {fmt(Number(b.totalCost))} · oleh {b.by}
                  </p>
                </div>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                  DRAFT
                </span>
              </button>

              {openId === b.id && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  {loadingDetail ? (
                    <div className="py-4 text-center text-muted-foreground">
                      <Loader2 size={16} className="mx-auto animate-spin" />
                    </div>
                  ) : (
                    <>
                      {lines.map((l) => (
                        <div
                          key={l.id}
                          className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {l.itemName}
                              {l.ownerName && (
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                  ({l.ownerName})
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {l.qty} × {fmt(l.unitCost)}
                            </p>
                          </div>
                          <input
                            value={finals[l.id] ?? ""}
                            onChange={(e) =>
                              setFinals({ ...finals, [l.id]: e.target.value })
                            }
                            placeholder={String(l.unitCost)}
                            type="number"
                            min="0"
                            step="100"
                            title="Harga final (kosongkan = ikut harga staff)"
                            className="w-28 rounded-lg border bg-background px-2 py-1.5 text-sm text-right"
                          />
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Total final:
                        </span>
                        <span className="font-bold">{fmt(liveTotal)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => printBerita(b)}
                          disabled={loadingDetail || lines.length === 0}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border bg-background px-3 py-2 text-sm font-semibold disabled:opacity-50"
                        >
                          <Printer size={15} /> Cetak Berita Acara
                        </button>
                      </div>
                      <input
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Catatan review (wajib bila tolak)"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => act(b.id, "approve")}
                          disabled={busy === b.id}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {busy === b.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => act(b.id, "reject")}
                          disabled={busy === b.id}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-600 disabled:opacity-50"
                        >
                          <XCircle size={15} />
                          Tolak
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

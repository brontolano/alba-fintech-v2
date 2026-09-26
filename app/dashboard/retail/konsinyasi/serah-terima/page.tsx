"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Handshake,
  Loader2,
  CheckCircle2,
  XCircle,
  CheckCheck,
  Printer,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { printData, escapeHtml } from "@/lib/print";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

type Payout = {
  id: string;
  status: string;
  amount: number;
  fromDate: string;
  toDate: string;
  ownerName?: string;
  note?: string;
};

export default function SerahTerimaPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER";
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/consignments/payouts");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memuat");
      setPayouts(body.data || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, action: "pay" | "cancel") => {
    setActing(id);
    setErr(null);
    try {
      const res = await fetch(`/api/retail/consignments/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memproses");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setActing(null);
    }
  };

  const printPayout = (p: Payout) => {
    const paid = p.status === "PAID";
    const title = paid ? "Kuitansi Pembayaran Titipan" : "Nota Tagihan Titipan";
    const statusLabel = paid ? "Lunas" : p.status === "CANCELLED" ? "Batal" : "Menunggu Pembayaran";
    const bodyHtml = `
      <div class="site-header">
        <h1>ALBA FINANCE</h1>
        <p class="sub">Pondok Pesantren Al-Basyariyah · Barang Titipan</p>
      </div>
      <h2>${title}</h2>
      <table>
        <tbody>
          <tr><td class="label">Nomor</td><td>${escapeHtml(p.id.slice(0, 8).toUpperCase())}</td></tr>
          <tr><td class="label">Pemilik</td><td>${escapeHtml(p.ownerName || "—")}</td></tr>
          <tr><td class="label">Periode</td><td>${escapeHtml(String(p.fromDate).slice(0, 10))} s.d. ${escapeHtml(String(p.toDate).slice(0, 10))}</td></tr>
          ${
            p.note
              ? `<tr><td class="label">Catatan</td><td>${escapeHtml(p.note)}</td></tr>`
              : ""
          }
          <tr><td class="label">Status</td><td>${escapeHtml(statusLabel)}</td></tr>
          <tr><td class="label">Jumlah</td><td><strong>${escapeHtml(fmt(Number(p.amount)))}</strong></td></tr>
        </tbody>
      </table>
      <div class="sign">
        <div><p>Penanggung Jawab Unit</p><div class="space"></div><p>_______________</p></div>
        <div><p>Pemilik Titipan</p><div class="space"></div><p>_______________</p></div>
      </div>
      <p class="footer">Dicetak ${escapeHtml(new Date().toLocaleString("id-ID"))} · Dokumen dihasilkan otomatis oleh ALBA Finance</p>
    `;
    printData(`${title} — ${p.ownerName || "Titipan"}`, bodyHtml);
  };

  const pending = payouts.filter((p) => p.status === "PENDING");
  const paidAgg = payouts
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Handshake size={20} /> Serah Terima Titipan
          </h1>
          <p className="text-sm text-muted-foreground">
            Pembayaran hak pemilik barang titipan
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali
        </Link>
      </div>

      {!isManager && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          Staff juga dapat melihat status; pembayaran dikonfirmasi Manager.
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">
          {err}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 size={20} className="mx-auto animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">Menunggu pembayaran</p>
              <p className="mt-1 text-lg font-bold text-amber-600">
                {pending.reduce((s, p) => s + Number(p.amount), 0) > 0
                  ? fmt(pending.reduce((s, p) => s + Number(p.amount), 0))
                  : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">{pending.length} tagihan</p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">Total dibayar</p>
              <p className="mt-1 text-lg font-bold text-emerald-600">{fmt(paidAgg)}</p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CheckCheck size={12} /> periode lunas
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Semua Payout</h2>
            {payouts.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                Belum ada transaksi payout
              </p>
            ) : (
              <div className="divide-y">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{p.ownerName || "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {String(p.fromDate).slice(0, 10)} — {String(p.toDate).slice(0, 10)}
                        {p.note ? ` · ${p.note}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-right text-xs">
                      <button
                        onClick={() => printPayout(p)}
                        className="inline-flex items-center gap-1 rounded-lg border bg-card px-2 py-1 font-semibold text-muted-foreground hover:text-foreground"
                        title={p.status === "PAID" ? "Cetak kuitansi" : "Cetak nota"}
                      >
                        <Printer size={12} /> Cetak
                      </button>
                      <p className="font-semibold">{fmt(Number(p.amount))}</p>
                      {p.status === "PENDING" && isManager && (
                        <>
                          <button
                            onClick={() => act(p.id, "pay")}
                            disabled={acting !== null}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 font-semibold text-white disabled:opacity-50"
                          >
                            {acting === p.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            Konfirmasi
                          </button>
                          <button
                            onClick={() => act(p.id, "cancel")}
                            disabled={acting !== null}
                            className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 font-semibold disabled:opacity-50"
                          >
                            <XCircle size={12} /> Batal
                          </button>
                        </>
                      )}
                      {p.status === "PENDING" && !isManager && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700">
                          Menunggu Manager
                        </span>
                      )}
                      {p.status === "PAID" && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-600">
                          Lunas
                        </span>
                      )}
                      {p.status === "CANCELLED" && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          Batal
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
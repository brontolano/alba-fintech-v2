"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { BarChart3, Loader2, Printer, RefreshCw } from "lucide-react";
import { printData, escapeHtml } from "@/lib/print";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

type StudentRow = { studentId: string; name: string; studentNumber: string; total: number; count: number };
type UnitRow = { unitId: string; unitName: string; total: number; count: number; students: StudentRow[] };

export default function SavingsCrossUnitPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<UnitRow[]>([]);
  const [summary, setSummary] = useState<{ total: number; count: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await fetch(`/api/savings/cross-unit?${qs.toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memuat laporan");
      setData(body.data || []);
      setSummary(body.summary || null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const printReport = () => {
    if (data.length === 0) return;
    const unitRows = data
      .map((u) => {
        const students = u.students.length ? u.students : [null];
        return students
          .map(
            (s, idx) => `
          <tr>
            <td>${idx === 0 ? escapeHtml(u.unitName) : ""}</td>
            <td>${s ? escapeHtml(s.name) : "-"}${s?.studentNumber ? `<br/><span class="muted">${escapeHtml(s.studentNumber)}</span>` : ""}</td>
            <td class="num">${s ? s.count : 0}</td>
            <td class="num">${s ? fmt(s.total) : fmt(0)}</td>
          </tr>`,
          )
          .join("");
      })
      .join("");

    const bodyHtml = `
      <div class="site-header">
        <h1>ALBA FINANCE</h1>
        <p class="sub">Pondok Pesantren Al-Basyariyah · Penggunaan Tabungan Lintas Unit</p>
      </div>
      <h2>Rekap Penggunaan Tabungan Lintas Unit</h2>
      <p class="sub">Periode ${
        from ? escapeHtml(from) : "semua tanggal"
      } s.d. ${to ? escapeHtml(to) : "sekarang"} · Dicetak ${escapeHtml(
        new Date().toLocaleString("id-ID"),
      )}</p>
      <table>
        <thead>
          <tr><th>Unit</th><th>Santri</th><th>Jumlah</th><th>Total</th></tr>
        </thead>
        <tbody>${unitRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" class="num"><strong>Total transaksi</strong></td>
            <td class="num"><strong>${summary?.count ?? 0}</strong></td>
            <td class="num"><strong>${fmt(summary?.total ?? 0)}</strong></td>
          </tr>
        </tfoot>
      </table>
      <div class="sign">
        <div><p>Petugas KPAK</p><div class="space"></div><p>_______________</p></div>
        <div><p>Pimpinan / Penyetuju</p><div class="space"></div><p>_______________</p></div>
      </div>
      <p class="footer">Dicetak ${escapeHtml(new Date().toLocaleString("id-ID"))} · Dokumen dihasilkan otomatis oleh ALBA Finance</p>
    `;
    printData("Rekap Lintas Unit", bodyHtml, { pageSize: "A4", margin: "12mm" });
  };

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <BarChart3 size={20} /> Penggunaan Tabungan Lintas Unit
          </h1>
          <p className="text-sm text-muted-foreground">
            Belanja kartu SMART_CARD di unit retail yang bukan unit asal tabungan
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4 text-sm">
        <div>
          <label className="text-xs text-muted-foreground">Dari</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Sampai</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Muat Laporan
        </button>
        <button
          onClick={printReport}
          disabled={loading || data.length === 0}
          className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <Printer size={15} /> Cetak
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">{err}</div>
      )}

      {summary !== null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Lintas Unit</p>
            <p className="text-xl font-bold">{fmt(summary.total)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Jumlah Transaksi</p>
            <p className="text-xl font-bold">{summary.count}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">
          <Loader2 size={18} className="mx-auto animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Belum ada data — atur rentang tanggal lalu muat.
        </p>
      ) : (
        data.map((u) => (
          <div key={u.unitId} className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{u.unitName}</h2>
              <p className="text-sm font-bold">{fmt(u.total)} <span className="text-xs font-normal text-muted-foreground">({u.count} tx)</span></p>
            </div>
            <div className="divide-y">
              {u.students.map((s) => (
                <div key={s.studentId} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <p className="min-w-0 truncate">
                    {s.name}
                    {s.studentNumber ? <span className="text-xs text-muted-foreground"> ({s.studentNumber})</span> : ""}
                  </p>
                  <p className="shrink-0 text-right">
                    <span className="font-semibold">{fmt(s.total)}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{s.count}×</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </main>
  );
}
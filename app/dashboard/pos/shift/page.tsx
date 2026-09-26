"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LogIn,
  LogOut,
  Clock,
  Users,
  Receipt,
  Timer,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { printData, escapeHtml } from "@/lib/print";
import { usePageGuard } from "@/lib/use-page-guard";

interface ShiftRow {
  id: string;
  date: string;
  checkInAt: string;
  checkOutAt: string | null;
}

interface CrewMember {
  id: string;
  name: string;
  role: string;
  attendance: ShiftRow | null;
}

interface HistoryEntry {
  id: string;
  date: string;
  checkInAt: string;
  checkOutAt: string | null;
  durationMin: number | null;
  txCount: number;
}

interface ShiftData {
  date: string;
  nowWib: string;
  mine: ShiftRow | null;
  myTxToday: number;
  crew: CrewMember[];
}

const wibTime = (iso: string) =>
  new Date(new Date(iso).getTime() + 7 * 3600 * 1000)
    .toISOString()
    .slice(11, 16);

function formatDuration(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function POSShiftPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.unitIsRetail === true &&
      (u.role === "MANAGER" || u.role === "STAFF"),
    redirectTo: "/dashboard/transactions",
  });

  const [data, setData] = useState<ShiftData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        fetch("/api/pos/shift"),
        fetch("/api/pos/shift?history=1"),
      ]);
      if (!statusRes.ok || !historyRes.ok)
        throw new Error("Gagal memuat shift kasir");
      const statusJson = await statusRes.json();
      const historyJson = await historyRes.json();
      setData(statusJson.data);
      setHistory(historyJson.data.history);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat shift kasir");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const open = data && data.mine && !data.mine.checkOutAt;
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [data]);

  const submit = async (action: "check-in" | "check-out") => {
    setBusy(true);
    try {
      const res = await fetch("/api/pos/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      toast.success(
        action === "check-in" ? "Shift dibuka" : "Shift ditutup",
      );
      await load();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  };

  const shiftOpen = !!data?.mine && !data.mine.checkOutAt;
  const shiftStart = data?.mine
    ? new Date(data.mine.checkInAt).getTime()
    : null;
  const liveDuration =
    shiftStart != null && shiftOpen ? now - shiftStart : null;

  const printSummary = () => {
    if (!data) return;
    const crewRows =
      data.crew.length === 0
        ? ""
        : data.crew
            .map(
              (c) => `<tr>
        <td>${escapeHtml(c.name)}</td>
        <td>${c.role === "MANAGER" ? "Manager" : "Staff"}</td>
        <td>${c.attendance ? escapeHtml(wibTime(c.attendance.checkInAt)) : "-"}</td>
        <td>${c.attendance?.checkOutAt ? escapeHtml(wibTime(c.attendance.checkOutAt)) : "Bertugas"}</td>
      </tr>`,
            )
            .join("");
    const historyRows =
      history.length === 0
        ? ""
        : history
            .map(
              (h) => `<tr>
        <td>${escapeHtml(h.date)}</td>
        <td>${escapeHtml(wibTime(h.checkInAt))}</td>
        <td>${h.checkOutAt ? escapeHtml(wibTime(h.checkOutAt)) : "berjalan"}</td>
        <td class="num">${h.durationMin != null ? escapeHtml(formatDuration(h.durationMin * 60000)) : "--:--"}</td>
        <td class="num">${escapeHtml(String(h.txCount))}</td>
      </tr>`,
            )
            .join("");
    const bodyHtml = `
      <div class="site-header">
        <h1>ALBA FINANCE</h1>
        <p class="sub">Pondok Pesantren Al-Basyariyah · POS Retail</p>
      </div>
      <h2>Ringkasan Shift Kasir</h2>
      <p class="sub">${escapeHtml(data.date)} · ${escapeHtml(data.nowWib)} WIB</p>
      <table>
        <tbody>
          <tr><td class="label">Status shift saya</td><td>${shiftOpen ? "Sedang bertugas" : data.mine ? "Shift ditutup" : "Belum buka shift"}</td></tr>
          <tr><td class="label">Durasi berjalan</td><td class="num">${liveDuration != null ? escapeHtml(formatDuration(liveDuration)) : "--:--"}</td></tr>
          <tr><td class="label">Transaksi saya hari ini</td><td class="num"><strong>${escapeHtml(String(data.myTxToday ?? 0))}</strong></td></tr>
          <tr><td class="label">Kru bertugas</td><td class="num">${escapeHtml(String(data.crew.filter((c) => c.attendance).length))} orang</td></tr>
        </tbody>
      </table>
      ${crewRows ? `<h3>Kru unit bertugas</h3>
      <table>
        <thead><tr><th>Nama</th><th>Peran</th><th>Masuk</th><th>Keluar</th></tr></thead>
        <tbody>${crewRows}</tbody>
      </table>` : ""}
      ${historyRows ? `<h3>Riwayat shift (14 hari)</h3>
      <table>
        <thead><tr><th>Tanggal</th><th>Masuk</th><th>Keluar</th><th>Durasi</th><th>Trx</th></tr></thead>
        <tbody>${historyRows}</tbody>
      </table>` : ""}
      <div class="sign">
        <div><p>Karyawan Kasir</p><div class="space"></div><p>_______________</p></div>
        <div><p>Manager Unit</p><div class="space"></div><p>_______________</p></div>
      </div>
      <p class="footer">Dicetak ${escapeHtml(new Date().toLocaleString("id-ID"))} · Dokumen dihasilkan otomatis oleh ALBA Finance</p>
    `;
    printData("Ringkasan Shift Kasir", bodyHtml);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard/pos"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Kembali ke POS
          </Link>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Operasional
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Shift Kasir
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {data ? `Tanggal ${data.date} • ${data.nowWib} WIB` : "Memuat..."}
        </p>
      </div>

      {loading ? (
        <div className="rounded-[22px] border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Memuat data shift...
        </div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Status Shift Hari Ini
                  </p>
                  <p
                    className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                      shiftOpen
                        ? "bg-emerald-100 text-emerald-700"
                        : data?.mine
                          ? "bg-muted text-muted-foreground"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {shiftOpen
                      ? "Sedang Bertugas"
                      : data?.mine
                        ? "Shift Ditutup"
                        : "Belum Buka Shift"}
                  </p>
                </div>
                {shiftOpen ? (
                  <div className="text-right">
                    <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                      <Timer size={14} />
                      Durasi Berjalan
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
                      {liveDuration != null
                        ? formatDuration(liveDuration)
                        : "00:00"}
                    </p>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                      <Clock size={14} />
                      Terakhir Masuk
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
                      {data?.mine
                        ? wibTime(data.mine.checkInAt)
                        : "--:--"}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-border pt-5">
                {!data?.mine || data.mine.checkOutAt ? (
                  <button
                    onClick={() => submit("check-in")}
                    disabled={busy}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LogIn size={18} />
                    <span>{busy ? "Memproses..." : "Buka Shift"}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => submit("check-out")}
                    disabled={busy}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LogOut size={18} />
                    <span>{busy ? "Memproses..." : "Tutup Shift"}</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={printSummary}
                disabled={!data}
                className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={14} /> Cetak Ringkasan Shift
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <Receipt size={14} />
                  Transaksi Saya Hari Ini
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {data?.myTxToday ?? 0}
                </p>
              </div>
              <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <Users size={14} />
                  Kru Bertugas
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {data?.crew.filter((c) => c.attendance).length ?? 0} orang
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                <Users size={18} />
                Kru Unit Bertugas
              </h2>
              {data && data.crew.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Tidak ada kru di unit ini
                </p>
              ) : (
                <div className="space-y-2">
                  {data?.crew.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.role === "MANAGER" ? "Manager" : "Staff"}
                        </p>
                      </div>
                      {c.attendance ? (
                        c.attendance.checkOutAt ? (
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Selesai{" "}
                            {wibTime(c.attendance.checkInAt)} -{" "}
                            {wibTime(c.attendance.checkOutAt)}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Bertugas sejak {wibTime(c.attendance.checkInAt)}
                          </span>
                        )
                      ) : (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          Belum masuk
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                <Clock size={18} />
                Riwayat Shift (14 Hari)
              </h2>
              {history.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Belum ada riwayat shift
                </p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {h.date}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {wibTime(h.checkInAt)} -{" "}
                          {h.checkOutAt
                            ? wibTime(h.checkOutAt)
                            : "berjalan"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-foreground">
                          {h.durationMin != null
                            ? formatDuration(h.durationMin * 60000)
                            : "--:--"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {h.txCount} transaksi
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
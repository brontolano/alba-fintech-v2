"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  RefreshCw,
  Wallet,
  Send,
  Plus,
  CheckCircle2,
  XCircle,
  CircleDashed,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { usePageGuard } from "@/lib/use-page-guard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

/**
 * Fase 3 Manager KPAK — "Anggaran Saya".
 * Dua hal yang manager butuhkan soal anggaran:
 *  A. Sisa alokasi unit bulan berjalan (ditetapkan pimpinan)
 *  B. Status pengajuan anggaran saya (Menunggu / Disetujui / Ditolak)
 * Pengajuan baru tetap di halaman Pengajuan Anggaran.
 *
 * FILE BARU (di luar permukaan beku staff — lihat docs/KPAK-STAFF-FREEZE.md).
 * Hanya membaca API yang sudah ada.
 */

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const currentMonthRange = () => {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const last = new Date(Date.UTC(y, now.getMonth() + 1, 0)).toISOString().slice(0, 10);
  return { from: `${y}-${mo}-01`, to: last, label: `${mo}/${y}` };
};

interface Allocation {
  id: string;
  title?: string | null;
  periodType: string;
  amount: number | string;
  used: number | string;
  remaining: number | string;
  source?: string | null;
  category?: { name: string } | null;
  rangeStart?: string;
  rangeEnd?: string;
}

interface Submission {
  id: string;
  amount: number | string;
  description: string;
  reference?: string | null;
  date: string;
  status: string;
  category?: { name: string } | null;
}

const periodLabel = (p: string) =>
  p === "DAILY" ? "Harian" : p === "WEEKLY" ? "Mingguan" : p === "MONTHLY" ? "Bulanan" : "Agenda";

export default function MyBudgetPage() {
  // Manager KPAK (+ SUPERADMIN/PIMPINAN untuk pengawasan). Retail tidak masuk.
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      (u?.role === "MANAGER" && u?.unitIsRetail !== true),
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const { from, to } = currentMonthRange();
      const [allocRes, txRes] = await Promise.all([
        fetch(`/api/kpak/allocations?from=${from}&to=${to}`).catch(() => null),
        fetch("/api/transactions?type=EXPENSE&limit=30").catch(() => null),
      ]);
      if (allocRes && allocRes.ok) {
        const j = await allocRes.json();
        setAllocations(j?.data?.allocations || []);
      }
      if (txRes && txRes.ok) {
        const j = await txRes.json();
        const list: Submission[] = j.data || j.transactions || [];
        setSubmissions(list.filter((x) => (x.reference || "").startsWith("ANGGARAN:")));
      }
    } catch {
      toast.error("Gagal memuat data anggaran");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalRemaining = allocations.reduce((s, a) => s + Number(a.remaining || 0), 0);
  const pendingCount = submissions.filter(
    (s) => s.status !== "APPROVED" && s.status !== "REJECTED",
  ).length;
  const { label: monthLabel } = currentMonthRange();

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Memuat anggaran...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-24 md:pb-8">
      <DashboardHeader
        title="Anggaran Saya"
        subtitle={`Alokasi & pengajuan unit • ${monthLabel}`}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Memuat..." : "Segarkan"}
        </button>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[22px] border border-border bg-card/90 p-4">
          <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Wallet size={12} /> Sisa alokasi
          </p>
          <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalRemaining)}
          </p>
        </div>
        <div className="rounded-[22px] border border-border bg-card/90 p-4">
          <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Send size={12} /> Menunggu
          </p>
          <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
            {pendingCount} pengajuan
          </p>
        </div>
      </div>

      {/* Sisa alokasi */}
      <section className="space-y-2.5">
        <h2 className="text-sm font-bold text-foreground">Sisa Alokasi Bulan Ini</h2>
        {allocations.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Belum ada alokasi dari pimpinan bulan ini.
          </p>
        )}
        {allocations.map((a) => {
          const amount = Number(a.amount || 0);
          const used = Number(a.used || 0);
          const remaining = Number(a.remaining || 0);
          const pct = amount > 0 ? Math.min(100, Math.round((used / amount) * 100)) : 0;
          return (
            <div
              key={a.id}
              className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {a.title || a.category?.name || "Alokasi"}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    {periodLabel(a.periodType)}
                    {a.rangeStart && a.rangeEnd
                      ? ` • ${fmtDate(a.rangeStart.slice(0, 10))} – ${fmtDate(a.rangeEnd.slice(0, 10))}`
                      : ""}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        (a.source || "KPAK") === "LEMBAGA"
                          ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {(a.source || "KPAK") === "LEMBAGA" ? "Kas Lembaga" : "Kas KPAK"}
                    </span>
                  </p>
                </div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(remaining)}
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Terpakai {formatCurrency(used)} dari {formatCurrency(amount)} ({pct}%)
              </p>
            </div>
          );
        })}
      </section>

      {/* Pengajuan saya */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Pengajuan Saya</h2>
          <Link
            href="/dashboard/kpak/budget"
            className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110 active:scale-95"
          >
            <Plus size={13} /> Ajukan Baru
          </Link>
        </div>
        {submissions.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Belum ada pengajuan anggaran.
          </p>
        )}
        {submissions.map((s) => {
          const st =
            s.status === "APPROVED" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} /> Disetujui
              </span>
            ) : s.status === "REJECTED" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                <XCircle size={12} /> Ditolak
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <CircleDashed size={12} /> Menunggu pimpinan
              </span>
            );
          return (
            <div
              key={s.id}
              className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{s.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.category?.name || "Tanpa kategori"} • {fmtDate(s.date.slice(0, 10))}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-foreground">
                  {formatCurrency(Number(s.amount || 0))}
                </p>
              </div>
              <div className="mt-1.5">{st}</div>
            </div>
          );
        })}
      </section>

      <Link
        href="/dashboard/kpak/workflow"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronRight size={13} className="rotate-180" /> Kembali ke Pusat Kerja
      </Link>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Clock,
  Receipt,
  Wallet,
  FileCheck,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { usePageGuard } from "@/lib/use-page-guard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

/**
 * Fase 4 Manager KPAK — "Kru & Kinerja".
 * Pengawasan kru real-time + rekap kinerja per staff hari ini:
 *  A. Siapa sedang bertugas (layanan, jam masuk, durasi)
 *  B. Kinerja per staff (layanan, tabungan, status laporan shift)
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

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : "-";

const elapsed = (iso: string) => {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} jam ${min % 60} mnt` : `${min} mnt`;
};

const serviceLabel = (s?: string | null) =>
  s === "KEUANGAN" ? "Keuangan" : s === "TABUNGAN" ? "Tabungan" : "Pengawasan";

interface CrewMember {
  id: string;
  name: string;
  role: string;
  attendance: {
    checkInAt: string;
    checkOutAt?: string | null;
    service?: string | null;
  } | null;
}

interface Report {
  id: string;
  userId: string;
  status: string;
  staff: { id: string; name: string };
}

interface Perf {
  id: string;
  name: string;
  role: string;
  onDuty: boolean;
  service?: string | null;
  checkInAt?: string | null;
  txCount: number;
  txTotal: number;
  savCount: number;
  reportStatus: string | null;
}

export default function CrewPage() {
  // Manager KPAK (+ SUPERADMIN/PIMPINAN untuk pengawasan). Retail tidak masuk.
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      (u?.role === "MANAGER" && u?.unitIsRetail !== true),
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [perf, setPerf] = useState<Perf[]>([]);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const today = todayLocal();
      const [shiftRes, txRes, savRes, repRes] = await Promise.all([
        fetch("/api/kpak/shift").catch(() => null),
        fetch(`/api/transactions?startDate=${today}&endDate=${today}&limit=200`).catch(() => null),
        fetch("/api/savings/transactions").catch(() => null),
        fetch("/api/kpak/shift-reports").catch(() => null),
      ]);

      let crew: CrewMember[] = [];
      if (shiftRes && shiftRes.ok) {
        const j = await shiftRes.json();
        crew = j?.data?.crew || [];
      }

      const txByUser = new Map<string, { count: number; total: number }>();
      if (txRes && txRes.ok) {
        const j = await txRes.json();
        const list: any[] = (j.data || j.transactions || []).filter(
          (x: any) => x.status !== "REJECTED",
        );
        for (const t of list) {
          const id = t.createdById || "unknown";
          const cur = txByUser.get(id) || { count: 0, total: 0 };
          cur.count += 1;
          cur.total += Number(t.amount || 0);
          txByUser.set(id, cur);
        }
      }

      const savByUser = new Map<string, number>();
      if (savRes && savRes.ok) {
        const j = await savRes.json();
        const list: any[] = (j.data || []).filter(
          (x: any) => (x.createdAt || "").slice(0, 10) === today,
        );
        for (const s of list) {
          const id = s.createdById || "unknown";
          savByUser.set(id, (savByUser.get(id) || 0) + 1);
        }
      }

      const reportByUser = new Map<string, string>();
      if (repRes && repRes.ok) {
        const j = await repRes.json();
        const list: Report[] = j?.data?.reports || [];
        for (const r of list) {
          const uid = r.userId || r.staff?.id;
          if (uid && !reportByUser.has(uid)) reportByUser.set(uid, r.status);
        }
      }

      const rows: Perf[] = crew.map((c) => {
        const onDuty = !!c.attendance && !c.attendance.checkOutAt;
        const tx = txByUser.get(c.id) || { count: 0, total: 0 };
        return {
          id: c.id,
          name: c.name,
          role: c.role,
          onDuty,
          service: c.attendance?.service || null,
          checkInAt: c.attendance?.checkInAt || null,
          txCount: tx.count,
          txTotal: tx.total,
          savCount: savByUser.get(c.id) || 0,
          reportStatus: reportByUser.get(c.id) || null,
        };
      });
      // Bertugas dulu, lalu yang transaksinya terbanyak
      rows.sort(
        (a, b) =>
          Number(b.onDuty) - Number(a.onDuty) ||
          b.txCount + b.savCount - (a.txCount + a.savCount),
      );
      setPerf(rows);
    } catch {
      toast.error("Gagal memuat data kru");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Tanpa auto-refresh: data diambil dari backend saat halaman dibuka;
    // pembaruan via tombol Segarkan.
  }, [load]);

  const onDuty = perf.filter((p) => p.onDuty);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Memuat data kru...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-24 md:pb-8">
      <DashboardHeader
        title="Kru & Kinerja"
        subtitle={
          onDuty.length > 0
            ? `${onDuty.length} kru bertugas hari ini`
            : "Belum ada kru check-in"
        }
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
            <UserCheck size={12} /> Bertugas
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {onDuty.length}
          </p>
        </div>
        <div className="rounded-[22px] border border-border bg-card/90 p-4">
          <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <UserX size={12} /> Lepas / belum
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-500">
            {perf.length - onDuty.length}
          </p>
        </div>
      </div>

      {/* Daftar kru */}
      <section className="space-y-2.5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Users size={15} /> Daftar Kru ({perf.length})
        </h2>
        {perf.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Data kru tidak tersedia.
          </p>
        )}
        {perf.map((p) => (
          <div
            key={p.id}
            className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-foreground">{p.name}</p>
                <p className="text-[11px] capitalize text-muted-foreground">
                  {p.role}
                  {p.onDuty && p.service ? ` • ${serviceLabel(p.service)}` : ""}
                </p>
              </div>
              {p.onDuty ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Bertugas
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  Lepas
                </span>
              )}
            </div>
            {p.onDuty && p.checkInAt && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock size={11} /> Masuk {fmtTime(p.checkInAt)} • {elapsed(p.checkInAt)}
              </p>
            )}
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted/50 p-2">
                <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <Receipt size={11} /> Layanan
                </p>
                <p className="text-sm font-bold text-foreground">{p.txCount}×</p>
                <p className="text-[10px] text-muted-foreground">{formatCurrency(p.txTotal)}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-2">
                <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <Wallet size={11} /> Tabungan
                </p>
                <p className="text-sm font-bold text-foreground">{p.savCount}×</p>
                <p className="text-[10px] text-muted-foreground">transaksi</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-2">
                <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <FileCheck size={11} /> Laporan
                </p>
                <p
                  className={`text-sm font-bold ${
                    p.reportStatus === "ACCEPTED"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : p.reportStatus
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-400"
                  }`}
                >
                  {p.reportStatus === "ACCEPTED"
                    ? "Diterima"
                    : p.reportStatus
                      ? "Menunggu"
                      : "Belum"}
                </p>
                <p className="text-[10px] text-muted-foreground">shift</p>
              </div>
            </div>
          </div>
        ))}
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

"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  PiggyBank,
  GraduationCap,
  ClipboardList,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  BarChart3,
  LayoutDashboard,
  Clock,
  Users,
} from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickAccessGrid } from "@/components/dashboard/QuickAccessGrid";
import type { QuickAccessAction } from "@/components/dashboard/QuickAccessGrid";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import { getKpakPhase } from "@/lib/kpak-phase";

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

const isCashTx = (x: any) => !x.paymentMethod || x.paymentMethod === "CASH";
const isCashSv = (x: any) => !x.channel || x.channel === "CASH";

/**
 * Dashboard khusus Manager KPAK:
 * saldo unit, status shift, quick akses, 4 ringkasan,
 * persetujuan pending, serah terima, log unit.
 */
export function KpakManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [shiftOn, setShiftOn] = useState<boolean | null>(null);
  const [pendingReports, setPendingReports] = useState(0);
  const [handoverStatus, setHandoverStatus] = useState<string | null>(null);
  const [stats, setStats] = useState({
    masuk: 0,
    keluar: 0,
    count: 0,
    tabIn: 0,
    tabOut: 0,
    tabCount: 0,
    her: 0,
    herCount: 0,
    daful: 0,
    dafulCount: 0,
    intIn: 0,
    intOut: 0,
  });
  const [log, setLog] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const today = todayLocal();
        const [txRes, svRes, catRes, shiftRes, repRes, hoRes] = await Promise.all([
          fetch(
            `/api/transactions?startDate=${today}&endDate=${today}&limit=100`,
          ),
          fetch("/api/savings/transactions"),
          fetch("/api/financial-categories"),
          fetch("/api/kpak/shift").catch(() => null),
          fetch("/api/kpak/shift-reports").catch(() => null),
          fetch(`/api/handovers?date=${today}`).catch(() => null),
        ]);
        if (repRes && repRes.ok) {
          const r = await repRes.json();
          const list = r.data?.reports || [];
          setPendingReports(
            list.filter((x: any) => x.status !== "ACCEPTED").length,
          );
        }
        if (hoRes && hoRes.ok) {
          const h = await hoRes.json();
          const list = h.data || [];
          setHandoverStatus(
            list.length > 0 ? list[0].status : null,
          );
        }
        let txs: any[] = [];
        let svs: any[] = [];
        let cats: any[] = [];
        if (txRes.ok) {
          const t = await txRes.json();
          txs = (t.data || t.transactions || []).filter(
            (x: any) => x.status !== "REJECTED",
          );
        }
        if (svRes.ok) {
          const s = await svRes.json();
          svs = (s.data || []).filter(
            (x: any) => (x.createdAt || "").slice(0, 10) === today,
          );
        }
        if (catRes.ok) {
          const c = await catRes.json();
          cats = (c.data || []).filter((x: any) => x.unitId);
        }
        if (shiftRes && shiftRes.ok) {
          const s = await shiftRes.json();
          const mine = s.data?.mine;
          setShiftOn(!!mine && !mine.checkOutAt);
        }

        const sum = (l: any[]) =>
          l.reduce((s, x) => s + Number(x.amount || 0), 0);
        const cashTxs = txs.filter(isCashTx);
        const cashSv = svs.filter(isCashSv);
        const herIds = new Set(
          cats.filter((c) => c.code.endsWith("-HER")).map((c: any) => c.id),
        );
        const dafulIds = new Set(
          cats
            .filter(
              (c) => c.code.endsWith("-DAFUL") || c.code.endsWith("-DAFTAR"),
            )
            .map((c: any) => c.id),
        );
        const herTxs = txs.filter(
          (x) => x.type === "INCOME" && herIds.has(x.categoryId),
        );
        const dafulTxs = txs.filter(
          (x) => x.type === "INCOME" && dafulIds.has(x.categoryId),
        );
        const intTxs = txs.filter(
          (x) =>
            x.type === "EXPENSE" ||
            (x.type === "INCOME" &&
              !herIds.has(x.categoryId) &&
              !dafulIds.has(x.categoryId)),
        );

        setStats({
          masuk:
            sum(cashTxs.filter((x) => x.type === "INCOME")) +
            sum(cashSv.filter((x) => x.type === "DEPOSIT")),
          keluar:
            sum(cashTxs.filter((x) => x.type === "EXPENSE")) +
            sum(cashSv.filter((x) => x.type === "WITHDRAWAL")),
          count: txs.length + svs.length,
          tabIn: sum(svs.filter((x) => x.type === "DEPOSIT")),
          tabOut: sum(svs.filter((x) => x.type === "WITHDRAWAL")),
          tabCount: svs.length,
          her: sum(herTxs),
          herCount: herTxs.length,
          daful: sum(dafulTxs),
          dafulCount: dafulTxs.length,
          intIn: sum(intTxs.filter((x) => x.type === "INCOME")),
          intOut: sum(intTxs.filter((x) => x.type === "EXPENSE")),
        });

        const entries = [
          ...txs.map((x) => ({
            key: `k-${x.id}`,
            dir: x.type === "INCOME" ? "in" : "out",
            title: x.description,
            dateISO: x.date,
            amount: Number(x.amount || 0),
          })),
          ...svs.map((x) => ({
            key: `s-${x.id}`,
            dir: x.type === "DEPOSIT" ? "in" : "out",
            title: `${x.type === "DEPOSIT" ? "Setoran" : "Penarikan"}${x.description ? ` — ${x.description}` : ""}`,
            dateISO: x.createdAt,
            amount: Number(x.amount || 0),
          })),
        ]
          .sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""))
          .slice(0, 8);
        setLog(entries);
      } catch {
        // dashboard tetap tampil walau ringkasan gagal
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Akses cepat mengikuti IA final: 1 nama 1 tujuan (lihat Pusat Kerja).
  const actions: QuickAccessAction[] = [
    { href: "/dashboard/kpak/workflow", icon: LayoutDashboard, label: "Pusat Kerja", color: "accent" },
    { href: "/dashboard/kpak/crew", icon: Users, label: "Kru & Kinerja", color: "islamic" },
    { href: "/dashboard/kpak/review", icon: ClipboardList, label: "Perlu Keputusan", color: "amber" },
    { href: "/dashboard/kpak/close-day", icon: Clock, label: "Tutup Hari", color: "blue" },
    { href: "/dashboard/kpak/my-budget", icon: Wallet, label: "Anggaran Saya", color: "green" },
    { href: "/dashboard/kpak/reports", icon: BarChart3, label: "Rekap", color: "slate" },
  ];

  return (
    <div className="space-y-4">
      <DashboardHeader title="Dashboard KPAK" subtitle="Manager" />

      {(() => {
        const phase = getKpakPhase();
        return (
          <Link
            href="/dashboard/kpak/workflow"
            className="block rounded-xl border border-primary/25 bg-primary/[0.04] px-4 py-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
              Sekarang: {phase.label}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{phase.hint}</p>
          </Link>
        );
      })()}

      {shiftOn === false && !loading && (
        <Link
          href="/dashboard/kpak/shift"
          className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          <span className="font-medium">Belum check-in shift hari ini</span>
          <span className="font-semibold text-primary">Check-in →</span>
        </Link>
      )}

      {/* Saldo unit */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
        <p className="text-xs opacity-80">Saldo Unit Hari Ini (tunai)</p>
        {loading ? (
          <Loader2 size={18} className="my-2 animate-spin" />
        ) : (
          <>
            <p className="mt-1 text-3xl font-bold">
              {formatCurrency(stats.masuk - stats.keluar)}
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs">
              <span className="inline-flex items-center gap-1">
                <ArrowDownRight size={12} /> Masuk {formatCurrency(stats.masuk)}
              </span>
              <span className="inline-flex items-center gap-1">
                <ArrowUpRight size={12} /> Keluar {formatCurrency(stats.keluar)}
              </span>
              <span>{stats.count} transaksi</span>
            </div>
          </>
        )}
      </div>

      <QuickAccessGrid actions={actions} />

      {/* 4 ringkasan */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/savings"
          className="rounded-xl border bg-card p-4 hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <PiggyBank size={16} className="text-blue-600" />
            <p className="text-xs text-muted-foreground">Tabungan</p>
          </div>
          <p className="mt-1 text-sm font-bold">
            <span className="text-emerald-600">+{formatCurrency(stats.tabIn)}</span>{" "}
            <span className="text-rose-600">-{formatCurrency(stats.tabOut)}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {stats.tabCount} mutasi
          </p>
        </Link>
        <Link
          href="/dashboard/kpak/finance"
          className="rounded-xl border bg-card p-4 hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-emerald-600" />
            <p className="text-xs text-muted-foreground">HER / SPP</p>
          </div>
          <p className="mt-1 text-sm font-bold">{formatCurrency(stats.her)}</p>
          <p className="text-[11px] text-muted-foreground">
            {stats.herCount} pembayaran
          </p>
        </Link>
        <Link
          href="/dashboard/kpak/finance"
          className="rounded-xl border bg-card p-4 hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-purple-600" />
            <p className="text-xs text-muted-foreground">Daftar Ulang</p>
          </div>
          <p className="mt-1 text-sm font-bold">{formatCurrency(stats.daful)}</p>
          <p className="text-[11px] text-muted-foreground">
            {stats.dafulCount} pembayaran
          </p>
        </Link>
        <Link
          href="/dashboard/kpak/finance?tab=internal"
          className="rounded-xl border bg-card p-4 hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-amber-600" />
            <p className="text-xs text-muted-foreground">Keu. Internal</p>
          </div>
          <p className="mt-1 text-sm font-bold">
            <span className="text-emerald-600">+{formatCurrency(stats.intIn)}</span>{" "}
            <span className="text-rose-600">-{formatCurrency(stats.intOut)}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">kas internal</p>
        </Link>
      </div>

      {pendingReports > 0 && (
        <Link
          href="/dashboard/kpak/review"
          className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          <span className="font-medium">
            {pendingReports} laporan shift menunggu diterima
          </span>
          <span className="font-semibold text-primary">Periksa →</span>
        </Link>
      )}

      <PendingApprovalsWidget formatCurrency={formatCurrency} />

      <Link
        href="/dashboard/handovers"
        className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/[0.04] px-4 py-3 text-sm"
      >
        <span className="font-medium">
          Serah terima kas ke pimpinan
          {handoverStatus && (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                handoverStatus === "ACCEPTED"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : handoverStatus === "PENDING"
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {handoverStatus === "ACCEPTED"
                ? "diterima"
                : handoverStatus === "PENDING"
                  ? "menunggu"
                  : handoverStatus.toLowerCase()}
            </span>
          )}
        </span>
        <span className="font-semibold text-primary">Buka →</span>
      </Link>

      {/* Log unit */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Log Unit Hari Ini</h2>
        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="mx-auto animate-spin" />
          </p>
        ) : log.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Belum ada aktivitas
          </p>
        ) : (
          <div className="divide-y">
            {log.map((e) => (
              <div
                key={e.key}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <p className="min-w-0 truncate">{e.title}</p>
                <p
                  className={`shrink-0 font-semibold ${
                    e.dir === "in" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {e.dir === "in" ? "+" : "-"}
                  {formatCurrency(e.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

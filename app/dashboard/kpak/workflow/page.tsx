"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CreditCard,
  Send,
  ArrowRightLeft,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  RefreshCw,
  ChevronRight,
  Loader2,
  Wallet,
  BookOpen,
  ClipboardList,
  Clock,
  PiggyBank,
} from "lucide-react";
import { toast } from "sonner";
import { usePageGuard } from "@/lib/use-page-guard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickAccessGrid } from "@/components/dashboard/QuickAccessGrid";
import type { QuickAccessAction } from "@/components/dashboard/QuickAccessGrid";
import { getKpakPhase, type KpakPhaseKey } from "@/lib/kpak-phase";

/**
 * Pusat Kerja Manager KPAK — alur harian dalam 5 langkah:
 * 1. Awasi shift & kru → 2. Layani transaksi → 3. Pengajuan →
 * 4. Rekonsiliasi + serah terima → 5. Rekap & lapor.
 *
 * FILE BARU (di luar permukaan beku staff — lihat docs/KPAK-STAFF-FREEZE.md).
 * Hanya membaca API yang sudah ada; tidak mengubah perilaku file lain.
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

type StepStatus = "done" | "action" | "locked" | "info";

interface StepAction {
  label: string;
  href: string;
}

interface Step {
  no: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
  status: StepStatus;
  statusLabel: string;
  facts: string[];
  actions: StepAction[];
  phase: KpakPhaseKey;
}

const PHASE_META: { key: KpakPhaseKey; title: string; time: string }[] = [
  { key: "pagi", title: "Pagi", time: "sebelum 08:00" },
  { key: "operasi", title: "Operasional", time: "08:00–16:00" },
  { key: "tutup", title: "Penutupan", time: "16:00–17:00" },
  { key: "selesai", title: "Selesai", time: "setelah 17:00" },
];

const statusStyle: Record<StepStatus, string> = {
  done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  action: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  locked: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

const statusIcon = (s: StepStatus) =>
  s === "done" ? (
    <CheckCircle2 size={14} />
  ) : s === "action" ? (
    <CircleAlert size={14} />
  ) : (
    <CircleDashed size={14} />
  );

export default function ManagerWorkflowPage() {
  // Manager KPAK (+ SUPERADMIN/PIMPINAN untuk pengawasan). Retail tidak masuk.
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      (u?.role === "MANAGER" && u?.unitIsRetail !== true),
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shiftOn, setShiftOn] = useState(false);
  const [crewOn, setCrewOn] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [txTotal, setTxTotal] = useState(0);
  const [savCount, setSavCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [handover, setHandover] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const today = todayLocal();
      const [shiftRes, txRes, savRes, apprRes, hoRes] = await Promise.all([
        fetch("/api/kpak/shift").catch(() => null),
        fetch(`/api/transactions?startDate=${today}&endDate=${today}&limit=200`).catch(() => null),
        fetch("/api/savings/transactions").catch(() => null),
        fetch("/api/approvals").catch(() => null),
        fetch(`/api/handovers?date=${today}`).catch(() => null),
      ]);

      if (shiftRes && shiftRes.ok) {
        const j = await shiftRes.json();
        const mine = j?.data?.mine;
        setShiftOn(!!mine && !mine.checkOutAt);
        const crew: any[] = j?.data?.crew || [];
        setCrewOn(crew.filter((c) => c.attendance && !c.attendance.checkOutAt).length);
      }
      if (txRes && txRes.ok) {
        const j = await txRes.json();
        const list: any[] = (j.data || j.transactions || []).filter(
          (x: any) => x.status !== "REJECTED",
        );
        setTxCount(list.length);
        setTxTotal(list.reduce((s, x) => s + Number(x.amount || 0), 0));
      }
      if (savRes && savRes.ok) {
        const j = await savRes.json();
        const list: any[] = (j.data || []).filter(
          (x: any) => (x.createdAt || "").slice(0, 10) === today,
        );
        setSavCount(list.length);
      }
      if (apprRes && apprRes.ok) {
        const j = await apprRes.json();
        const list: any[] = j.data ?? [];
        setPendingApprovals(list.filter((a) => a.status === "PENDING").length);
      }
      if (hoRes && hoRes.ok) {
        const j = await hoRes.json();
        const list: any[] = j.data || [];
        setHandover(list.length > 0 ? list[0].status : null);
      }
    } catch {
      toast.error("Gagal memuat status alur kerja");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Tiap langkah SATU aksi utama — sisanya lewat Akses Cepat di bawah.
  // (Aturan: nama tombol = nama halaman tujuan, tanpa nama ganda.)
  const steps: Step[] = [
    {
      no: 1,
      title: "Awasi Shift & Kru",
      phase: "pagi",
      desc: "Check-in pengawasan, pantau siapa sedang bertugas.",
      icon: <Users size={22} />,
      status: shiftOn ? "done" : "action",
      statusLabel: shiftOn ? "Sudah check-in" : "Belum check-in",
      facts: shiftOn
        ? [`${crewOn} kru sedang bertugas`]
        : ["Check-in dulu untuk membuka layanan hari ini"],
      actions: [{ label: "Shift Saya", href: "/dashboard/kpak/shift" }],
    },
    {
      no: 2,
      title: "Layani Transaksi",
      phase: "operasi",
      desc: "Keuangan santri, tabungan, dan data santri.",
      icon: <CreditCard size={22} />,
      status: !shiftOn ? "locked" : "info",
      statusLabel: !shiftOn ? "Terkunci — check-in dulu" : `${txCount + savCount} transaksi hari ini`,
      facts: shiftOn
        ? [`Layanan: ${formatCurrency(txTotal)} tercatat`, "Tabungan & keuangan terbuka"]
        : ["Menu layanan aktif setelah check-in"],
      actions: [{ label: "Layanan Keuangan", href: "/dashboard/kpak/finance" }],
    },
    {
      no: 3,
      title: "Perlu Keputusan",
      phase: "operasi",
      desc: "Satu antrean: laporan shift, operasional, dan anggaran.",
      icon: <Send size={22} />,
      status: pendingApprovals > 0 ? "action" : "info",
      statusLabel:
        pendingApprovals > 0 ? `${pendingApprovals} menunggu keputusan` : "Tidak ada antrean",
      facts:
        pendingApprovals > 0
          ? ["Ada yang perlu diputuskan"]
          : ["Antrean persetujuan kosong"],
      actions: [{ label: "Perlu Keputusan", href: "/dashboard/kpak/review" }],
    },
    {
      no: 4,
      title: "Tutup Hari",
      phase: "tutup",
      desc: "Cocokkan kas, lalu serahkan ke pimpinan.",
      icon: <ArrowRightLeft size={22} />,
      status:
        handover === "ACCEPTED"
          ? "done"
          : handover === "PENDING"
            ? "info"
            : "action",
      statusLabel:
        handover === "ACCEPTED"
          ? "Diterima pimpinan"
          : handover === "PENDING"
            ? "Menunggu pimpinan"
            : handover === "REJECTED"
              ? "Ditolak — periksa lagi"
              : "Belum diserahkan",
      facts:
        handover === "ACCEPTED"
          ? ["Tutup hari ini selesai"]
          : ["Rekonsiliasi dulu, baru serah terima"],
      actions: [{ label: "Tutup Hari", href: "/dashboard/kpak/close-day" }],
    },
    {
      no: 5,
      title: "Rekap & Lapor",
      phase: "selesai",
      desc: "Rekap harian tabungan, administrasi, dan internal.",
      icon: <BarChart3 size={22} />,
      status: "info",
      statusLabel: "Siap dibuka kapan saja",
      facts: [`Hari ini: ${txCount} layanan + ${savCount} tabungan`],
      actions: [{ label: "Rekap & Laporan", href: "/dashboard/kpak/reports" }],
    },
  ];

  const quickAccess: QuickAccessAction[] = [
    { href: "/dashboard/kpak/crew", icon: Users, label: "Kru & Kinerja", color: "islamic" },
    { href: "/dashboard/kpak/review", icon: ClipboardList, label: "Perlu Keputusan", color: "amber" },
    { href: "/dashboard/kpak/close-day", icon: Clock, label: "Tutup Hari", color: "blue" },
    { href: "/dashboard/kpak/my-budget", icon: Wallet, label: "Anggaran Saya", color: "green" },
    { href: "/dashboard/kpak/finance", icon: CreditCard, label: "Layanan Keuangan", color: "purple" },
    { href: "/dashboard/savings", icon: PiggyBank, label: "Tabungan", color: "orange" },
    { href: "/dashboard/kpak/reports", icon: BarChart3, label: "Rekap", color: "slate" },
    { href: "/dashboard/kpak/students", icon: BookOpen, label: "Data Santri", color: "accent" },
  ];

  const nextStep = steps.find((s) => s.status === "action") || null;
  const phase = getKpakPhase();

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Memuat alur kerja...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-24 md:pb-8">
      <DashboardHeader
        title="Pusat Kerja Manager"
        subtitle="Alur harian KPAK dalam 5 langkah"
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Memuat..." : "Segarkan status"}
        </button>
      </div>

      {/* Fase operasional berjalan — linimasa kerja hari ini */}
      <div className="rounded-[22px] border border-primary/25 bg-primary/[0.05] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
          Sekarang: {phase.label}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{phase.hint}</p>
        <div className="mt-2 flex gap-1">
          {PHASE_META.map((m) => (
            <div
              key={m.key}
              className={`h-1.5 flex-1 rounded-full ${m.key === phase.key ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      </div>

      {nextStep && (
        <Link
          href={nextStep.actions[0].href}
          className="block rounded-[22px] border border-amber-500/30 bg-amber-500/[0.07] p-4 shadow-sm transition hover:-translate-y-0.5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
            Tugas berikutnya
          </p>
          <p className="mt-1 text-base font-bold text-foreground">
            Langkah {nextStep.no}: {nextStep.title}
          </p>
          <p className="text-sm text-muted-foreground">{nextStep.statusLabel}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
            {nextStep.actions[0].label} <ChevronRight size={16} />
          </span>
        </Link>
      )}

      {/* Akses cepat — semua halaman baru + utama, satu nama satu tujuan */}
      <div className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Akses Cepat
        </p>
        <QuickAccessGrid actions={quickAccess} />
      </div>

      {PHASE_META.map((m) => {
        const group = steps.filter((s) => s.phase === m.key);
        if (group.length === 0) return null;
        const current = m.key === phase.key;
        return (
          <section key={m.key} className="space-y-3">
            <div className="flex items-baseline justify-between px-1">
              <h2
                className={`text-sm font-bold ${current ? "text-primary" : "text-muted-foreground"}`}
              >
                {current ? "● " : ""}{m.title}
              </h2>
              <p className="text-[11px] text-muted-foreground">{m.time}</p>
            </div>
            <ol className="space-y-3">
              {group.map((s) => (
          <li
            key={s.no}
            className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {s.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {s.no}. {s.title}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyle[s.status]}`}
                  >
                    {statusIcon(s.status)} {s.statusLabel}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {s.facts.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground">
                      • {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {s.actions.map((a) => (
                    <Link
                      key={a.href + a.label}
                      href={a.href}
                      className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-95"
                    >
                      {a.label} <ChevronRight size={14} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </li>
              ))}
            </ol>
          </section>
        );
      })}

      <div className="rounded-[22px] border border-border bg-muted/40 p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Wallet size={14} /> Kelola (bukan harian)
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/dashboard/settings/categories"
            className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <BookOpen size={13} /> Kategori Layanan
          </Link>
          <Link
            href="/dashboard/kpak/students/new"
            className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Users size={13} /> Tambah Santri
          </Link>
        </div>
      </div>
    </div>
  );
}

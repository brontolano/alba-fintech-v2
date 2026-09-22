"use client";

import {
  ShoppingCart,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  BarChart3,
  BookOpen,
  CreditCard,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import type { QuickAccessAction } from "@/components/dashboard/QuickAccessGrid";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { QuickAccessGrid } from "@/components/dashboard/QuickAccessGrid";
import { TxCompactList } from "@/components/dashboard/TxCompactList";
import { BarChart } from "@/components/charts/BarChart";
import { barChartOptions } from "@/components/charts/chartOptions";
import { KpakCashSummary } from "@/components/kpak/KpakCashSummary";

export default function StaffDashboard() {
  const { data: session } = useSession();
  const canUseRetailModules = session?.user?.unitIsRetail === true;
  const { data, loading, error, formatCurrency, refetch } = useDashboardData({
    range: "7d",
  });

  if (loading) {
    return (
      <div className="p-6 text-center py-12 text-muted-foreground">
        Memuat data dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-8">
          <p className="text-sm font-semibold text-destructive mb-1">
            Gagal memuat dashboard
          </p>
          <p className="text-sm text-destructive/80 mb-5">{error}</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm transition-all hover:bg-primary/90 focus-visible-ring"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    summary,
    recentTransactions,
    chartData,
    units: dataUnits,
  } = data;

  const shiftIncome = recentTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const shiftExpense = recentTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  const retailActions: QuickAccessAction[] = [
    {
      href: "/dashboard/pos",
      icon: ShoppingCart,
      label: "POS",
      color: "orange",
    },
    {
      href: "/dashboard/inventory",
      icon: Package,
      label: "Inventori",
      color: "amber",
    },
  ];

  const nonRetailActions: QuickAccessAction[] = [
    {
      href: "/dashboard/cash-unit",
      icon: Wallet,
      label: "Kas Unit",
      color: "amber",
    },
  ];

  const isKpak = session?.user?.unitType === "KPAK";

  const kpakActions: QuickAccessAction[] = [
    {
      href: "/dashboard/kpak/students",
      icon: BookOpen,
      label: "Santri",
      color: "blue",
    },
    {
      href: "/dashboard/savings",
      icon: Wallet,
      label: "Tabungan",
      color: "green",
    },
    {
      href: "/dashboard/kpak/finance",
      icon: CreditCard,
      label: "Layanan",
      color: "orange",
    },
    {
      href: "/dashboard/kpak/internal",
      icon: FileText,
      label: "Internal",
      color: "amber",
    },
    {
      href: "/dashboard/kpak/reports",
      icon: BarChart3,
      label: "Rekap",
      color: "purple",
    },
  ];

  const quickActions: QuickAccessAction[] = isKpak
    ? kpakActions
    : [
        {
          href: "/dashboard/transactions/create",
          icon: Receipt,
          label: "Buku Kas",
          color: "islamic",
        },
        {
          href: "/dashboard/transactions",
          icon: TrendingUp,
          label: "Transaksi",
          color: "green",
        },
        ...(canUseRetailModules ? retailActions : nonRetailActions),
        {
          href: "/dashboard/reports",
          icon: BarChart3,
          label: "Laporan",
          color: "purple",
        },
      ];

  return (
    <div className="space-y-4">
      <DashboardHeader title="Kasir Interface" subtitle="Staff Unit" />

      {session?.user?.unitType === "KPAK" && <KpakCashSummary />}

      {/* Hero: Saldo Unit + CTA */}
      <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#10b981_0%,#0f766e_50%,#0f172a_100%)] p-5 text-white shadow-[0_18px_42px_rgba(16,185,129,0.2)]">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-100/80">
                Saldo Unit Saat Ini
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {formatCurrency(summary.totalBalance)}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Wallet className="h-5 w-5 text-emerald-100" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-100/70">
                Masuk
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-100">
                {formatCurrency(summary.todayIncome || 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-100/70">
                Keluar
              </p>
              <p className="mt-1 text-sm font-bold text-rose-200">
                {formatCurrency(summary.todayExpense || 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-100/70">
                Transaksi
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {summary.todayTransactions || 0}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {canUseRetailModules && (
              <Link
                href="/dashboard/pos"
                className="flex items-center justify-center gap-2 rounded-full bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] focus-visible-ring"
              >
                <ShoppingCart size={16} />
                Mulai Transaksi
              </Link>
            )}
            <Link
              href="/dashboard/transactions/create"
              className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/15 active:scale-[0.98] focus-visible-ring"
            >
              <Receipt size={16} />
              Input Manual
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Access — Fokus Operasional */}
      <QuickAccessGrid actions={quickActions} />

      {/* Stat Shift */}
      <StatTiles
        stats={[
          {
            label: "Transaksi Shift",
            value: String(recentTransactions.length),
            icon: Receipt,
            tone: "islamic",
          },
          {
            label: "Pemasukan Shift",
            value: formatCurrency(shiftIncome),
            icon: ArrowUpRight,
            tone: "green",
          },
          {
            label: "Pengeluaran Shift",
            value: formatCurrency(shiftExpense),
            icon: ArrowDownRight,
            tone: "red",
          },
        ]}
      />

      {/* Charts */}
      <div className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Pemasukan vs Pengeluaran Unit
        </h2>
        {chartData && chartData.labels.length > 0 ? (
          <div className="h-52">
            <BarChart
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    label: "Pemasukan",
                    data: chartData.income,
                    backgroundColor: "rgba(34, 197, 94, 0.6)",
                    borderColor: "rgb(34, 197, 94)",
                    borderWidth: 1,
                  },
                  {
                    label: "Pengeluaran",
                    data: chartData.expense,
                    backgroundColor: "rgba(249, 112, 102, 0.6)",
                    borderColor: "rgb(249, 112, 102)",
                    borderWidth: 1,
                  },
                ],
              }}
              options={barChartOptions(formatCurrency)}
            />
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Tidak ada data grafik
          </div>
        )}
      </div>

      {/* Transaksi Shift Saya */}
      <div className="overflow-hidden rounded-[22px] border border-border bg-card/90 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Transaksi Shift Saya
          </h2>
          <Link
            href="/dashboard/transactions"
            className="text-xs font-medium text-primary hover:text-primary/80"
          >
            Lihat semua
          </Link>
        </div>
        <TxCompactList
          items={recentTransactions.map((tx) => ({
            ...tx,
            date: tx.date,
            href: `/dashboard/transactions/${tx.id}`,
            status: tx.status,
          }))}
          formatCurrency={formatCurrency}
          emptyText="Belum ada transaksi pada shift ini"
        />
      </div>
    </div>
  );
}

"use client";

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  LayoutGrid,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  ClipboardList,
  BarChart3,
  Clock,
  Calendar,
  Users,
  Landmark,
  Settings,
} from "lucide-react";
import {
  useDashboardData,
  type RangeOption,
} from "@/components/dashboard/useDashboardData";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { QuickAccessGrid } from "@/components/dashboard/QuickAccessGrid";
import { LiveTransactionFeed } from "@/components/dashboard/LiveTransactionFeed";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import Link from "next/link";
import { BarChart } from "@/components/charts/BarChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  barChartOptions,
  doughnutChartOptions,
} from "@/components/charts/chartOptions";
import { UnitVirtualCard } from "@/components/dashboard/UnitVirtualCard";

const RANGE_OPTIONS: { value: RangeOption; label: string }[] = [
  { value: "today", label: "Hari Ini" },
  { value: "7d", label: "7 Hari" },
  { value: "30d", label: "30 Hari" },
  { value: "90d", label: "90 Hari" },
];

const RANGE_LABELS: Record<RangeOption, string> = {
  today: "Hari Ini",
  "7d": "7 Hari Terakhir",
  "30d": "30 Hari Terakhir",
  "90d": "90 Hari Terakhir",
};

const DOUGHNUT_COLORS = [
  "rgba(34, 197, 94, 0.85)",
  "rgba(249, 112, 102, 0.85)",
  "rgba(251, 191, 36, 0.85)",
  "rgba(59, 130, 246, 0.85)",
  "rgba(139, 92, 246, 0.85)",
  "rgba(14, 165, 233, 0.85)",
  "rgba(236, 72, 153, 0.85)",
  "rgba(100, 116, 139, 0.85)",
];

function SuperadminDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse rounded-[22px] border border-border bg-card/90 p-5">
        <div className="h-3 w-28 rounded-md bg-border/30" />
        <div className="mt-3 h-7 w-64 max-w-full rounded-lg bg-border/30" />
        <div className="mt-2 h-4 w-80 max-w-full rounded-md bg-border/30" />
      </div>

      <div className="flex flex-wrap animate-pulse items-center justify-between gap-3 rounded-[18px] border border-border bg-card/90 p-3">
        <div className="h-5 w-36 rounded-lg bg-border/30" />
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-16 rounded-full bg-border/30" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-6">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-16 w-16 animate-pulse rounded-2xl bg-border/30" />
            <div className="h-3 w-10 rounded-md bg-border/30" />
          </div>
        ))}
      </div>

      <div className="h-44 animate-pulse rounded-[24px] bg-emerald-500/15" />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-2xl border border-border bg-card/90"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-72 animate-pulse rounded-[22px] border border-border bg-card/90 lg:col-span-3" />
        <div className="h-72 animate-pulse rounded-[22px] border border-border bg-card/90 lg:col-span-2" />
      </div>
    </div>
  );
}

export default function SuperadminDashboard() {
  const {
    data,
    loading,
    error,
    formatCurrency,
    refetch,
    activeRange,
  } = useDashboardData({
    range: "7d",
  });

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <SuperadminDashboardSkeleton />
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

  const { summary, units, chartData, expenseByCategory } = data;
  const netIncome = summary.totalIncome - summary.totalExpense;
  const netMargin =
    summary.totalIncome > 0 ? (netIncome / summary.totalIncome) * 100 : 0;

  const rangeLabel = RANGE_LABELS[activeRange];

  return (
    <div className="space-y-4">
      <DashboardHeader
        title="Executive Command Center"
        subtitle="Superadmin"
        systemStatus={{ server: "Normal", sync: "Aktif" }}
      />

      {/* Range Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border bg-card/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-medium text-muted-foreground">
            Periode:{" "}
            <span className="font-semibold text-foreground">{rangeLabel}</span>
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => refetch(opt.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible-ring ${
                activeRange === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Access — Semua Modul */}
      <QuickAccessGrid
        actions={[
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
          {
            href: "/dashboard/reconciliation",
            icon: Clock,
            label: "Rekonsiliasi",
            color: "purple",
          },
          {
            href: "/dashboard/reports",
            icon: BarChart3,
            label: "Laporan",
            color: "blue",
          },
          {
            href: "/dashboard/approvals",
            icon: ClipboardList,
            label: "Persetujuan",
            color: "amber",
          },
          {
            href: "/dashboard/units",
            icon: LayoutGrid,
            label: "Unit",
            color: "accent",
          },
          {
            href: "/dashboard/users",
            icon: Users,
            label: "Pengguna",
            color: "green",
          },
          {
            href: "/dashboard/lembaga",
            icon: Landmark,
            label: "Lembaga",
            color: "purple",
          },
          {
            href: "/dashboard/settings",
            icon: Settings,
            label: "Pengaturan",
            color: "accent",
          },
        ]}
      />

      {/* Hero: Kartu Saldo Konsolidasi */}
      <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#10b981_0%,#0f766e_50%,#0f172a_100%)] p-5 text-white shadow-[0_18px_42px_rgba(16,185,129,0.2)]">
        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 left-0 h-28 w-28 rounded-full bg-emerald-300/20 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-100/80">
                Kartu Saldo Konsolidasi
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
                Pemasukan
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-sm font-bold text-emerald-100">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {formatCurrency(summary.totalIncome)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-100/70">
                Pengeluaran
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-sm font-bold text-rose-100">
                <ArrowDownRight className="h-3.5 w-3.5" />
                {formatCurrency(summary.totalExpense)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-100/70">
                Hari Ini
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {summary.todayTransactions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Tiles */}
      <StatTiles
        stats={[
          {
            label: "Margin Bersih",
            value: `${netMargin.toFixed(1)}%`,
            icon: Target,
            tone: "blue",
          },
          {
            label: "Pemasukan",
            value: formatCurrency(summary.totalIncome),
            icon: TrendingUp,
            tone: "green",
          },
          {
            label: "Pengeluaran",
            value: formatCurrency(summary.totalExpense),
            icon: TrendingDown,
            tone: "red",
          },
          {
            label: "Total Saldo",
            value: formatCurrency(summary.totalBalance),
            icon: Wallet,
            tone: "islamic",
          },
        ]}
      />

      {/* Menunggu Persetujuan */}
      <PendingApprovalsWidget formatCurrency={formatCurrency} maxItems={5} />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <ChartCard
          title="Arus Kas Global"
          subtitle={`Ringkasan pemasukan dan pengeluaran · ${rangeLabel}`}
          className="lg:col-span-3"
        >
          {chartData && chartData.labels.length > 0 ? (
            <div className="h-60">
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
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm text-muted-foreground/80">
                Tidak ada data grafik
              </p>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Komposisi Pengeluaran"
          subtitle="Pengeluaran per kategori"
          className="lg:col-span-2"
        >
          {expenseByCategory && expenseByCategory.length > 0 ? (
            <div className="h-60">
              <DoughnutChart
                data={{
                  labels: expenseByCategory.map((c) => c.name),
                  datasets: [
                    {
                      data: expenseByCategory.map((c) => c.amount),
                      backgroundColor: DOUGHNUT_COLORS.slice(
                        0,
                        expenseByCategory.length,
                      ),
                      borderWidth: 2,
                      borderColor: "hsl(var(--card))",
                    },
                  ],
                }}
                options={doughnutChartOptions(formatCurrency)}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm text-muted-foreground/80">
                Tidak ada data pengeluaran
              </p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Ringkasan per Unit */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            Ringkasan per Unit
          </h2>
          <Link
            href="/dashboard/units"
            className="text-xs font-medium text-primary hover:text-primary/80"
          >
            Kelola Unit →
          </Link>
        </div>
        {units.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Tidak ada unit dengan transaksi
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {units.map((unit) => (
              <UnitVirtualCard
                key={unit.id}
                unit={unit}
                formatCurrency={formatCurrency}
                detailHref={`/dashboard/reports?unit=${unit.id}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Live Transaction Feed */}
      <LiveTransactionFeed />
    </div>
  );
}
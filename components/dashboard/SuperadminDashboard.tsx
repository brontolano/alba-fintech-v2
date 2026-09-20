"use client";

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Building2,
  LayoutGrid,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  ClipboardList,
  Package,
  ShoppingCart,
  BarChart3,
  Clock,
  Settings,
} from "lucide-react";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { QuickAccessGrid } from "@/components/dashboard/QuickAccessGrid";
import { LiveTransactionFeed } from "@/components/dashboard/LiveTransactionFeed";
import Link from "next/link";
import { BarChart } from "@/components/charts/BarChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  barChartOptions,
  doughnutChartOptions,
} from "@/components/charts/chartOptions";
import { UnitVirtualCard } from "@/components/dashboard/UnitVirtualCard";

export default function SuperadminDashboard() {
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

  const { summary, units, chartData, expenseByCategory } = data;
  const netIncome = summary.totalIncome - summary.totalExpense;
  const netMargin =
    summary.totalIncome > 0 ? (netIncome / summary.totalIncome) * 100 : 0;

  return (
    <div className="space-y-4">
      <DashboardHeader
        title="Executive Command Center"
        subtitle="Superadmin"
        systemStatus={{ server: "Normal", sync: "Aktif" }}
      />

      {/* Quick Access — Semua Modul */}
      <QuickAccessGrid
        actions={[
          {
            href: "/dashboard/transactions",
            icon: Receipt,
            label: "Transaksi",
            color: "islamic",
          },
          {
            href: "/dashboard/approvals",
            icon: ClipboardList,
            label: "Persetujuan",
            color: "amber",
          },
          {
            href: "/dashboard/lembaga",
            icon: Building2,
            label: "Lembaga",
            color: "islamic",
          },
          {
            href: "/dashboard/units",
            icon: LayoutGrid,
            label: "Unit",
            color: "purple",
          },
          {
            href: "/dashboard/users",
            icon: Users,
            label: "Pengguna",
            color: "accent",
          },
          {
            href: "/dashboard/inventory",
            icon: Package,
            label: "Inventori",
            color: "green",
          },
          {
            href: "/dashboard/pos",
            icon: ShoppingCart,
            label: "POS",
            color: "orange",
          },
          {
            href: "/dashboard/reports",
            icon: BarChart3,
            label: "Laporan",
            color: "blue",
          },
          {
            href: "/dashboard/reconciliation",
            icon: Clock,
            label: "Rekonsiliasi",
            color: "purple",
          },
          {
            href: "/dashboard/settings",
            icon: Settings,
            label: "Pengaturan",
            color: "slate",
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Arus Kas Global"
          subtitle="Ringkasan pemasukan dan pengeluaran bulanan"
        >
          {chartData && chartData.labels.length > 0 ? (
            <div className="h-64">
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
          title="Pengeluaran per Kategori"
          subtitle="Distribusi pengeluaran berdasarkan tipe"
        >
          {expenseByCategory && expenseByCategory.length > 0 ? (
            <div className="h-64">
              <DoughnutChart
                data={{
                  labels: expenseByCategory.map((c) => c.name),
                  datasets: [
                    {
                      data: expenseByCategory.map((c) => c.amount),
                      backgroundColor: [
                        "rgba(249, 112, 102, 0.8)",
                        "rgba(251, 191, 36, 0.8)",
                        "rgba(147, 51, 234, 0.8)",
                        "rgba(59, 130, 246, 0.8)",
                        "rgba(6, 182, 209, 0.8)",
                        "rgba(168, 85, 247, 0.8)",
                        "rgba(236, 72, 153, 0.8)",
                        "rgba(34, 197, 94, 0.8)",
                      ],
                      borderColor: [
                        "rgb(249, 112, 102)",
                        "rgb(251, 191, 36)",
                        "rgb(147, 51, 234)",
                        "rgb(59, 130, 246)",
                        "rgb(6, 182, 209)",
                        "rgb(168, 85, 247)",
                        "rgb(236, 72, 153)",
                        "rgb(34, 197, 94)",
                      ],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={doughnutChartOptions(formatCurrency)}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm text-muted-foreground/80">
                Tidak ada pengeluaran
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

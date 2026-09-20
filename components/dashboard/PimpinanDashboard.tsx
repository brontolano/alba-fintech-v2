"use client";

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle,
  Download,
  Receipt,
  ClipboardList,
  BarChart3,
  Clock,
  Monitor,
} from "lucide-react";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { useLiveTransactions } from "@/components/dashboard/useLiveTransactions";
import { TxCompactList } from "@/components/dashboard/TxCompactList";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import { QuickAccessGrid } from "@/components/dashboard/QuickAccessGrid";
import { BarChart } from "@/components/charts/BarChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import {
  barChartOptions,
  doughnutChartOptions,
} from "@/components/charts/chartOptions";
import { ChartCard } from "@/components/charts/ChartCard";
import { UnitVirtualCard } from "@/components/dashboard/UnitVirtualCard";

export default function PimpinanDashboard() {
  const { data, loading, error, formatCurrency, refetch } = useDashboardData({
    range: "7d",
  });

  // Hooks harus dipanggil sebelum early return apapun (Rules of Hooks)
  const live = useLiveTransactions();

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
  const todayNet = summary.todayIncome - summary.todayExpense;

  return (
    <div className="space-y-4">
      <DashboardHeader
        title="Dashboard Eksekutif"
        subtitle="Pimpinan Lembaga"
      />

      {/* Quick Access — Modul Pimpinan */}
      <QuickAccessGrid
        actions={[
          {
            href: "/dashboard/transactions/create",
            icon: Receipt,
            label: "Buku Kas",
            color: "islamic",
          },
          {
            href: "/dashboard/monitor",
            icon: Monitor,
            label: "Papan Pantau",
            color: "blue",
          },
          {
            href: "/dashboard/transactions",
            icon: TrendingUp,
            label: "Transaksi",
            color: "green",
          },
          {
            href: "/dashboard/reports",
            icon: BarChart3,
            label: "Laporan",
            color: "purple",
          },
          {
            href: "/dashboard/reconciliation",
            icon: Clock,
            label: "Rekonsiliasi",
            color: "accent",
          },
          {
            href: "/dashboard/approvals",
            icon: ClipboardList,
            label: "Persetujuan",
            color: "amber",
          },
        ]}
      />

      {/* Menunggu Persetujuan (aksi langsung) */}
      <PendingApprovalsWidget formatCurrency={formatCurrency} />

      {/* Stat Tiles */}
      <StatTiles
        stats={[
          {
            label: "Total Saldo",
            value: formatCurrency(summary.totalBalance),
            icon: Wallet,
            tone: "islamic",
          },
          {
            label: "Hari Ini",
            value: formatCurrency(todayNet),
            icon: TrendingUp,
            tone: todayNet >= 0 ? "green" : "red",
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
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[22px] border border-border bg-card/90 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Margin Bersih
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {`${netMargin.toFixed(1)}%`}
          </div>
        </div>
        <div className="rounded-[22px] border border-border bg-card/90 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Arus Kas Hari Ini
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {formatCurrency(summary.todayIncome)} masuk /{" "}
            {formatCurrency(summary.todayExpense)} keluar
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Kesehatan Keuangan Pesantren"
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

      {/* Ringkasan Per-Unit */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2.5">
          Ringkasan Per-Unit
        </h2>
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

      {/* Transaksi Terbaru (live feed) */}
      <div className="overflow-hidden rounded-[22px] border border-border bg-card/90 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Transaksi Terbaru
          </h2>
          <button
            onClick={live.refetch}
            className="text-xs font-medium text-primary hover:text-primary/80"
          >
            Refresh
          </button>
        </div>
        <TxCompactList
          items={live.transactions.slice(0, 5).map((tx) => ({
            id: tx.id,
            description: tx.description,
            date: tx.date,
            amount: tx.amount,
            type: tx.type,
            unit: tx.unit,
            status: tx.status,
            href: `/dashboard/transactions/${tx.id}`,
          }))}
          formatCurrency={formatCurrency}
          emptyText="Tidak ada transaksi terbaru"
        />
      </div>
    </div>
  );
}

"use client";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ShoppingCart,
  Send,
  Package,
  BarChart3,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import { QuickAccessGrid } from "@/components/dashboard/QuickAccessGrid";
import { TxCompactList } from "@/components/dashboard/TxCompactList";
import { BarChart } from "@/components/charts/BarChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import {
  barChartOptions,
  doughnutChartOptions,
} from "@/components/charts/chartOptions";
import { UnitVirtualCard } from "@/components/dashboard/UnitVirtualCard";

export default function ManagerDashboard() {
  const { data: session } = useSession();
  const unitId = session?.user?.unitId;
  const canUseRetailModules = session?.user?.unitIsRetail === true;
  const { data, loading, error, formatCurrency, refetch } = useDashboardData({
    range: "30d",
    unitId: unitId ?? undefined,
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

  const { summary, units, recentTransactions, chartData, expenseByCategory } =
    data;

  const netIncome = summary.totalIncome - summary.totalExpense;
  const todayIncome = summary.todayIncome;
  const todayExpense = summary.todayExpense;
  const netToday = summary.netToday;

  return (
    <div className="space-y-4">
      <DashboardHeader title="Dashboard Unit" subtitle="Manager" />

      {/* Quick Access — Modul Manager */}
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
          ...(canUseRetailModules
            ? ([
                {
                  href: "/dashboard/inventory",
                  icon: Package,
                  label: "Inventori",
                  color: "amber",
                },
              ] as const)
            : []),
          ...(canUseRetailModules
            ? ([
                {
                  href: "/dashboard/pos",
                  icon: ShoppingCart,
                  label: "POS",
                  color: "orange",
                },
              ] as const)
            : []),
          {
            href: "/dashboard/reconciliation",
            icon: Clock,
            label: "Rekonsiliasi",
            color: "accent",
          },
          {
            href: "/dashboard/reports",
            icon: BarChart3,
            label: "Laporan",
            color: "purple",
          },
        ]}
      />

      {/* Menunggu Persetujuan (transaksi Staff di unit ini) */}
      <PendingApprovalsWidget formatCurrency={formatCurrency} />

      {/* Stat Tiles */}
      <StatTiles
        stats={[
          {
            label: "Saldo Unit",
            value: formatCurrency(summary.totalBalance),
            icon: Wallet,
            tone: "islamic",
          },
          {
            label: "Pemasukan Hari Ini",
            value: formatCurrency(todayIncome),
            icon: TrendingUp,
            tone: "green",
          },
          {
            label: "Pengeluaran Hari Ini",
            value: formatCurrency(todayExpense),
            icon: TrendingDown,
            tone: "red",
          },
          {
            label: "Arus Kas Bersih",
            value: formatCurrency(netToday),
            icon: netToday >= 0 ? TrendingUp : TrendingDown,
            tone: netToday >= 0 ? "green" : "red",
          },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[22px] border border-border bg-card/90 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Total Unit (30d)
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {formatCurrency(summary.totalIncome)} masuk /{" "}
            {formatCurrency(summary.totalExpense)} keluar
          </div>
        </div>
        <div className="rounded-[22px] border border-border bg-card/90 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Margin Bersih Unit
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {formatCurrency(netIncome)}
          </div>
        </div>
      </div>

      {/* Ringkasan Unit */}
      {units.length > 0 && (
        <div>
          <h2 className="mb-2.5 text-sm font-semibold text-foreground">
            Ringkasan Unit
          </h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {units.map((unit) => (
              <UnitVirtualCard
                key={unit.id}
                unit={unit}
                formatCurrency={formatCurrency}
                detailHref={`/dashboard/reports?unit=${unit.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Pemasukan vs Pengeluaran Unit
          </h2>
          {chartData && chartData.labels.length > 0 ? (
            <div className="h-60 sm:h-64">
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

        <div className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Pengeluaran per Kategori
          </h2>
          {expenseByCategory && expenseByCategory.length > 0 ? (
            <div className="h-60 sm:h-64">
              <DoughnutChart
                data={{
                  labels: expenseByCategory.map((c) => c.name),
                  datasets: [
                    {
                      data: expenseByCategory.map((c) => c.amount),
                      backgroundColor: [
                        "rgba(249, 112, 102, 0.7)",
                        "rgba(251, 191, 36, 0.7)",
                        "rgba(147, 51, 234, 0.7)",
                        "rgba(59, 130, 246, 0.7)",
                        "rgba(6, 182, 209, 0.7)",
                        "rgba(168, 85, 247, 0.7)",
                        "rgba(236, 72, 153, 0.7)",
                        "rgba(34, 197, 94, 0.7)",
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
            <div className="text-center py-10 text-muted-foreground text-sm">
              Tidak ada pengeluaran
            </div>
          )}
        </div>
      </div>

      {/* Transaksi Terbaru Unit */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-elevation-1 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <h2 className="text-sm font-semibold text-foreground">
            Transaksi Terbaru Unit
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
            href: `/dashboard/transactions/${tx.id}`,
            status: tx.status,
          }))}
          formatCurrency={formatCurrency}
          emptyText="Tidak ada transaksi terbaru"
        />
      </div>
    </div>
  );
}

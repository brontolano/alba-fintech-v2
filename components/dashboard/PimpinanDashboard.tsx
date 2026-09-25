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
  Building,
  Tags,
  Users,
  Megaphone,
  Monitor,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
} from "lucide-react";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { useLiveTransactions } from "@/components/dashboard/useLiveTransactions";
import { TxCompactList } from "@/components/dashboard/TxCompactList";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import { QuickAccessGrid } from "@/components/dashboard/QuickAccessGrid";
import { BarChart } from "@/components/charts/BarChart";
import { barChartOptions } from "@/components/charts/chartOptions";
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

  const { summary, units, chartData } = data;
  const netIncome = summary.totalIncome - summary.totalExpense;
  const netMargin =
    summary.totalIncome > 0 ? (netIncome / summary.totalIncome) * 100 : 0;
  const todayNet = summary.todayIncome - summary.todayExpense;

  // Perbandingan kinerja vs periode sebelumnya
  const incomeDelta =
    summary.previousIncome > 0
      ? ((summary.totalIncome - summary.previousIncome) /
          summary.previousIncome) *
        100
      : 0;
  const expenseDelta =
    summary.previousExpense > 0
      ? ((summary.totalExpense - summary.previousExpense) /
          summary.previousExpense) *
        100
      : 0;
  const burdenRatio =
    summary.totalIncome > 0
      ? (summary.totalExpense / summary.totalIncome) * 100
      : 0;
  const burdenStatus =
    burdenRatio > 90
      ? { label: "Kritis", cls: "bg-destructive/10 text-destructive" }
      : burdenRatio > 75
        ? { label: "Waspada", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" }
        : { label: "Sehat", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };

  const pctText = (delta: number) => `${Math.abs(delta).toFixed(0)}%`;
  const deltaSymbol = (delta: number) =>
    Math.abs(delta) < 1 ? (
      <Minus size={12} />
    ) : delta >= 0 ? (
      <ArrowUpRight size={12} />
    ) : (
      <ArrowDownRight size={12} />
    );
  const deltaTone = (delta: number, isExpense = false) => {
    if (Math.abs(delta) < 1) return "text-muted-foreground";
    const good = isExpense ? delta <= 0 : delta >= 0;
    return good
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  };

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
            label: "Input Data",
            color: "islamic",
          },
          {
            href: "/dashboard/transactions",
            icon: ClipboardList,
            label: "Buku Kas",
            color: "green",
          },
          {
            href: "/dashboard/monitor",
            icon: Monitor,
            label: "Papan Pantau",
            color: "blue",
          },
          {
            href: "/dashboard/reports",
            icon: BarChart3,
            label: "Laporan",
            color: "purple",
          },
          {
            href: "/dashboard/announcements",
            icon: Megaphone,
            label: "Pengumuman",
            color: "accent",
          },
          {
            href: "/dashboard/approvals",
            icon: CheckCircle,
            label: "Persetujuan",
            color: "amber",
          },
          {
            href: "/dashboard/units",
            icon: Building,
            label: "Unit",
            color: "orange",
          },
          {
            href: "/dashboard/settings/categories",
            icon: Tags,
            label: "Kategori",
            color: "slate",
          },
          {
            href: "/dashboard/users",
            icon: Users,
            label: "Pegawai",
            color: "red",
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

      {/* Analisis Kinerja — perbandingan & simbol indikasi */}
      <div className="rounded-[22px] border border-border bg-card/90 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Indikator Kinerja Keuangan
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Pemasukan / Pengeluaran 7 hari vs periode sebelumnya
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />{" "}
              Sehat
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />{" "}
              Waspada
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-destructive" />{" "}
              Kritis
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pemasukan */}
          <div className="rounded-2xl border border-border/70 p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <TrendingUp size={13} className="text-emerald-500" />
              Pemasukan
            </div>
            <div className="mt-2 text-lg font-bold text-foreground sm:text-xl">
              {formatCurrency(summary.totalIncome)}
            </div>
            <div
              className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${deltaTone(incomeDelta)}`}
            >
              {deltaSymbol(incomeDelta)}
              <span>{pctText(incomeDelta)}</span>
              <span className="font-medium text-muted-foreground/70">
                vs sebelumnya
              </span>
            </div>
          </div>

          {/* Pengeluaran */}
          <div className="rounded-2xl border border-border/70 p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <TrendingDown size={13} className="text-rose-500" />
              Pengeluaran
            </div>
            <div className="mt-2 text-lg font-bold text-foreground sm:text-xl">
              {formatCurrency(summary.totalExpense)}
            </div>
            <div
              className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${deltaTone(expenseDelta, true)}`}
            >
              {deltaSymbol(expenseDelta)}
              <span>{pctText(expenseDelta)}</span>
              <span className="font-medium text-muted-foreground/70">
                vs sebelumnya
              </span>
            </div>
          </div>

          {/* Rasio Beban */}
          <div className="rounded-2xl border border-border/70 p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Target size={13} className="text-amber-500" />
              Rasio Beban
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="text-lg font-bold text-foreground sm:text-xl">
                {`${burdenRatio.toFixed(1)}%`}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${burdenStatus.cls}`}
              >
                {burdenStatus.label}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(burdenRatio, 100)}%`,
                  background:
                    burdenRatio > 90
                      ? "hsl(var(--destructive))"
                      : burdenRatio > 75
                        ? "#f59e0b"
                        : "#22c55e",
                }}
              />
            </div>
          </div>

          {/* Margin Bersih */}
          <div className="rounded-2xl border border-border/70 p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <CheckCircle size={13} className="text-primary" />
              Margin Bersih
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="text-lg font-bold text-foreground sm:text-xl">
                {`${netMargin.toFixed(1)}%`}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  netMargin >= 20
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : netMargin >= 10
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-destructive/10 text-destructive"
                }`}
              >
                {netMargin >= 20
                  ? "Sehat"
                  : netMargin >= 10
                    ? "Waspada"
                    : "Kritis"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground/80">
              <AlertTriangle
                size={12}
                className={netMargin >= 20 ? "text-emerald-500" : "text-amber-500"}
              />
              <span className="font-medium">
                {netMargin >= 20
                  ? "Kinerja stabil"
                  : "Perlu evaluasi beban"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <ChartCard
        title="Kesehatan Keuangan Pesantren"
        subtitle="Ringkasan pemasukan dan pengeluaran bulanan"
      >
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
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm text-muted-foreground/80">
              Tidak ada data grafik
            </p>
          </div>
        )}
      </ChartCard>

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

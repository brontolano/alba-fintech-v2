"use client";

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  BookOpen,
  Building,
} from "lucide-react";
import { UnitAgg } from "@/components/dashboard/useDashboardData";

interface UnitVirtualCardProps {
  unit: UnitAgg;
  formatCurrency: (amount: number) => string;
  detailHref?: string;
}

const unitTypeConfig: Record<
  string,
  { color: string; icon: React.ReactNode; label: string }
> = {
  Kantin: {
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: <Store className="w-4 h-4 text-orange-600" />,
    label: "Kantin",
  },
  Koperasi: {
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <BookOpen className="w-4 h-4 text-purple-600" />,
    label: "Koperasi",
  },
  KPAK: {
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Building className="w-4 h-4 text-blue-600" />,
    label: "KPAK",
  },
};

export function UnitVirtualCard({
  unit,
  formatCurrency,
  detailHref,
}: UnitVirtualCardProps) {
  const net = unit.income - unit.expense;
  const growth = unit.balance > 0 ? (net / unit.balance) * 100 : 0;
  const typeConfig = unitTypeConfig[unit.type] || {
    color: "bg-muted text-muted-foreground border-border",
    icon: <Wallet className="w-4 h-4" />,
    label: unit.type,
  };

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_16px_34px_rgba(16,185,129,0.08)] md:p-5">
      <div className="absolute right-3 top-3 h-12 w-12 rounded-2xl bg-primary/5 blur-xl" />
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <h3 className="truncate pr-2 text-base font-semibold text-foreground">
          {unit.name}
        </h3>
        <span
          className={`flex flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium ${typeConfig.color}`}
        >
          {typeConfig.icon}
          {typeConfig.label}
        </span>
      </div>

      <div className="relative z-10 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Saldo</span>
          <span className="font-semibold text-foreground">
            {formatCurrency(unit.balance)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Pemasukan</span>
          <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="h-4 w-4" />
            {formatCurrency(unit.income)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Pengeluaran</span>
          <span className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
            <ArrowDownRight className="h-4 w-4" />
            {formatCurrency(unit.expense)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-muted-foreground">Margin</span>
          <span
            className={`font-semibold ${net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
          >
            {net >= 0 ? "+" : ""}
            {formatCurrency(net)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Pertumbuhan</span>
          <span
            className={`font-medium ${growth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
          >
            {growth >= 0 ? "+" : ""}
            {growth.toFixed(1)}%
          </span>
        </div>
      </div>

      {detailHref && (
        <Link
          href={detailHref}
          className="mt-4 block text-center text-sm font-medium text-primary transition hover:text-primary/80"
        >
          Lihat Detail
        </Link>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { Transaction, TxType, TxStatus } from "./useDashboardData";
import type { ComponentType } from "react";

export interface TxItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: TxType;
  status: TxStatus;
  category?: string;
  unit?: string;
  href?: string;
}

export interface TxCompactListProps {
  items: TxItem[];
  formatCurrency: (value: number) => string;
  emptyText?: string;
  showDate?: boolean;
  showStatus?: boolean;
  showCategory?: boolean;
  maxItems?: number;
}

const TYPE_ICON: Record<TxType, ComponentType<{ className?: string }>> = {
  INCOME: ArrowUpRight,
  EXPENSE: ArrowDownRight,
};

const STATUS_CONFIG: Record<
  TxStatus,
  { icon: ComponentType<{ className?: string }>; label: string }
> = {
  COMPLETED: { icon: CheckCircle2, label: "Selesai" },
  PENDING: { icon: Clock, label: "Menunggu" },
  FAILED: { icon: AlertCircle, label: "Gagal" },
  REJECTED: { icon: AlertCircle, label: "Ditolak" },
};

const TYPE_LABEL: Record<TxType, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
};

function getRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Baru saja";
  if (diffHours < 24) return `${diffHours} jam`;
  if (diffDays < 7) return `${diffDays} hari`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

export function TxCompactList({
  items,
  formatCurrency,
  emptyText = "Tidak ada transaksi",
  showDate = true,
  showStatus = true,
  showCategory = true,
  maxItems,
}: TxCompactListProps) {
  const visibleItems = useMemo(() => {
    return maxItems ? items.slice(0, maxItems) : items;
  }, [items, maxItems]);

  if (!visibleItems.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {visibleItems.map((tx) => {
        const TypeIcon = TYPE_ICON[tx.type];
        const typeColor =
          tx.type === "INCOME"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400";
        const relativeDate = getRelativeDate(tx.date);
        const statusConf = STATUS_CONFIG[tx.status];
        const StatusIcon = statusConf.icon;
        const statusColor =
          tx.status === "COMPLETED"
            ? "text-emerald-600 dark:text-emerald-400"
            : tx.status === "PENDING"
              ? "text-amber-600 dark:text-amber-400"
              : "text-rose-600 dark:text-rose-400";

        const rowContent = (
          <>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tx.type === "INCOME" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}
            >
              <TypeIcon className={`h-4 w-4 ${typeColor}`} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {tx.description || TYPE_LABEL[tx.type]}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {showCategory && tx.category && (
                  <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {tx.category}
                  </span>
                )}
                {showStatus && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium ${statusColor}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusConf.label}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end text-right">
              <p
                className={`text-sm font-semibold ${typeColor}`}
                title={formatCurrency(tx.amount)}
              >
                {tx.type === "INCOME" ? "+" : "-"}
                {formatCurrency(tx.amount)}
              </p>
              {showDate && (
                <time
                  dateTime={tx.date}
                  className="mt-1 text-[11px] text-muted-foreground"
                  title={new Date(tx.date).toLocaleString("id-ID")}
                >
                  {relativeDate}
                </time>
              )}
            </div>
          </>
        );

        if (tx.href) {
          return (
            <div
              key={tx.id}
              className="group px-3 py-3 transition-colors hover:bg-muted/30"
            >
              <Link href={tx.href} className="flex items-center gap-3">
                {rowContent}
              </Link>
            </div>
          );
        }

        return (
          <div key={tx.id} className="px-3 py-3">
            <div className="flex items-center gap-3">{rowContent}</div>
          </div>
        );
      })}
    </div>
  );
}

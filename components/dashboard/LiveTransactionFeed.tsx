"use client";

import { RefreshCw } from "lucide-react";
import { useLiveTransactions } from "@/components/dashboard/useLiveTransactions";
import { TxCompactList } from "@/components/dashboard/TxCompactList";

interface LiveTransactionFeedProps {
  /** Jika true, hanya tampilkan transaksi penting/anomali (untuk Pimpinan) */
  importantOnly?: boolean;
}

export function LiveTransactionFeed({
  importantOnly = false,
}: LiveTransactionFeedProps) {
  const { transactions, loading, refetch } = useLiveTransactions();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  // Untuk Pimpinan: filter transaksi penting/anomali
  // Penting = besar (> 100.000), pending, atau rejected
  const displayTransactions = importantOnly
    ? transactions.filter(
        (tx) =>
          tx.amount > 100000 ||
          tx.status === "PENDING" ||
          tx.status === "REJECTED",
      )
    : transactions;

  return (
    <div className="overflow-hidden rounded-[22px] border border-border bg-card/90 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          {importantOnly
            ? "Transaksi Penting & Anomali"
            : "Live Transaction Feed"}
        </h2>
        <button
          onClick={refetch}
          disabled={loading}
          className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-muted focus-visible-ring"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Memuat data...
        </div>
      ) : (
        <TxCompactList
          items={displayTransactions.map((tx) => ({
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
          emptyText={
            importantOnly
              ? "Tidak ada transaksi penting"
              : "Tidak ada transaksi"
          }
        />
      )}
    </div>
  );
}

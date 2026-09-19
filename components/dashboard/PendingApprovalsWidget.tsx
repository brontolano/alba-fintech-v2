"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, XCircle, ClipboardList, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface PendingApproval {
  id: string;
  status: string;
  amount: number;
  description: string;
  createdAt: string;
  transactionId: string;
  submittedBy?: { name?: string | null; email: string; role?: string };
  transactions?: { units?: { name: string; code?: string } | null };
}

export function PendingApprovalsWidget({
  formatCurrency,
  maxItems = 5,
}: {
  formatCurrency: (amount: number) => string;
  maxItems?: number;
}) {
  const [items, setItems] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals?status=PENDING");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const decide = async (id: string, action: "approve" | "reject") => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memproses");
      }
      toast.success(
        action === "approve" ? "Transaksi disetujui" : "Transaksi ditolak",
      );
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses");
    } finally {
      setProcessingId(null);
    }
  };

  const fmtCurrency = (amount: number) =>
    formatCurrency
      ? formatCurrency(amount)
      : `Rp ${amount.toLocaleString("id-ID")}`;

  return (
    <div className="overflow-hidden rounded-[22px] border border-border bg-card/90 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ClipboardList size={15} />
          </div>
          <h2 className="text-sm font-semibold text-foreground">
            Menunggu Persetujuan
          </h2>
          {items.length > 0 && (
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchPending();
            }}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted focus-visible-ring"
            aria-label="Segarkan"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <div
            className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          {loading ? (
            <div className="p-4 space-y-2 border-t border-border/60">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-muted/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center border-t border-border/60">
              Tidak ada pengajuan menunggu persetujuan ✓
            </p>
          ) : (
            <div className="divide-y divide-border/50 border-t border-border/60">
              {items.slice(0, maxItems).map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {a.description}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {a.submittedBy?.name ||
                          a.submittedBy?.email ||
                          "Unknown"}
                        {a.transactions?.units?.name
                          ? ` · ${a.transactions.units.name}`
                          : ""}
                        {" · "}
                        {new Date(a.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {fmtCurrency(a.amount)}
                      </p>
                      <div className="mt-2 flex justify-end gap-1.5">
                        <button
                          onClick={() => decide(a.id, "approve")}
                          disabled={processingId === a.id}
                          className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 transition hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400 focus-visible-ring"
                          aria-label="Setujui"
                        >
                          <CheckCircle size={15} />
                        </button>
                        <button
                          onClick={() => decide(a.id, "reject")}
                          disabled={processingId === a.id}
                          className="rounded-lg bg-rose-500/10 p-1.5 text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400 focus-visible-ring"
                          aria-label="Tolak"
                        >
                          <XCircle size={15} />
                        </button>
                        <Link
                          href={`/dashboard/transactions/${a.transactionId}`}
                          className="rounded-lg bg-muted p-1.5 text-muted-foreground transition hover:bg-muted/70 focus-visible-ring"
                          aria-label="Detail"
                        >
                          <ClipboardList size={15} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {items.length > maxItems && (
                <Link
                  href="/dashboard/approvals"
                  className="block px-4 py-3 text-center text-xs font-medium text-primary hover:bg-muted/30 transition-colors"
                >
                  Lihat semua {items.length} pengajuan →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

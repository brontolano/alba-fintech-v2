"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface AuditItem {
  id: string;
  transactionId: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  status: "PENDING" | "APPROVED" | "REJECTED" | "DRAFT";
  unitName: string | null;
  createdByName: string;
  createdByRole: string | null;
  createdAt: string;
  deciderName: string | null;
  deciderRole: string | null;
  decidedAt: string | null;
  comment: string | null;
}

type TabKey = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export default function ApprovalAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("ALL");

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== "ALL") params.set("status", tab);
      const res = await fetch(`/api/approvals/audit?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memuat riwayat");
      }
      const data = await res.json();
      setItems(data.data ?? []);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat riwayat persetujuan");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const statusMeta: Record<string, { label: string; cls: string; Icon: any }> =
    {
      APPROVED: {
        label: "Disetujui",
        cls: "bg-green-100 text-green-700",
        Icon: CheckCircle,
      },
      REJECTED: {
        label: "Ditolak",
        cls: "bg-red-100 text-red-700",
        Icon: XCircle,
      },
      PENDING: {
        label: "Menunggu",
        cls: "bg-yellow-100 text-yellow-700",
        Icon: Clock,
      },
      DRAFT: {
        label: "Draft",
        cls: "bg-muted text-muted-foreground",
        Icon: Clock,
      },
    };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "ALL", label: "Semua" },
    { key: "PENDING", label: "Menunggu" },
    { key: "APPROVED", label: "Disetujui" },
    { key: "REJECTED", label: "Ditolak" },
  ];

  const counts = {
    ALL: items.length,
    PENDING: items.filter((i) => i.status === "PENDING").length,
    APPROVED: items.filter((i) => i.status === "APPROVED").length,
    REJECTED: items.filter((i) => i.status === "REJECTED").length,
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-[1.75rem] font-bold tracking-tight text-foreground sm:text-2xl">
            <History size={22} className="text-emerald-600" />
            Riwayat Persetujuan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jejak audit: siapa membuat, mengajukan, dan memutuskan transaksi
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as TabKey)}
            className="h-10 min-w-[150px] rounded-full border border-border bg-card px-3 text-sm text-foreground shadow-sm outline-none ring-0 transition focus:border-emerald-500"
            aria-label="Filter riwayat persetujuan"
          >
            {tabs.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label} ({counts[item.key] ?? 0})
              </option>
            ))}
          </select>

          <button
            onClick={fetchAudit}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Timeline list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-muted/80 animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <History
            size={48}
            className="mx-auto mb-4 text-muted-foreground/70"
          />
          <p className="text-muted-foreground">Belum ada riwayat persetujuan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = statusMeta[item.status] ?? statusMeta.DRAFT;
            const isIncome = item.type === "INCOME";
            const isExpense = item.type === "EXPENSE";

            return (
              <div
                key={item.id}
                className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-emerald-200 hover:shadow-[0_14px_30px_rgba(16,185,129,0.08)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}
                      >
                        <meta.Icon size={12} />
                        {meta.label}
                      </span>
                      {item.unitName && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {item.unitName}
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-medium ${
                          isIncome
                            ? "text-emerald-600"
                            : isExpense
                              ? "text-rose-600"
                              : "text-blue-600"
                        }`}
                      >
                        {isIncome
                          ? "Pemasukan"
                          : isExpense
                            ? "Pengeluaran"
                            : "Transfer"}
                      </span>
                    </div>

                    <Link
                      href={`/dashboard/transactions/${item.transactionId}`}
                      className="block text-base font-semibold text-foreground hover:text-emerald-600"
                    >
                      {item.description}
                    </Link>

                    {item.comment && (
                      <div className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm italic text-muted-foreground">
                        “{item.comment}”
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p
                      className={`text-lg font-bold ${
                        isIncome
                          ? "text-emerald-600"
                          : isExpense
                            ? "text-rose-600"
                            : "text-blue-600"
                      }`}
                    >
                      {isIncome ? "+" : isExpense ? "−" : ""}
                      {formatCurrency(item.amount)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {format(new Date(item.createdAt), "dd MMM yyyy", {
                        locale: id,
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <User
                      size={12}
                      className="mt-0.5 shrink-0 text-foreground/80"
                    />
                    <span className="leading-relaxed">
                      Dibuat oleh{" "}
                      <strong className="text-foreground">
                        {item.createdByName}
                      </strong>
                      {item.createdByRole && (
                        <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                          {item.createdByRole}
                        </span>
                      )}
                      <span className="ml-1">
                        ·{" "}
                        {format(new Date(item.createdAt), "dd MMM yyyy HH:mm", {
                          locale: id,
                        })}
                      </span>
                    </span>
                  </div>

                  {item.decidedAt && item.deciderName && (
                    <div className="flex items-start gap-2">
                      <meta.Icon
                        size={12}
                        className="mt-0.5 shrink-0 text-foreground/80"
                      />
                      <span className="leading-relaxed">
                        {item.status === "REJECTED"
                          ? "Ditolak oleh"
                          : "Diputuskan oleh"}{" "}
                        <strong className="text-foreground">
                          {item.deciderName}
                        </strong>
                        {item.deciderRole && (
                          <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                            {item.deciderRole}
                          </span>
                        )}
                        <span className="ml-1">
                          ·{" "}
                          {format(
                            new Date(item.decidedAt),
                            "dd MMM yyyy HH:mm",
                            { locale: id },
                          )}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

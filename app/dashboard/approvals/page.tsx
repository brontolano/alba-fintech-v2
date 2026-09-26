"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  History,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock3,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { printData, escapeHtml } from "@/lib/print";

interface ApprovalRequest {
  id: string;
  transactionId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  reference?: string;
  units: {
    name: string;
    code: string;
  } | null;
  transactions: {
    type: string;
    amount: number;
    description: string;
    reference?: string;
    units: {
      name: string;
      code: string;
    } | null;
  };
  users: {
    name?: string | null;
    email: string;
  };
  submittedBy?: {
    name?: string | null;
    email: string;
    role?: string;
  };
}

import { usePageGuard } from "@/lib/use-page-guard";

export default function ApprovalsPage() {
  usePageGuard(["SUPERADMIN", "PIMPINAN", "MANAGER"]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "PENDING" | "APPROVED" | "REJECTED"
  >("PENDING");

  const fetchApprovals = async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const res = await fetch("/api/approvals", {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setApprovals(data.data ?? []);
    } catch (err) {
      console.error("Error fetching approvals:", err);
      toast.error("Gagal memuat persetujuan");
      setApprovals([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (id: string, _transactionId: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyetujui");
      }

      toast.success("Transaksi disetujui");
      setApprovals(approvals.filter((a) => a.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Gagal menyetujui");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menolak");
      }

      toast.success("Transaksi ditolak");
      setApprovals(approvals.filter((a) => a.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak");
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const tabMeta = {
    PENDING: { label: "Pending", accent: "text-emerald-600" },
    APPROVED: { label: "Disetujui", accent: "text-emerald-600" },
    REJECTED: { label: "Ditolak", accent: "text-rose-600" },
  } as const;

  const printApproval = (approval: ApprovalRequest) => {
    const isIncome = approval.transactions.type === "INCOME";
    const statusLabel =
      approval.status === "PENDING"
        ? "Menunggu Persetujuan"
        : approval.status === "APPROVED"
          ? "Disetujui"
          : "Ditolak";
    const submitterName = approval.submittedBy?.name || "-";
    const bodyHtml = `
      <div class="site-header">
        <h1>ALBA FINANCE</h1>
        <p class="sub">Pondok Pesantren Al-Basyariyah</p>
      </div>
      <h2>Surat Pengajuan Persetujuan</h2>
      <p class="sub">Nomor: ${escapeHtml(approval.id.slice(0, 8))} · ${escapeHtml(
        format(new Date(approval.createdAt), "dd MMMM yyyy, HH:mm", { locale: id }),
      )}</p>
      <table>
        <tbody>
          <tr><td class="label">Unit</td><td>${escapeHtml(
            approval.transactions.units?.name || approval.units?.name || "Unit Tidak Dikenal",
          )} (${escapeHtml(approval.transactions.units?.code || approval.units?.code || "UNIT")})</td></tr>
          <tr><td class="label">Jenis</td><td>${isIncome ? "Pemasukan" : "Pengeluaran"}</td></tr>
          <tr><td class="label">Deskripsi</td><td>${escapeHtml(approval.description)}</td></tr>
          ${
            approval.reference
              ? `<tr><td class="label">Referensi</td><td>${escapeHtml(approval.reference)}</td></tr>`
              : ""
          }
          <tr><td class="label">Jumlah</td><td class="num"><strong>${isIncome ? "+" : "-"} ${escapeHtml(
            formatCurrency(approval.amount),
          )}</strong></td></tr>
          <tr><td class="label">Status</td><td>${escapeHtml(statusLabel)}</td></tr>
          <tr><td class="label">Diajukan oleh</td><td>${escapeHtml(submitterName)}${approval.submittedBy?.role ? ` (${escapeHtml(approval.submittedBy.role)})` : ""}</td></tr>
        </tbody>
      </table>
      <div class="sign">
        <div><p>Pengaju</p><div class="space"></div><p>_______________</p></div>
        <div><p>Pimpinan / Penyetuju</p><div class="space"></div><p>_______________</p></div>
      </div>
      <p class="footer">Dicetak ${escapeHtml(new Date().toLocaleString("id-ID"))} · Dokumen dihasilkan otomatis oleh ALBA Finance</p>
    `;
    printData(`Pengajuan ${approval.id.slice(0, 8)}`, bodyHtml);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[2rem]">
            Persetujuan Khusus
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hanya transaksi yang memerlukan review pimpinan atau penanganan
            khusus yang masuk ke sini.
          </p>
        </div>
        <Link
          href="/dashboard/approvals/audit"
          className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted sm:self-auto"
        >
          <History size={16} />
          <span>Riwayat & Audit</span>
        </Link>
      </div>

      <div className="rounded-[22px] border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4 dark:from-emerald-500/10 dark:via-card dark:to-cyan-500/10">
        <div className="flex flex-wrap gap-2">
          {(["PENDING", "APPROVED", "REJECTED"] as const).map((tab) => {
            const count = approvals.filter(
              (item) => item.status === tab,
            ).length;
            const active = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-emerald-500 bg-emerald-600 text-white"
                    : "border-emerald-200 bg-white/80 text-emerald-700 hover:bg-white dark:border-emerald-500/30 dark:bg-card/80 dark:text-emerald-300"
                }`}
              >
                {tabMeta[tab].label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-border bg-muted/50"
            />
          ))}
        </div>
      ) : approvals.filter((a) => a.status === activeTab).length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-border bg-card py-12 text-center">
          <ClipboardList
            size={48}
            className="mx-auto mb-4 text-muted-foreground/60"
          />
          <p className="text-sm text-muted-foreground">
            Tidak ada permintaan persetujuan
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="hidden md:block">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Deskripsi
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Jumlah
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {approvals
                  .filter((a) => a.status === activeTab)
                  .map((approval) => {
                    const isIncome = approval.transactions.type === "INCOME";
                    const statusClass =
                      approval.status === "PENDING"
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : approval.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-rose-100 text-rose-700 border border-rose-200";

                    return (
                      <tr
                        key={approval.id}
                        className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/20"
                      >
                        <td
                          className="px-4 py-3 text-sm text-muted-foreground"
                          data-label="Tanggal"
                        >
                          {format(new Date(approval.createdAt), "dd MMM yyyy", {
                            locale: id,
                          })}
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-foreground"
                          data-label="Unit"
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                              {approval.transactions.units?.code || "UNIT"}
                            </span>
                            <span className="font-medium text-foreground">
                              {approval.transactions.units?.name ||
                                "Unit Tidak Dikenal"}
                            </span>
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-foreground"
                          data-label="Deskripsi"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">
                              {approval.description}
                            </p>
                            {approval.reference && (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Ref: {approval.reference}
                              </p>
                            )}
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 text-right text-sm"
                          data-label="Jumlah"
                        >
                          <span
                            className={
                              isIncome
                                ? "font-semibold text-emerald-600"
                                : "font-semibold text-rose-600"
                            }
                          >
                            {isIncome ? "+" : "-"}{" "}
                            {formatCurrency(approval.amount)}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-center"
                          data-label="Status"
                        >
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}
                          >
                            {approval.status === "PENDING" && (
                              <Clock3 className="h-3 w-3" />
                            )}
                            {approval.status === "APPROVED" && (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            {approval.status === "REJECTED" && (
                              <XCircle className="h-3 w-3" />
                            )}
                            {approval.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center" data-label="Aksi">
                          <div className="flex items-center justify-center gap-2">
                            {approval.status === "PENDING" ? (
                              <>
                                <button
                                  onClick={() =>
                                    handleApprove(
                                      approval.id,
                                      approval.transactionId,
                                    )
                                  }
                                  disabled={processingId === approval.id}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <CheckCircle size={12} />
                                  {processingId === approval.id
                                    ? "..."
                                    : "Approve"}
                                </button>
                                <button
                                  onClick={() => handleReject(approval.id)}
                                  disabled={processingId === approval.id}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <XCircle size={12} />
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => printApproval(approval)}
                              title="Cetak surat pengajuan"
                              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                            >
                              <Printer size={12} /> Cetak
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {approvals
              .filter((a) => a.status === activeTab)
              .map((approval) => {
                const isIncome = approval.transactions.type === "INCOME";
                const statusClass =
                  approval.status === "PENDING"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : approval.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-rose-100 text-rose-700 border border-rose-200";

                return (
                  <div key={approval.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {approval.description}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {format(new Date(approval.createdAt), "dd MMM yyyy", {
                            locale: id,
                          })}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}
                      >
                        {approval.status === "PENDING" && (
                          <Clock3 className="h-3 w-3" />
                        )}
                        {approval.status === "APPROVED" && (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        {approval.status === "REJECTED" && (
                          <XCircle className="h-3 w-3" />
                        )}
                        {approval.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Unit
                        </div>
                        <div className="mt-1 text-foreground">
                          {approval.transactions.units?.name ||
                            "Unit Tidak Dikenal"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Jumlah
                        </div>
                        <div
                          className={
                            isIncome
                              ? "mt-1 font-semibold text-emerald-600"
                              : "mt-1 font-semibold text-rose-600"
                          }
                        >
                          {isIncome ? "+" : "-"}{" "}
                          {formatCurrency(approval.amount)}
                        </div>
                      </div>
                    </div>

                    {approval.reference && (
                      <div className="text-sm text-muted-foreground">
                        Ref: {approval.reference}
                      </div>
                    )}

                    {approval.status === "PENDING" && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() =>
                            handleApprove(approval.id, approval.transactionId)
                          }
                          disabled={processingId === approval.id}
                          className="flex-1 rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingId === approval.id ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleReject(approval.id)}
                          disabled={processingId === approval.id}
                          className="flex-1 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => printApproval(approval)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                    >
                      <Printer size={14} /> Cetak Pengajuan
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

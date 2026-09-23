"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Check,
  X,
  Loader2,
  RefreshCw,
  ClipboardList,
  FileText,
  ArrowDownRight,
  ArrowUpRight,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { usePageGuard } from "@/lib/use-page-guard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

/**
 * Fase 1 Manager KPAK — "Perlu Keputusan Saya".
 * Antrean review manager dalam satu tempat:
 *  A. Laporan shift kru (SUBMITTED → Terima)
 *  B. Pengajuan transaksi (PENDING → Setujui / Tolak)
 *
 * FILE BARU (di luar permukaan beku staff — lihat docs/KPAK-STAFF-FREEZE.md).
 * Memakai API yang sudah ada; tidak mengubah perilaku file lain.
 */

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

interface ShiftReport {
  id: string;
  cashIncomeCounted: number | string;
  cashExpenseCounted: number | string;
  note?: string | null;
  status: string;
  submittedAt: string;
  staff: { id: string; name: string; role: string };
  system: { income: number; expense: number; savingsIn: number; savingsOut: number };
}

interface Approval {
  id: string;
  transactionId: string;
  status: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  reference?: string;
  createdAt: string;
  users: { name?: string | null; email: string };
  submittedBy?: { name?: string | null; email: string };
}

export default function ManagerReviewPage() {
  // Manager KPAK (+ SUPERADMIN/PIMPINAN untuk pengawasan). Retail tidak masuk.
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      (u?.role === "MANAGER" && u?.unitIsRetail !== true),
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [repRes, apprRes] = await Promise.all([
        fetch("/api/kpak/shift-reports").catch(() => null),
        fetch("/api/approvals").catch(() => null),
      ]);
      if (repRes && repRes.ok) {
        const j = await repRes.json();
        const list: ShiftReport[] = j?.data?.reports || [];
        setReports(list.filter((r) => r.status !== "ACCEPTED"));
      }
      if (apprRes && apprRes.ok) {
        const j = await apprRes.json();
        const list: Approval[] = j.data ?? [];
        setApprovals(list.filter((a) => a.status === "PENDING"));
      }
    } catch {
      toast.error("Gagal memuat antrean");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const acceptReport = async (id: string) => {
    setActingId(id);
    try {
      const res = await fetch("/api/kpak/shift-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Gagal menerima laporan");
      toast.success("Laporan shift diterima");
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      toast.error(e.message || "Gagal menerima laporan");
    } finally {
      setActingId(null);
    }
  };

  const decideApproval = async (id: string, action: "approve" | "reject") => {
    setActingId(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Gagal memproses");
      toast.success(action === "approve" ? "Pengajuan disetujui" : "Pengajuan ditolak");
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      toast.error(e.message || "Gagal memproses");
    } finally {
      setActingId(null);
    }
  };

  const total = reports.length + approvals.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Memuat antrean...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-24 md:pb-8">
      <DashboardHeader
        title="Perlu Keputusan Saya"
        subtitle={
          total > 0 ? `${total} menunggu — selesaikan satu per satu` : "Antrean kosong"
        }
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Memuat..." : "Segarkan"}
        </button>
      </div>

      {total === 0 && (
        <div className="rounded-[22px] border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
          <PartyPopper className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 text-base font-bold text-foreground">Beres!</p>
          <p className="text-sm text-muted-foreground">
            Tidak ada laporan shift atau pengajuan yang menunggu keputusan Anda.
          </p>
        </div>
      )}

      {reports.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <FileText size={16} /> Laporan Shift Kru ({reports.length})
          </h2>
          {reports.map((r) => {
            const countedIn = Number(r.cashIncomeCounted || 0);
            const countedOut = Number(r.cashExpenseCounted || 0);
            const sysIn = Number(r.system?.income || 0);
            const sysOut = Number(r.system?.expense || 0);
            const diff = countedIn - countedOut - (sysIn - sysOut);
            const busy = actingId === r.id;
            return (
              <div
                key={r.id}
                className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {r.staff?.name || "Staff"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(r.submittedAt)} • {r.staff?.role}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      diff === 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {diff === 0 ? "Kas cocok" : `Selisih ${formatCurrency(diff)}`}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-muted/50 p-2">
                    <p className="text-muted-foreground">Kas dihitung masuk</p>
                    <p className="font-bold text-foreground">{formatCurrency(countedIn)}</p>
                    <p className="text-muted-foreground">Sistem: {formatCurrency(sysIn)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-2">
                    <p className="text-muted-foreground">Kas dihitung keluar</p>
                    <p className="font-bold text-foreground">{formatCurrency(countedOut)}</p>
                    <p className="text-muted-foreground">Sistem: {formatCurrency(sysOut)}</p>
                  </div>
                </div>
                {r.note && (
                  <p className="mt-2 text-xs italic text-muted-foreground">“{r.note}”</p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => acceptReport(r.id)}
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Terima Laporan
                </button>
              </div>
            );
          })}
        </section>
      )}

      {approvals.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <ClipboardList size={16} /> Pengajuan Transaksi ({approvals.length})
          </h2>
          {approvals.map((a) => {
            const busy = actingId === a.id;
            const by = a.submittedBy?.name || a.users?.name || a.users?.email || "—";
            return (
              <div
                key={a.id}
                className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      a.type === "INCOME"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-rose-500/10 text-rose-600"
                    }`}
                  >
                    {a.type === "INCOME" ? (
                      <ArrowDownRight size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(Number(a.amount || 0))}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.description}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Diajukan {by} • {fmtDateTime(a.createdAt)}
                      {a.reference ? ` • ${a.reference}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decideApproval(a.id, "reject")}
                    className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-600 transition active:scale-[0.98] disabled:opacity-50 dark:text-rose-400"
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                    Tolak
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decideApproval(a.id, "approve")}
                    className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    Setujui
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

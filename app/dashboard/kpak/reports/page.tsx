"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Loader2,
  Printer,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { usePageGuard } from "@/lib/use-page-guard";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const todayStr = () => new Date().toISOString().slice(0, 10);

interface Tx {
  id: string;
  type: string;
  amount: number | string;
  description: string;
  date: string;
  status: string;
  category?: { name: string } | null;
}

interface SavingTx {
  id: string;
  type: string;
  amount: number | string;
  description?: string | null;
  createdAt: string;
}

export default function KpakReportsPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      ((u?.role === "MANAGER" || u?.role === "STAFF") &&
        u?.unitIsRetail !== true),
  });

  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [txs, setTxs] = useState<Tx[]>([]);
  const [savings, setSavings] = useState<SavingTx[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, svRes] = await Promise.all([
        fetch(
          `/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=200`,
        ),
        fetch(`/api/savings/transactions?limit=200`),
      ]);
      if (txRes.ok) {
        const t = await txRes.json();
        setTxs(t.data || t.transactions || []);
      }
      if (svRes.ok) {
        const s = await svRes.json();
        const list: SavingTx[] = s.data || s.transactions || [];
        setSavings(
          list.filter((x) => {
            const d = (x.createdAt || "").slice(0, 10);
            return d >= startDate && d <= endDate;
          }),
        );
      }
    } catch {
      toast.error("Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const income = txs
    .filter((t) => t.type === "INCOME" && t.status !== "REJECTED")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = txs
    .filter((t) => t.type === "EXPENSE" && t.status !== "REJECTED")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const savingsIn = savings
    .filter((t) => t.type === "DEPOSIT")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const savingsOut = savings
    .filter((t) => t.type === "WITHDRAWAL")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const net = income - expense;

  const setPreset = (preset: "today" | "week" | "month") => {
    const end = new Date();
    const start = new Date();
    if (preset === "week") start.setDate(start.getDate() - 6);
    if (preset === "month") start.setDate(start.getDate() - 29);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rekap & Laporan</h1>
          <p className="text-sm text-muted-foreground">
            Rekap transaksi KPAK — default harian, siap dibawa manghadap
            pimpinan
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          <Printer size={16} /> Cetak Laporan
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
        <div className="flex gap-1">
          <button
            onClick={() => setPreset("today")}
            className="rounded-lg bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/70"
          >
            Hari ini
          </button>
          <button
            onClick={() => setPreset("week")}
            className="rounded-lg bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/70"
          >
            7 hari
          </button>
          <button
            onClick={() => setPreset("month")}
            className="rounded-lg bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/70"
          >
            30 hari
          </button>
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <span className="text-sm text-muted-foreground">s/d</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
          Menyusun laporan...
        </p>
      ) : (
        <>
          {/* Ringkasan */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600" />
                <p className="text-xs text-muted-foreground">Pemasukan</p>
              </div>
              <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(income)}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-rose-600" />
                <p className="text-xs text-muted-foreground">Pengeluaran</p>
              </div>
              <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(expense)}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-primary" />
                <p className="text-xs text-muted-foreground">Selisih (Net)</p>
              </div>
              <p className="mt-1 text-lg font-bold">{formatCurrency(net)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <PiggyBank size={16} className="text-blue-600" />
                <p className="text-xs text-muted-foreground">Tabungan</p>
              </div>
              <p className="mt-1 text-sm font-bold">
                <span className="text-emerald-600">+{formatCurrency(savingsIn)}</span>{" "}
                <span className="text-rose-600">-{formatCurrency(savingsOut)}</span>
              </p>
            </div>
          </div>

          {/* Rincian transaksi kas */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Wallet size={15} /> Rincian Transaksi Kas ({txs.length})
            </h2>
            {txs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Tidak ada transaksi pada periode ini
              </p>
            ) : (
              <div className="divide-y">
                {txs.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.category?.name || t.type} ·{" "}
                        {new Date(t.date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {t.status}
                      </p>
                    </div>
                    <p
                      className={`font-semibold ${
                        t.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(Number(t.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mutasi tabungan */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <PiggyBank size={15} /> Mutasi Tabungan Santri ({savings.length})
            </h2>
            {savings.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Tidak ada mutasi tabungan pada periode ini
              </p>
            ) : (
              <div className="divide-y">
                {savings.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {t.type === "DEPOSIT" ? "Setoran" : "Penarikan"}
                        {t.description ? ` — ${t.description}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p
                      className={`font-semibold ${
                        t.type === "DEPOSIT"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {t.type === "DEPOSIT" ? "+" : "-"}
                      {formatCurrency(Number(t.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rekonsiliasi shortcut */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-card p-5">
            <div className="text-sm">
              <p className="font-semibold">
                Samakan catatan dengan uang cash sebelum manghadap pimpinan
              </p>
              <p className="text-muted-foreground">
                Buka Rekonsiliasi untuk mencocokkan sistem vs cash fisik, lalu
                serahkan via Serah Terima Kas.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard/reconciliation"
                className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Rekonsiliasi
              </Link>
              <Link
                href="/dashboard/handovers"
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Serah Terima Kas
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

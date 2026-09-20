"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, PiggyBank, RefreshCw } from "lucide-react";

interface MonitorUnit {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  balance: number;
  todayIncome: number;
  todayExpense: number;
  txCountToday: number;
}

interface MonitorPayload {
  generatedAt: string;
  today: string;
  units: MonitorUnit[];
  grand: {
    balance: number;
    todayIncome: number;
    todayExpense: number;
    txCountToday: number;
  };
  savingsTotal: number;
  pendingApprovals: number;
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export default function MonitorDashboardPage() {
  const [payload, setPayload] = useState<MonitorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/monitor", { cache: "no-store" });
      if (!res.ok)
        throw new Error("Gagal memuat papan pantau (" + res.status + ")");
      const json = (await res.json()) as MonitorPayload;
      setPayload(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading && !payload) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Papan Pantau Keuangan
          </h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan saldo dan aktivitas semua unit secara realtime.
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Memuat data keuangan…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Papan Pantau Keuangan
          </h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan saldo dan aktivitas semua unit secara realtime.
          </p>
        </div>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!payload) return null;

  const { units, grand } = payload;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Papan Pantau Keuangan
        </h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan saldo dan aktivitas semua unit secara realtime.
        </p>
      </div>

      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Nilai total semua unit
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {formatRupiah(grand.balance)}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Segarkan
        </button>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <PiggyBank size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Saldo Tabungan Santri
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {formatRupiah(payload.savingsTotal)}
              </p>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Pengajuan menunggu approval
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {payload.pendingApprovals}
                </p>
              </div>
            </div>
            {payload.pendingApprovals > 0 && (
              <Link
                href="/dashboard/approvals"
                className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                Buka
              </Link>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {units.map((u) => (
          <section
            key={u.id}
            className="rounded-2xl border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.type}</p>
              </div>
              <span
                className={
                  u.isActive
                    ? "rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                    : "rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                }
              >
                {u.isActive ? "Aktif" : "Non-aktif"}
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight">
              {formatRupiah(u.balance)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Pemasukan hari ini</p>
                <p className="font-medium text-emerald-600">
                  {formatRupiah(u.todayIncome)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Pengeluaran hari ini</p>
                <p className="font-medium text-rose-600">
                  {formatRupiah(u.todayExpense)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Transaksi hari ini</p>
                <p className="font-medium">{u.txCountToday}</p>
              </div>
            </div>
          </section>
        ))}
      </div>

      <footer className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Saldo</p>
            <p className="text-xl font-bold">{formatRupiah(grand.balance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Pemasukan</p>
            <p className="text-xl font-bold text-emerald-600">
              {formatRupiah(grand.todayIncome)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
            <p className="text-xl font-bold text-rose-600">
              {formatRupiah(grand.todayExpense)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Transaksi</p>
            <p className="text-xl font-bold">{grand.txCountToday}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Diperbarui:{" "}
          {new Date(payload.generatedAt).toLocaleTimeString("id-ID")}
        </p>
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  PiggyBank,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Ringkasan posisi kas KPAK untuk dashboard.
 * Ringkas saja — rincian ada di halaman khusus (students/finance/internal/reports).
 */
export function KpakCashSummary() {
  const [stock, setStock] = useState(0);
  const [santriCount, setSantriCount] = useState(0);
  const [todayIn, setTodayIn] = useState(0);
  const [todayOut, setTodayOut] = useState(0);
  const [shiftOn, setShiftOn] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const today = todayLocal();
        const [stuRes, txRes, shiftRes] = await Promise.all([
          fetch("/api/savings/students"),
          fetch(
            `/api/transactions?startDate=${today}&endDate=${today}&limit=100`,
          ),
          fetch("/api/kpak/shift").catch(() => null),
        ]);
        if (stuRes.ok) {
          const s = await stuRes.json();
          const list = s.data || [];
          setSantriCount(list.length);
          setStock(
            list.reduce(
              (sum: number, x: any) => sum + Number(x.account?.balance || 0),
              0,
            ),
          );
        }
        if (txRes.ok) {
          const t = await txRes.json();
          const list = t.data || t.transactions || [];
          setTodayIn(
            list
              .filter((x: any) => x.type === "INCOME")
              .reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
          );
          setTodayOut(
            list
              .filter((x: any) => x.type === "EXPENSE")
              .reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
          );
        }
        if (shiftRes && shiftRes.ok) {
          const s = await shiftRes.json();
          const mine = s.data?.mine;
          setShiftOn(!!mine && !mine.checkOutAt);
        }
      } catch {
        // ringkasan gagal — dashboard utama tetap tampil
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
    {shiftOn === false && (
      <Link
        href="/dashboard/kpak/shift"
        className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
      >
        <span className="font-medium">Belum check-in shift hari ini</span>
        <span className="font-semibold text-primary">Check-in →</span>
      </Link>
    )}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Link
        href="/dashboard/kpak/students"
        className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/40"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2.5">
            <PiggyBank size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Tabungan</p>
            <p className="text-xl font-bold">{formatCurrency(stock)}</p>
            <p className="text-xs text-muted-foreground">{santriCount} santri</p>
          </div>
        </div>
      </Link>
      <Link
        href="/dashboard/kpak/finance"
        className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/40"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2.5">
            <TrendingUp
              size={20}
              className="text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Masuk hari ini</p>
            <p className="text-xl font-bold">{formatCurrency(todayIn)}</p>
          </div>
        </div>
      </Link>
      <Link
        href="/dashboard/kpak/internal"
        className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/40"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-rose-500/10 p-2.5">
            <TrendingDown
              size={20}
              className="text-rose-600 dark:text-rose-400"
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Keluar hari ini</p>
            <p className="text-xl font-bold">{formatCurrency(todayOut)}</p>
          </div>
        </div>
      </Link>
    </div>
    </div>
  );
}

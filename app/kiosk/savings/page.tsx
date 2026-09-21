"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  PiggyBank,
  RefreshCw,
  Search,
} from "lucide-react";

interface KioskMutation {
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  balanceAfter: number;
  description?: string | null;
  createdAt?: string | null;
}

interface KioskData {
  name: string;
  studentNumber: string;
  className?: string | null;
  balance: number;
  status: string;
  transactions: KioskMutation[];
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export default function KioskSavingsPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<KioskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (value?: string) => {
    const q = (value ?? query).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kiosk/savings?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Santri tidak ditemukan");
      setData(json.data);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-primary/10 to-background px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
            <PiggyBank size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Anjungan Santri
          </h1>
          <p className="text-sm text-muted-foreground">
            Cek saldo dan mutasi tabungan — masukkan nomor santri (NIS)
          </p>
        </header>

        <div className="flex gap-2 rounded-2xl border bg-card p-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
              placeholder="Contoh: 2024.001"
              inputMode="numeric"
              autoFocus
              className="w-full rounded-xl border border-input bg-background py-3.5 pl-11 pr-3 text-lg"
            />
          </div>
          <button
            onClick={() => lookup()}
            disabled={loading}
            className="rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Mencari..." : "Lihat"}
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {data && (
          <>
            <section className="rounded-3xl border bg-card p-6 text-center shadow-sm">
              <p className="text-sm uppercase tracking-wider text-muted-foreground">
                Saldo Tabungan
              </p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
                {formatRupiah(data.balance)}
              </p>
              <p className="mt-4 text-lg font-semibold">{data.name}</p>
              <p className="text-sm text-muted-foreground">
                {data.studentNumber}
                {data.className ? ` · ${data.className}` : ""}
              </p>
            </section>

            <section className="rounded-2xl border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <h2 className="text-sm font-semibold">Mutasi Terakhir</h2>
                <button
                  onClick={() => lookup()}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  Segarkan
                </button>
              </div>
              {data.transactions.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Belum ada mutasi.
                </p>
              ) : (
                <ul className="divide-y">
                  {data.transactions.map((t, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            t.type === "DEPOSIT"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {t.type === "DEPOSIT" ? (
                            <ArrowUpRight size={18} />
                          ) : (
                            <ArrowDownRight size={18} />
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {t.type === "DEPOSIT" ? "Setoran" : "Pengambilan"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.description ||
                              (t.createdAt
                                ? new Date(t.createdAt).toLocaleString("id-ID")
                                : "-")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            t.type === "DEPOSIT"
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {t.type === "DEPOSIT" ? "+" : "-"}
                          {formatRupiah(t.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRupiah(t.balanceAfter)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <div className="flex justify-center">
          <Link
            href="/dashboard/savings"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ExternalLink size={16} />
            Petugas? Buka halaman Tabungan
          </Link>
        </div>

        <div className="flex justify-center">
          <Link
            href="/kiosk"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Kembali ke Beranda Anjungan
          </Link>
        </div>
      </div>
    </main>
  );
}
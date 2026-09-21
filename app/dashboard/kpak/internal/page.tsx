"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Loader2,
  Settings2,
  TrendingDown,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { usePageGuard } from "@/lib/use-page-guard";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

// Tanggal lokal (WIB) — jangan pakai toISOString (UTC) agar widget
// "hari ini" tidak meleset pada 00:00–07:00 WIB
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface Category {
  id: string;
  name: string;
  code: string;
  type: string;
  unitId?: string | null;
}

interface RecentTx {
  id: string;
  type: string;
  amount: number | string;
  description: string;
  date: string;
  status: string;
  category?: { name: string } | null;
}

export default function KpakInternalPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      ((u?.role === "MANAGER" || u?.role === "STAFF") &&
        u?.unitIsRetail !== true),
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [txType, setTxType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [todayIn, setTodayIn] = useState(0);
  const [todayOut, setTodayOut] = useState(0);
  const [recent, setRecent] = useState<RecentTx[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: session } = useSession();
  const canManageCategories =
    session?.user?.role === "SUPERADMIN" ||
    session?.user?.role === "PIMPINAN" ||
    session?.user?.role === "MANAGER";

  const visibleCats = categories.filter((c) => c.type === txType);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayLocal();
      const [catRes, txRes, todayRes] = await Promise.all([
        fetch("/api/financial-categories"),
        fetch("/api/transactions?limit=15"),
        fetch(
          `/api/transactions?startDate=${today}&endDate=${today}&limit=100`,
        ),
      ]);
      if (catRes.ok) {
        const c = await catRes.json();
        const list: Category[] = (c.data || []).filter(
          (x: any) => x.isActive !== false,
        );
        setCategories(list);
      }
      if (txRes.ok) {
        const t = await txRes.json();
        setRecent(t.data || t.transactions || []);
      }
      if (todayRes.ok) {
        const t = await todayRes.json();
        const day: RecentTx[] = t.data || t.transactions || [];
        setTodayIn(
          day
            .filter((x) => x.type === "INCOME")
            .reduce((s, x) => s + Number(x.amount || 0), 0),
        );
        setTodayOut(
          day
            .filter((x) => x.type === "EXPENSE")
            .reduce((s, x) => s + Number(x.amount || 0), 0),
        );
      }
    } catch {
      toast.error("Gagal memuat data administrasi internal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pilihan kategori saat ganti tipe
  useEffect(() => {
    const first = categories.find((c) => c.type === txType) || null;
    setSelectedCat(first);
  }, [txType, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat) {
      toast.error("Pilih kategori dulu");
      return;
    }
    const nominal = Number(amount);
    if (!nominal || nominal <= 0) {
      toast.error("Nominal harus lebih dari 0");
      return;
    }
    if (!note.trim()) {
      toast.error("Keterangan wajib diisi (uang apa / untuk apa)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: txType,
          amount: nominal,
          description: `${selectedCat.name} — ${note.trim()}`,
          categoryId: selectedCat.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mencatat transaksi");
      toast.success(
        json.data?.status === "PENDING"
          ? "Tercatat — menunggu persetujuan"
          : "Berhasil dicatat",
      );
      setAmount("");
      setNote("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Administrasi Internal</h1>
          <p className="text-sm text-muted-foreground">
            Uang masuk (kembalian, pengembalian, dll) & pengeluaran internal
            KPAK
          </p>
        </div>
        {canManageCategories && (
          <Link
            href="/dashboard/settings/categories"
            className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            <Settings2 size={16} /> Kelola Kategori
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <TrendingUp
                size={20}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Uang masuk internal hari ini
              </p>
              <p className="text-2xl font-bold">{formatCurrency(todayIn)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-500/10 p-2.5">
              <TrendingDown
                size={20}
                className="text-rose-600 dark:text-rose-400"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Pengeluaran internal hari ini
              </p>
              <p className="text-2xl font-bold">{formatCurrency(todayOut)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">1. Masuk / Keluar?</h2>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTxType("INCOME")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
                txType === "INCOME"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border text-muted-foreground"
              }`}
            >
              <ArrowDownRight size={16} /> Uang Masuk
            </button>
            <button
              type="button"
              onClick={() => setTxType("EXPENSE")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
                txType === "EXPENSE"
                  ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "border-border text-muted-foreground"
              }`}
            >
              <ArrowUpRight size={16} /> Pengeluaran
            </button>
          </div>

          <h2 className="mb-3 text-sm font-semibold">2. Pilih Kategori</h2>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              <Loader2 size={16} className="mx-auto mb-1 animate-spin" />
              Memuat kategori...
            </p>
          ) : visibleCats.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Belum ada kategori{" "}
              {txType === "INCOME" ? "pemasukan" : "pengeluaran"}.
              {canManageCategories ? (
                <Link
                  href="/dashboard/settings/categories"
                  className="mt-2 block font-medium text-primary hover:underline"
                >
                  Buat kategori baru
                </Link>
              ) : (
                <p className="mt-2">Hubungi Manager untuk menambah kategori</p>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              {visibleCats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCat(c)}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    selectedCat?.id === c.id
                      ? "border-primary bg-primary/5 font-semibold"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span>{c.name}</span>
                  {!c.unitId && (
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      Umum
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-card p-5"
        >
          <h2 className="text-sm font-semibold">3. Nominal & Keterangan</h2>
          <div className="rounded-lg bg-primary/5 p-3 text-sm">
            {txType === "INCOME" ? "Uang masuk" : "Pengeluaran"}:{" "}
            <span className="font-semibold">
              {selectedCat?.name || "— pilih di kiri —"}
            </span>
          </div>
          <input
            required
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Nominal (Rp)"
            className="w-full rounded-lg border bg-background px-3 py-3 text-sm"
          />
          <textarea
            required
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              txType === "INCOME"
                ? "Uang apa? (contoh: kembalian belanja ATK 25rb, pengembalian kasbon)"
                : "Untuk apa? (contoh: beli ATK 10 rim, gaji cleaning, service printer)"
            }
            rows={3}
            className="w-full resize-none rounded-lg border bg-background px-3 py-3 text-sm"
          />
          <button
            disabled={saving || !selectedCat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Wallet size={16} />
            )}
            {saving
              ? "Memproses..."
              : txType === "INCOME"
                ? "Catat Uang Masuk"
                : "Catat Pengeluaran"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Transaksi Internal Terakhir</h2>
        {recent.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Belum ada transaksi tercatat
          </p>
        ) : (
          <div className="divide-y">
            {recent.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.category?.name || (t.type === "INCOME" ? "Pemasukan" : "Pengeluaran")} ·{" "}
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
    </div>
  );
}

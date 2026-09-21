"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Loader2,
  Settings2,
  TrendingDown,
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

interface Category {
  id: string;
  name: string;
  code: string;
  type: string;
  unitId?: string | null;
}

interface RecentTx {
  id: string;
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
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [recent, setRecent] = useState<RecentTx[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, txRes] = await Promise.all([
        fetch("/api/financial-categories?type=EXPENSE"),
        fetch("/api/transactions?type=EXPENSE&limit=10"),
      ]);
      if (catRes.ok) {
        const c = await catRes.json();
        const list: Category[] = (c.data || []).filter(
          (x: any) => x.isActive !== false,
        );
        setCategories(list);
        if (!selectedCat && list.length > 0) setSelectedCat(list[0]);
      }
      if (txRes.ok) {
        const t = await txRes.json();
        const list: RecentTx[] = t.data || t.transactions || [];
        setRecent(list);
        const today = new Date().toISOString().slice(0, 10);
        setTodayTotal(
          list
            .filter((x) => (x.date || "").slice(0, 10) === today)
            .reduce((s, x) => s + Number(x.amount || 0), 0),
        );
      }
    } catch {
      toast.error("Gagal memuat data administrasi internal");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat) {
      toast.error("Pilih jenis pengeluaran dulu");
      return;
    }
    const nominal = Number(amount);
    if (!nominal || nominal <= 0) {
      toast.error("Nominal harus lebih dari 0");
      return;
    }
    if (!note.trim()) {
      toast.error("Keterangan wajib diisi (untuk apa pengeluaran ini)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EXPENSE",
          amount: nominal,
          description: `${selectedCat.name} — ${note.trim()}`,
          categoryId: selectedCat.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mencatat pengeluaran");
      toast.success(
        json.data?.status === "PENDING"
          ? "Pengeluaran tercatat — menunggu persetujuan"
          : "Pengeluaran berhasil dicatat",
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
            Pengeluaran operasional, belanja, gaji, dan kebutuhan internal KPAK
          </p>
        </div>
        <Link
          href="/dashboard/settings/categories"
          className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          <Settings2 size={16} /> Kelola Kategori
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-rose-500/10 p-2.5">
            <TrendingDown size={20} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Pengeluaran internal hari ini
            </p>
            <p className="text-2xl font-bold">{formatCurrency(todayTotal)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">1. Pilih Jenis Pengeluaran</h2>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              <Loader2 size={16} className="mx-auto mb-1 animate-spin" />
              Memuat kategori...
            </p>
          ) : categories.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Belum ada kategori pengeluaran.
              <Link
                href="/dashboard/settings/categories"
                className="mt-2 block font-medium text-primary hover:underline"
              >
                Buat kategori (Operasional, Belanja, Gaji, dll)
              </Link>
            </div>
          ) : (
            <div className="grid gap-2">
              {categories.map((c) => (
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
          <h2 className="text-sm font-semibold">2. Nominal & Keterangan</h2>
          <div className="rounded-lg bg-primary/5 p-3 text-sm">
            Kategori:{" "}
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
            placeholder="Nominal pengeluaran (Rp)"
            className="w-full rounded-lg border bg-background px-3 py-3 text-sm"
          />
          <textarea
            required
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Untuk apa? (contoh: beli ATK 10 rim, gaji cleaning Mei, service printer)"
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
            {saving ? "Memproses..." : "Catat Pengeluaran"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Pengeluaran Terakhir</h2>
        {recent.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Belum ada pengeluaran tercatat
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
                    {t.category?.name || "Tanpa kategori"} ·{" "}
                    {new Date(t.date).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {t.status}
                  </p>
                </div>
                <p className="font-semibold text-rose-600 dark:text-rose-400">
                  -{formatCurrency(Number(t.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

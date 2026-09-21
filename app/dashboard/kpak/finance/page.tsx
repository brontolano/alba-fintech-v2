"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Search,
  Loader2,
  Wallet,
  Banknote,
  Settings2,
  Receipt,
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

interface Santri {
  id: string;
  studentNumber: string;
  name: string;
  className?: string | null;
  account?: { id: string; balance: number | string } | null;
}

interface RecentTx {
  id: string;
  amount: number | string;
  description: string;
  reference?: string | null;
  date: string;
  status: string;
  category?: { name: string } | null;
}

export default function KpakFinancePage() {
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

  // Santri lookup
  const [nis, setNis] = useState("");
  const [santri, setSantri] = useState<Santri | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Form
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"TUNAI" | "TABUNGAN">("TUNAI");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, txRes] = await Promise.all([
        fetch("/api/financial-categories?type=INCOME"),
        fetch("/api/transactions?type=INCOME&limit=10"),
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
      toast.error("Gagal memuat data layanan keuangan");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const lookupSantri = async () => {
    if (!nis.trim()) return;
    setLookupLoading(true);
    try {
      const key = nis.trim();
      const param = /^[0-9]+$/.test(key) ? "studentNumber" : "cardUid";
      const res = await fetch(
        `/api/savings/lookup?${param}=${encodeURIComponent(key)}`,
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Santri tidak ditemukan");
      setSantri(result.data);
    } catch (e: any) {
      setSantri(null);
      toast.error(e.message);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat) {
      toast.error("Pilih jenis layanan dulu");
      return;
    }
    const nominal = Number(amount);
    if (!nominal || nominal <= 0) {
      toast.error("Nominal harus lebih dari 0");
      return;
    }
    const santriLabel = santri
      ? ` — ${santri.name} (${santri.studentNumber})`
      : "";
    const description = `${selectedCat.name}${santriLabel}${note ? ` — ${note}` : ""}`;

    setSaving(true);
    try {
      // 1) Jika bayar pakai tabungan: tarik saldo dulu
      let savingsRef = "";
      if (method === "TABUNGAN") {
        if (!santri?.account?.id) {
          toast.error("Cari santri dulu untuk pembayaran via tabungan");
          setSaving(false);
          return;
        }
        if (Number(santri.account.balance) < nominal) {
          toast.error("Saldo tabungan santri tidak mencukupi");
          setSaving(false);
          return;
        }
        const wRes = await fetch("/api/savings/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: santri.account.id,
            type: "WITHDRAWAL",
            amount: nominal,
            description: `Bayar ${selectedCat.name}${note ? ` — ${note}` : ""}`,
          }),
        });
        const wJson = await wRes.json();
        if (!wRes.ok)
          throw new Error(wJson.error || "Gagal memotong saldo tabungan");
        savingsRef = wJson.data?.id || "";
        setSantri((s) =>
          s?.account
            ? {
                ...s,
                account: {
                  ...s.account,
                  balance: Number(s.account.balance) - nominal,
                },
              }
            : s,
        );
      }

      // 2) Catat pemasukan layanan
      const tRes = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INCOME",
          amount: nominal,
          description: method === "TABUNGAN" ? `[Tabungan] ${description}` : description,
          categoryId: selectedCat.id,
          reference: savingsRef ? `TABUNGAN:${savingsRef}` : undefined,
        }),
      });
      const tJson = await tRes.json();
      if (!tRes.ok)
        throw new Error(tJson.error || "Gagal mencatat pembayaran");

      toast.success(
        tJson.data?.status === "PENDING"
          ? "Pembayaran tercatat — menunggu persetujuan"
          : "Pembayaran berhasil dicatat",
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
          <h1 className="text-2xl font-bold">Layanan Keuangan</h1>
          <p className="text-sm text-muted-foreground">
            Pembayaran HER/SPP, daftar ulang, dan layanan santri lainnya
          </p>
        </div>
        <Link
          href="/dashboard/settings/categories"
          className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          <Settings2 size={16} /> Kelola Kategori Layanan
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2.5">
            <Receipt size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Pemasukan layanan hari ini
            </p>
            <p className="text-2xl font-bold">{formatCurrency(todayTotal)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* Pilih layanan */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">1. Pilih Jenis Layanan</h2>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              <Loader2 size={16} className="mx-auto mb-1 animate-spin" />
              Memuat kategori...
            </p>
          ) : categories.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Belum ada kategori pemasukan.
              <Link
                href="/dashboard/settings/categories"
                className="mt-2 block font-medium text-primary hover:underline"
              >
                Buat kategori layanan (HER, Daftar Ulang, dll)
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

          <h2 className="mb-2 mt-5 text-sm font-semibold">
            2. Santri <span className="font-normal text-muted-foreground">(opsional)</span>
          </h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupSantri()}
                placeholder="NIS atau UID NFC"
                className="w-full rounded-lg border bg-background py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={lookupSantri}
              disabled={lookupLoading}
              className="rounded-lg bg-muted px-4 text-sm font-medium hover:bg-muted/70 disabled:opacity-50"
            >
              {lookupLoading ? "..." : "Cek"}
            </button>
          </div>
          {santri && (
            <div className="mt-2 rounded-lg bg-muted/60 p-3 text-sm">
              <p className="font-medium">
                {santri.name}{" "}
                <span className="font-normal text-muted-foreground">
                  ({santri.studentNumber})
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Saldo tabungan:{" "}
                {formatCurrency(Number(santri.account?.balance || 0))}
              </p>
            </div>
          )}
        </div>

        {/* Form bayar */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-card p-5"
        >
          <h2 className="text-sm font-semibold">3. Nominal & Pembayaran</h2>
          <div className="rounded-lg bg-primary/5 p-3 text-sm">
            Layanan:{" "}
            <span className="font-semibold">
              {selectedCat?.name || "— pilih di kiri —"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod("TUNAI")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
                method === "TUNAI"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border text-muted-foreground"
              }`}
            >
              <Banknote size={16} /> Tunai
            </button>
            <button
              type="button"
              onClick={() => setMethod("TABUNGAN")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
                method === "TABUNGAN"
                  ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "border-border text-muted-foreground"
              }`}
            >
              <Wallet size={16} /> Tabungan
            </button>
          </div>
          {method === "TABUNGAN" && !santri && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              Pembayaran via tabungan membutuhkan data santri — isi NIS/UID di
              langkah 2 dulu.
            </p>
          )}
          <input
            required
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Nominal pembayaran (Rp)"
            className="w-full rounded-lg border bg-background px-3 py-3 text-sm"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Keterangan (contoh: HER bulan September, gelombang 2)"
            className="w-full rounded-lg border bg-background px-3 py-3 text-sm"
          />
          <button
            disabled={saving || !selectedCat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CreditCard size={16} />
            )}
            {saving ? "Memproses..." : "Catat Pembayaran"}
          </button>
        </form>
      </div>

      {/* Riwayat */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Pembayaran Terakhir</h2>
        {recent.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Belum ada pembayaran tercatat
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
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(Number(t.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

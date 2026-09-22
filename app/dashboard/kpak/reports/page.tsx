"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Loader2,
  Printer,
  Scale,
  GraduationCap,
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

// Tanggal lokal (WIB)
const todayStr = (d: Date = new Date()) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Tab = "tabungan" | "administrasi" | "internal";

interface Tx {
  id: string;
  type: string;
  amount: number | string;
  description: string;
  date: string;
  status: string;
  categoryId?: string | null;
  categoryName?: string | null;
  category?: { name: string } | null;
}

interface SavingTx {
  id: string;
  type: string;
  amount: number | string;
  description?: string | null;
  createdAt: string;
}

interface Category {
  id: string;
  code: string;
  type: string;
}

const catName = (t: Tx) =>
  t.categoryName || t.category?.name || "Tanpa kategori";

export default function KpakReportsPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      ((u?.role === "MANAGER" || u?.role === "STAFF") &&
        u?.unitIsRetail !== true),
  });

  const [tab, setTab] = useState<Tab>("tabungan");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [txs, setTxs] = useState<Tx[]>([]);
  const [savings, setSavings] = useState<SavingTx[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Tutup Hari Otomatis (manager+) ──
  const { data: session } = useSession();
  const canClose =
    session?.user?.role === "SUPERADMIN" ||
    session?.user?.role === "PIMPINAN" ||
    session?.user?.role === "MANAGER";
  const [closeDate, setCloseDate] = useState(todayStr());
  const [closePreview, setClosePreview] = useState<any>(null);
  const [closeLoading, setCloseLoading] = useState(false);
  const [cashCounted, setCashCounted] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeResult, setCloseResult] = useState<any>(null);

  const fetchClosePreview = useCallback(async (d: string) => {
    setCloseLoading(true);
    setCloseResult(null);
    try {
      const res = await fetch(`/api/kpak/reconcile?date=${d}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat");
      setClosePreview(json.data);
    } catch (e: any) {
      setClosePreview(null);
      toast.error(e.message);
    } finally {
      setCloseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canClose) fetchClosePreview(closeDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeDate, canClose]);

  const closeVariance =
    closePreview && cashCounted !== ""
      ? Number(cashCounted) - Number(closePreview.expected || 0)
      : null;

  const doClose = async () => {
    if (cashCounted === "" || Number(cashCounted) < 0) {
      toast.error("Isi hitung fisik kas dulu");
      return;
    }
    setClosing(true);
    try {
      const res = await fetch("/api/kpak/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: closeDate,
          cashCounted: Number(cashCounted),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menutup hari");
      setCloseResult(json.data);
      setCashCounted("");
      fetchClosePreview(closeDate);
      toast.success("Hari ditutup — serah terima dibuat untuk pimpinan");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setClosing(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, svRes, catRes] = await Promise.all([
        fetch(
          `/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=200`,
        ),
        fetch(`/api/savings/transactions?limit=200`),
        fetch("/api/financial-categories"),
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
      if (catRes.ok) {
        const c = await catRes.json();
        setCategories(c.data || []);
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

  // Kategori administrasi santri = INCOME kecuali Uang Masuk Internal (IN-IN)
  const adminCatIds = useMemo(
    () =>
      new Set(
        categories
          .filter((c) => c.type === "INCOME" && !c.code.endsWith("-IN-IN"))
          .map((c) => c.id),
      ),
    [categories],
  );

  const valid = useMemo(
    () => txs.filter((t) => t.status !== "REJECTED"),
    [txs],
  );
  const adminTxs = useMemo(
    () =>
      valid.filter(
        (t) => t.type === "INCOME" && t.categoryId && adminCatIds.has(t.categoryId),
      ),
    [valid, adminCatIds],
  );
  const internalTxs = useMemo(
    () =>
      valid.filter(
        (t) =>
          t.type === "EXPENSE" ||
          (t.type === "INCOME" && !(t.categoryId && adminCatIds.has(t.categoryId))),
      ),
    [valid, adminCatIds],
  );

  const sum = (list: { amount: number | string }[]) =>
    list.reduce((s, x) => s + Number(x.amount || 0), 0);
  const savingsIn = sum(savings.filter((t) => t.type === "DEPOSIT"));
  const savingsOut = sum(savings.filter((t) => t.type === "WITHDRAWAL"));
  const adminTotal = sum(adminTxs);
  const internalIn = sum(internalTxs.filter((t) => t.type === "INCOME"));
  const internalOut = sum(internalTxs.filter((t) => t.type === "EXPENSE"));

  const setPreset = (preset: "today" | "week" | "month") => {
    const end = new Date();
    const start = new Date();
    if (preset === "week") start.setDate(start.getDate() - 6);
    if (preset === "month") start.setDate(start.getDate() - 29);
    setStartDate(todayStr(start));
    setEndDate(todayStr(end));
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "tabungan", label: "Laporan Tabungan" },
    { id: "administrasi", label: "HER & Daftar Ulang" },
    { id: "internal", label: "Dana Internal" },
  ];

  const txRow = (t: Tx) => (
    <div
      key={t.id}
      className="flex items-center justify-between gap-3 py-2.5 text-sm"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{t.description}</p>
        <p className="text-xs text-muted-foreground">
          {catName(t)} ·{" "}
          {new Date(t.date).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}{" "}
          · {t.status}
        </p>
      </div>
      <p
        className={`shrink-0 font-semibold ${
          t.type === "INCOME"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {t.type === "INCOME" ? "+" : "-"}
        {formatCurrency(Number(t.amount))}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rekap & Laporan</h1>
          <p className="text-sm text-muted-foreground">
            Laporan SOP harian KPAK — siap dibawa manghadap pimpinan
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          <Printer size={16} /> Cetak Laporan
        </button>
      </div>

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

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
          Menyusun laporan...
        </p>
      ) : (
        <>
          {tab === "tabungan" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-600" />
                    <p className="text-xs text-muted-foreground">Setoran</p>
                  </div>
                  <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(savingsIn)}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={16} className="text-rose-600" />
                    <p className="text-xs text-muted-foreground">Penarikan</p>
                  </div>
                  <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(savingsOut)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <PiggyBank size={15} /> Mutasi Tabungan ({savings.length})
                </h2>
                {savings.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Tidak ada mutasi pada periode ini
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
            </>
          )}

          {tab === "administrasi" && (
            <>
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2.5">
                    <GraduationCap
                      size={20}
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total HER, Daftar Ulang & Pendaftaran
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(adminTotal)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {adminTxs.length} pembayaran
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <h2 className="mb-3 text-sm font-semibold">Rincian Pembayaran</h2>
                {adminTxs.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Tidak ada pembayaran administrasi pada periode ini
                  </p>
                ) : (
                  <div className="divide-y">{adminTxs.map(txRow)}</div>
                )}
              </div>
            </>
          )}

          {tab === "internal" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-600" />
                    <p className="text-xs text-muted-foreground">Masuk</p>
                  </div>
                  <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(internalIn)}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={16} className="text-rose-600" />
                    <p className="text-xs text-muted-foreground">Keluar</p>
                  </div>
                  <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(internalOut)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Wallet size={15} /> Dana Internal ({internalTxs.length})
                </h2>
                {internalTxs.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Tidak ada transaksi internal pada periode ini
                  </p>
                ) : (
                  <div className="divide-y">{internalTxs.map(txRow)}</div>
                )}
              </div>
            </>
          )}

          {canClose && (
            <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Scale size={15} /> Tutup Hari Otomatis
                </h2>
                <input
                  type="date"
                  value={closeDate}
                  onChange={(e) =>
                    e.target.value && setCloseDate(e.target.value)
                  }
                  className="rounded-lg border bg-background px-3 py-1.5 text-sm"
                />
              </div>
              {closeLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  <Loader2 size={16} className="mx-auto animate-spin" />
                </p>
              ) : !closePreview ||
                (closePreview.txCount === 0 &&
                  closePreview.savingsCount === 0) ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Tidak ada aktivitas kas/tabungan tanggal ini
                </p>
              ) : closePreview.existingHandover?.status === "PENDING" ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm">
                  <p className="font-medium">
                    Serah terima tanggal ini sudah dibuat (menunggu pimpinan).
                  </p>
                  <Link
                    href="/dashboard/handovers"
                    className="mt-2 inline-block font-medium text-primary hover:underline"
                  >
                    Lihat Serah Terima Kas →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="text-xs text-muted-foreground">Kas masuk</p>
                      <p className="font-semibold text-emerald-600">
                        +{formatCurrency(closePreview.kasIn)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="text-xs text-muted-foreground">Kas keluar</p>
                      <p className="font-semibold text-rose-600">
                        -{formatCurrency(closePreview.kasOut)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="text-xs text-muted-foreground">Tab. masuk</p>
                      <p className="font-semibold text-emerald-600">
                        +{formatCurrency(closePreview.savIn)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="text-xs text-muted-foreground">Tab. keluar</p>
                      <p className="font-semibold text-rose-600">
                        -{formatCurrency(closePreview.savOut)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <p className="text-xs text-muted-foreground">
                        Seharusnya ada
                      </p>
                      <p className="font-bold">
                        {formatCurrency(closePreview.expected)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={cashCounted}
                      onChange={(e) => setCashCounted(e.target.value)}
                      placeholder="Hitung fisik uang di laci (Rp)"
                      className="min-w-52 flex-1 rounded-lg border bg-background px-3 py-2.5 text-sm"
                    />
                    <button
                      onClick={doClose}
                      disabled={closing || cashCounted === ""}
                      className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {closing ? "Memproses..." : "Tutup & Serahkan"}
                    </button>
                  </div>
                  {closeVariance != null && (
                    <p
                      className={`text-sm font-medium ${closeVariance === 0 ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {closeVariance === 0
                        ? "✓ Pas — tidak ada selisih"
                        : `Selisih ${formatCurrency(Math.abs(closeVariance))} (${closeVariance > 0 ? "lebih" : "kurang"}) — tetap bisa diserahkan, tercatat otomatis`}
                    </p>
                  )}
                  {closeResult && (
                    <p className="text-sm">
                      <span className="font-medium text-emerald-600">
                        Serah terima #{closeResult.handover?.id?.slice(0, 8)}…
                        dibuat.
                      </span>{" "}
                      <Link
                        href="/dashboard/handovers"
                        className="font-medium text-primary hover:underline"
                      >
                        Lihat Serah Terima Kas →
                      </Link>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Sekali klik: tandai transaksi reconciled + buat serah terima
                    ke pimpinan. Detail manual tetap bisa lewat Rekonsiliasi.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-card p-5">
            <div className="text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Scale size={15} /> Butuh rincian manual?
              </p>
              <p className="text-muted-foreground">
                Cek per transaksi di Rekonsiliasi, atau daftar serah terima.
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

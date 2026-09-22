"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  CreditCard,
  Search,
  Loader2,
  Wallet,
  Banknote,
  Settings2,
  Receipt,
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { usePageGuard } from "@/lib/use-page-guard";
import { uploadProof } from "@/lib/upload-proof";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

// Tanggal lokal (WIB)
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Tab = "santri" | "internal";
type Method = "CASH" | "BANK" | "TABUNGAN";

interface Category {
  id: string;
  name: string;
  code: string;
  type: string;
  unitId?: string | null;
  isActive?: boolean | null;
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
  type: string;
  amount: number | string;
  description: string;
  reference?: string | null;
  date: string;
  status: string;
  categoryId?: string | null;
  photoUrl?: string | null;
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

  const [tab, setTab] = useState<Tab>("santri");
  useEffect(() => {
    if (window.location.search.includes("tab=internal")) setTab("internal");
  }, []);

  // ── Data umum ──
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Santri tab ──
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [santriToday, setSantriToday] = useState(0);
  const [santriRecent, setSantriRecent] = useState<RecentTx[]>([]);
  const [nis, setNis] = useState("");
  const [santri, setSantri] = useState<Santri | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [saving, setSaving] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);

  // ── Internal tab (hanya CASH) ──
  const [txType, setTxType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [intCat, setIntCat] = useState<Category | null>(null);
  const [todayIn, setTodayIn] = useState(0);
  const [todayOut, setTodayOut] = useState(0);
  const [intRecent, setIntRecent] = useState<RecentTx[]>([]);
  const [intAmount, setIntAmount] = useState("");
  const [intNote, setIntNote] = useState("");
  const [intSaving, setIntSaving] = useState(false);

  const [seeding, setSeeding] = useState(false);

  const { data: session } = useSession();
  const canManageCategories =
    session?.user?.role === "SUPERADMIN" ||
    session?.user?.role === "PIMPINAN" ||
    session?.user?.role === "MANAGER";

  // Hanya kategori unit — kategori lembaga khusus pimpinan
  const unitCats = useMemo(
    () => categories.filter((c) => c.unitId && c.isActive !== false),
    [categories],
  );
  const incomeCats = useMemo(
    () => unitCats.filter((c) => c.type === "INCOME"),
    [unitCats],
  );
  const intCats = useMemo(
    () => unitCats.filter((c) => c.type === txType),
    [unitCats, txType],
  );
  // Kategori administrasi santri = INCOME kecuali Uang Masuk Internal
  const adminCatIds = useMemo(
    () =>
      new Set(
        incomeCats.filter((c) => !c.code.endsWith("-IN-IN")).map((c) => c.id),
      ),
    [incomeCats],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayLocal();
      const [catRes, santriRes, intRes, todayRes] = await Promise.all([
        fetch("/api/financial-categories"),
        fetch("/api/transactions?type=INCOME&limit=10"),
        fetch("/api/transactions?limit=15"),
        fetch(
          `/api/transactions?startDate=${today}&endDate=${today}&limit=100`,
        ),
      ]);
      if (catRes.ok) {
        const c = await catRes.json();
        setCategories(c.data || []);
      }
      if (santriRes.ok) {
        const t = await santriRes.json();
        setSantriRecent(t.data || t.transactions || []);
      }
      if (intRes.ok) {
        const t = await intRes.json();
        setIntRecent(t.data || t.transactions || []);
      }
      if (todayRes.ok) {
        const t = await todayRes.json();
        const day: RecentTx[] = t.data || t.transactions || [];
        setSantriToday(
          day
            .filter((x) => x.type === "INCOME")
            .reduce((s, x) => s + Number(x.amount || 0), 0),
        );
        setTodayIn(
          day
            .filter(
              (x) =>
                x.type === "EXPENSE" ||
                (x.type === "INCOME" &&
                  !(x.categoryId && adminCatIdsRef.current.has(x.categoryId))),
            )
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
      toast.error("Gagal memuat data layanan keuangan");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref kategori admin untuk filter internal (hindari stale closure)
  const adminCatIdsRef = useRef<Set<string>>(new Set());
  adminCatIdsRef.current = adminCatIds;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selectedCat && incomeCats.length > 0) setSelectedCat(incomeCats[0]);
  }, [incomeCats, selectedCat]);
  useEffect(() => {
    setIntCat(intCats[0] || null);
  }, [intCats]);

  // Auto-seed sekali bila kategori unit kosong
  const seedTried = useRef(false);
  const seedDefaultCategories = useCallback(async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/financial-categories/seed-kpak", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat kategori");
      toast.success(
        json.data?.created > 0
          ? `${json.data.created} kategori bawaan dibuat`
          : "Kategori bawaan sudah ada",
      );
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSeeding(false);
    }
  }, [fetchData]);
  useEffect(() => {
    if (
      !loading &&
      unitCats.length === 0 &&
      canManageCategories &&
      !seedTried.current
    ) {
      seedTried.current = true;
      seedDefaultCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, unitCats, canManageCategories]);

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

  const handleSantriSubmit = async (e: React.FormEvent) => {
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
    if (method === "TABUNGAN" && !santri) {
      toast.error("Cari santri dulu untuk pembayaran via tabungan");
      return;
    }
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (proofFile) {
        toast.loading("Mengunggah bukti...", { id: "proof" });
        const up = await uploadProof(proofFile);
        toast.dismiss("proof");
        photoUrl = up.url;
        if (up.storage === "local")
          toast.warning("Drive belum aktif — bukti tersimpan lokal", {
            description: up.warning,
          });
      }
      const res = await fetch("/api/kpak/pay-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCat.id,
          amount: nominal,
          note: note.trim() || undefined,
          method,
          studentNumber:
            method === "TABUNGAN" ? santri?.studentNumber : undefined,
          photoUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mencatat pembayaran");

      if (method === "TABUNGAN" && json.data?.balanceAfter != null) {
        const after = Number(json.data.balanceAfter);
        setSantri((s) =>
          s?.account ? { ...s, account: { ...s.account, balance: after } } : s,
        );
      }
      toast.success(
        json.data?.status === "PENDING"
          ? "Pembayaran tercatat — menunggu persetujuan"
          : "Pembayaran berhasil dicatat",
      );
      setAmount("");
      setNote("");
      setProofFile(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intCat) {
      toast.error("Pilih kategori dulu");
      return;
    }
    const nominal = Number(intAmount);
    if (!nominal || nominal <= 0) {
      toast.error("Nominal harus lebih dari 0");
      return;
    }
    if (!intNote.trim()) {
      toast.error("Keterangan wajib diisi");
      return;
    }
    setIntSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: txType,
          amount: nominal,
          description: `${intCat.name} — ${intNote.trim()}`,
          categoryId: intCat.id,
          paymentMethod: "CASH",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mencatat");
      toast.success(
        json.data?.status === "PENDING"
          ? "Tercatat — menunggu persetujuan"
          : "Berhasil dicatat",
      );
      setIntAmount("");
      setIntNote("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIntSaving(false);
    }
  };

  const emptySeedBox = (label: string) => (
    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
      Belum ada kategori {label}.
      {canManageCategories ? (
        <>
          <button
            type="button"
            onClick={seedDefaultCategories}
            disabled={seeding}
            className="mx-auto mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {seeding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
            {seeding ? "Membuat..." : "Buat Kategori Bawaan KPAK"}
          </button>
          <Link
            href="/dashboard/settings/categories"
            className="mt-2 block text-xs hover:underline"
          >
            atau atur manual di Kelola Kategori
          </Link>
        </>
      ) : (
        <p className="mt-2">Hubungi Manager untuk menambah kategori</p>
      )}
    </div>
  );

  const methods: { id: Method; label: string; hint: string }[] = [
    { id: "CASH", label: "Tunai", hint: "Cash fisik" },
    { id: "BANK", label: "Bank", hint: "Transfer rekening" },
    { id: "TABUNGAN", label: "Tabungan", hint: "Potong saldo" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Layanan Keuangan</h1>
          <p className="text-sm text-muted-foreground">
            Administrasi santri (HER, daftar ulang) & internal unit
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Layanan hari ini</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(santriToday)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Internal masuk</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(todayIn)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Internal keluar</p>
          <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(todayOut)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("santri")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "santri"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/70"
          }`}
        >
          Administrasi Santri
        </button>
        <button
          onClick={() => setTab("internal")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "internal"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/70"
          }`}
        >
          Internal (Tunai)
        </button>
      </div>

      {tab === "santri" ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold">
                1. Pilih Layanan (HER / Daftar Ulang)
              </h2>
              {loading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  <Loader2 size={16} className="mx-auto mb-1 animate-spin" />
                  Memuat...
                </p>
              ) : incomeCats.length === 0 ? (
                emptySeedBox("layanan")
              ) : (
                <div className="grid gap-2">
                  {incomeCats
                    .filter((c) => adminCatIds.has(c.id))
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCat(c)}
                        className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                          selectedCat?.id === c.id
                            ? "border-primary bg-primary/5 font-semibold"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              )}

              <h2 className="mb-2 mt-5 text-sm font-semibold">
                2. Santri{" "}
                <span className="font-normal text-muted-foreground">
                  (wajib untuk Tabungan)
                </span>
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

            <form
              onSubmit={handleSantriSubmit}
              className="space-y-4 rounded-xl border bg-card p-5"
            >
              <h2 className="text-sm font-semibold">3. Bayar via</h2>
              <div className="grid grid-cols-3 gap-2">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`rounded-lg border px-2 py-3 text-center transition-colors ${
                      method === m.id
                        ? "border-primary bg-primary/5"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-[10px]">{m.hint}</p>
                  </button>
                ))}
              </div>
              {method === "BANK" && (
                <p className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-400">
                  Transfer via rekening — tidak menambah cash fisik laci.
                  Lampirkan bukti transfer di bawah.
                </p>
              )}
              {method === "TABUNGAN" && !santri && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                  Isi NIS/UID santri di langkah 2 dulu.
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
                placeholder="Keterangan (contoh: HER September)"
                className="w-full rounded-lg border bg-background px-3 py-3 text-sm"
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Bukti transfer (bila via bank/rekening)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
                />
                {proofFile && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {proofFile.name}
                  </p>
                )}
              </div>
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

          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Pembayaran Terakhir</h2>
            {santriRecent.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada pembayaran tercatat
              </p>
            ) : (
              <div className="divide-y">
                {santriRecent.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {t.description}
                        {t.photoUrl && (
                          <a
                            href={t.photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-xs font-medium text-primary hover:underline"
                          >
                            Bukti →
                          </a>
                        )}
                      </p>
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
                    <p className="shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(Number(t.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold">
                1. Masuk / Keluar? (tunai saja)
              </h2>
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
                  Memuat...
                </p>
              ) : intCats.length === 0 ? (
                emptySeedBox(
                  txType === "INCOME" ? "uang masuk" : "pengeluaran",
                )
              ) : (
                <div className="grid gap-2">
                  {intCats.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setIntCat(c)}
                      className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                        intCat?.id === c.id
                          ? "border-primary bg-primary/5 font-semibold"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                <Banknote size={14} /> Internal hanya tunai (cash) — transfer
                bank dicatat di Administrasi Santri bila terkait santri.
              </p>
            </div>

            <form
              onSubmit={handleInternalSubmit}
              className="space-y-4 rounded-xl border bg-card p-5"
            >
              <h2 className="text-sm font-semibold">3. Nominal & Keterangan</h2>
              <div className="rounded-lg bg-primary/5 p-3 text-sm">
                {txType === "INCOME" ? "Uang masuk" : "Pengeluaran"}:{" "}
                <span className="font-semibold">
                  {intCat?.name || "— pilih di kiri —"}
                </span>
              </div>
              <input
                required
                type="number"
                min="1"
                value={intAmount}
                onChange={(e) => setIntAmount(e.target.value)}
                placeholder="Nominal (Rp)"
                className="w-full rounded-lg border bg-background px-3 py-3 text-sm"
              />
              <textarea
                required
                value={intNote}
                onChange={(e) => setIntNote(e.target.value)}
                placeholder={
                  txType === "INCOME"
                    ? "Uang apa? (contoh: kembalian belanja ATK)"
                    : "Untuk apa? (contoh: beli ATK, gaji cleaning)"
                }
                rows={3}
                className="w-full resize-none rounded-lg border bg-background px-3 py-3 text-sm"
              />
              <button
                disabled={intSaving || !intCat}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {intSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Wallet size={16} />
                )}
                {intSaving
                  ? "Memproses..."
                  : txType === "INCOME"
                    ? "Catat Uang Masuk"
                    : "Catat Pengeluaran"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">
              Transaksi Internal Terakhir
            </h2>
            {intRecent.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada transaksi tercatat
              </p>
            ) : (
              <div className="divide-y">
                {intRecent.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.category?.name ||
                          (t.type === "INCOME"
                            ? "Pemasukan"
                            : "Pengeluaran")}{" "}
                        ·{" "}
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
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-4 rounded-lg bg-muted/50 p-3 text-sm">
              <span className="inline-flex items-center gap-1">
                <TrendingUp size={14} className="text-emerald-600" />
                Masuk hari ini: {formatCurrency(todayIn)}
              </span>
              <span className="inline-flex items-center gap-1">
                <TrendingDown size={14} className="text-rose-600" />
                Keluar: {formatCurrency(todayOut)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

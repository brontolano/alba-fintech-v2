"use client";

import { useState, useEffect, Fragment } from "react";
import {
  Search,
  Eye,
  Trash2,
  Plus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  FinzoList,
  FinzoListRow,
  StatusPill,
  finzoInputClass,
  finzoSelectClass,
  FinzoButton,
} from "@/components/ui/finzo";
import { RetailStaffLedger } from "@/components/retail/RetailStaffLedger";

interface Transaction {
  id: string;
  date: string;
  unitId: string | null;
  unitName?: string;
  accountName?: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description: string;
  amount: number;
  categoryName?: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  reference?: string;
  createdByName?: string;
  createdAt: string;
  balanceAfter?: number;
}

interface Unit {
  id: string;
  name: string;
}

interface TransactionsResponse {
  data: Transaction[];
  summary: {
    total: number;
    pages: number;
    todayCount: number;
    pendingCount: number;
    draftCount: number;
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
  };
}

const statusLabel: Record<string, string> = {
  APPROVED: "Disetujui",
  PENDING: "Pending",
  REJECTED: "Ditolak",
  DRAFT: "Draft",
};

export default function TransactionsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; type: string }>
  >([]);
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    unitId: "",
    type: "",
    status: "",
    categoryId: "",
    startDate: "",
    endDate: "",
  });
  const [datePreset, setDatePreset] = useState("all");
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState({
    total: 0,
    pages: 1,
    todayCount: 0,
    pendingCount: 0,
    draftCount: 0,
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // State Buku Kas: form input cepat
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quick, setQuick] = useState({
    type: "INCOME",
    amount: "",
    description: "",
    categoryId: "",
    unitId: "",
    date: "",
  });
  const limit = 10;

  // Set default unit filter for MANAGER/STAFF
  useEffect(() => {
    if (session?.user?.role === "MANAGER" || session?.user?.role === "STAFF") {
      if (session?.user?.unitId) {
        setFilters((prev) => ({ ...prev, unitId: session.user.unitId || "" }));
      }
    }
  }, [session]);

  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/units");
      if (!res.ok) throw new Error("Gagal memuat unit");
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/financial-categories");
      if (!res.ok) throw new Error("Gagal memuat kategori");
      const data = await res.json();
      setCategories(data.data ?? []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", limit.toString());
      if (filters.unitId) params.set("unitId", filters.unitId);
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.search) params.set("search", filters.search);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memuat transaksi");
      }
      const result: TransactionsResponse = await res.json();
      setTransactions(result.data ?? []);
      setTotalPages(result.summary?.pages ?? 1);
      setTotalItems(result.summary?.total ?? 0);
      setSummary({
        total: result.summary?.total ?? 0,
        pages: result.summary?.pages ?? 1,
        todayCount: result.summary?.todayCount ?? 0,
        pendingCount: result.summary?.pendingCount ?? 0,
        draftCount: result.summary?.draftCount ?? 0,
        totalIncome: result.summary?.totalIncome ?? 0,
        totalExpense: result.summary?.totalExpense ?? 0,
        netBalance: result.summary?.netBalance ?? 0,
      });
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat transaksi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    filters.unitId,
    filters.type,
    filters.status,
    filters.categoryId,
    filters.search,
    filters.startDate,
    filters.endDate,
  ]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    if (field === "startDate" || field === "endDate") {
      setDatePreset(value ? "custom" : "all");
    }
    setCurrentPage(1); // Reset to first page on new filter
  };

  const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    const end = formatDateInput(today);

    if (preset === "all") {
      setFilters((prev) => ({ ...prev, startDate: "", endDate: "" }));
      setDatePreset("all");
      setCurrentPage(1);
      return;
    }

    const start = new Date(today);
    if (preset === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (preset === "7d") {
      start.setDate(today.getDate() - 6);
    } else if (preset === "30d") {
      start.setDate(today.getDate() - 29);
    } else if (preset === "90d") {
      start.setDate(today.getDate() - 89);
    }

    setFilters((prev) => ({
      ...prev,
      startDate: formatDateInput(start),
      endDate: end,
    }));
    setDatePreset(preset);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus transaksi");
      }
      toast.success("Transaksi berhasil dihapus");
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus transaksi");
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const openQuickForm = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setQuick({
      type: "INCOME",
      amount: "",
      description: "",
      categoryId: "",
      unitId: session?.user?.unitId || filters.unitId || "",
      date: `${year}-${month}-${day}`,
    });
    setQuickOpen((prev) => !prev);
  };

  const submitQuick = async () => {
    const amount = Number(quick.amount);
    if (!amount || amount <= 0) {
      toast.error("Jumlah harus diisi");
      return;
    }
    if (!quick.description.trim()) {
      toast.error("Keterangan wajib diisi");
      return;
    }
    const isUnitBounded =
      session?.user?.role === "MANAGER" || session?.user?.role === "STAFF";
    const payload: Record<string, unknown> = {
      type: quick.type,
      amount,
      description: quick.description.trim(),
      categoryId: quick.categoryId || undefined,
      date: quick.date || undefined,
    };
    if (!isUnitBounded) {
      if (!quick.unitId) {
        toast.error("Unit wajib dipilih");
        return;
      }
      payload.unitId = quick.unitId;
    }

    setQuickSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mencatat transaksi");
      }
      toast.success("Transaksi tercatat");
      setQuickOpen(false);
      setCurrentPage(1);
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || "Gagal mencatat transaksi");
    } finally {
      setQuickSaving(false);
    }
  };

  const hasFilter = Object.values(filters).some(
    (v) => v !== "" && v !== undefined,
  );

  // Retail: ledger ringkas khusus (unit terkunci, tanpa scroll horizontal).
  // Staff baca saja; Manager + tombol kelola.
  const isRetailStaff =
    session?.user?.role === "STAFF" &&
    (session?.user as any)?.unitIsRetail === true;
  const isRetailManager =
    session?.user?.role === "MANAGER" &&
    (session?.user as any)?.unitIsRetail === true;
  if (isRetailStaff || isRetailManager) {
    return (
      <div className="mx-auto max-w-3xl">
        <RetailStaffLedger manage={isRetailManager} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-bold tracking-[-0.04em] text-foreground">
            Buku Kas {units.find((u) => u.id === filters.unitId)?.name ? `· ${units.find((u) => u.id === filters.unitId)?.name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Format <span className="font-medium text-foreground">Tanggal · Keterangan · Debet · Kredit · Saldo</span> —
            catat pemasukan &amp; pengeluaran, saldo berjalan otomatis dihitung.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openQuickForm}
            className="inline-flex h-[46px] items-center justify-center gap-2 self-start rounded-full border border-[#1bb0a6] px-5 text-sm font-semibold text-[#1bb0a6] transition hover:bg-[#eafaf7] active:scale-[0.99] dark:hover:bg-emerald-500/10"
          >
            <Plus size={18} />
            <span>{quickOpen ? "Tutup" : "Catat cepat"}</span>
          </button>
          <Link
            href="/dashboard/transactions/create"
            className="inline-flex h-[46px] items-center justify-center gap-2 self-start rounded-full bg-[#1bb0a6] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#17a199] active:scale-[0.99]"
          >
            <Plus size={18} />
            <span>Input Data</span>
          </Link>
        </div>
      </div>

      {quickOpen && (
        <div className="rounded-[24px] border border-[#1bb0a6]/40 bg-gradient-to-r from-teal-50 via-white to-emerald-50 p-4 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:via-card dark:to-teal-500/10">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1bb0a6] text-white">
              <Plus size={16} />
            </span>
            <div>
              <div className="text-sm font-bold text-foreground">
                Catat Cepat
              </div>
              <div className="text-[11px] text-muted-foreground">
                Pemasukan atau pengeluaran hari ini tanpa buka halaman baru
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="flex rounded-full border border-[#e5e7eb] bg-white p-1 dark:border-border dark:bg-card">
                {[
                  { id: "INCOME", label: "Pemasukan" },
                  { id: "EXPENSE", label: "Pengeluaran" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setQuick((prev) => ({ ...prev, type: opt.id }))
                    }
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                      quick.type === opt.id
                        ? "bg-[#1bb0a6] text-white"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <input
                type="number"
                inputMode="numeric"
                placeholder="Jumlah (Rp)"
                value={quick.amount}
                onChange={(e) =>
                  setQuick((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="h-[42px] w-full rounded-full border border-[#e5e7eb] bg-white px-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1bb0a6] dark:border-border dark:bg-card dark:text-foreground"
              />

              <input
                type="text"
                placeholder="Keterangan, mis. Beli buku tulis"
                value={quick.description}
                onChange={(e) =>
                  setQuick((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="sm:col-span-2 h-[42px] w-full rounded-full border border-[#e5e7eb] bg-white px-4 text-[15px] text-slate-700 outline-none transition focus:border-[#1bb0a6] dark:border-border dark:bg-card dark:text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="relative">
                <select
                  value={quick.categoryId}
                  onChange={(e) =>
                    setQuick((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                    }))
                  }
                  className="h-[42px] w-full appearance-none rounded-full border border-[#e5e7eb] bg-white px-4 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#1bb0a6] dark:border-border dark:bg-card dark:text-foreground"
                  aria-label="Kategori"
                >
                  <option value="">Kategori (opsional)</option>
                  {categories
                    .filter((c) => !quick.type || c.type === quick.type)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
              </div>

              <div className="relative">
                <select
                  value={quick.unitId}
                  onChange={(e) =>
                    setQuick((prev) => ({ ...prev, unitId: e.target.value }))
                  }
                  disabled={
                    session?.user?.role === "MANAGER" ||
                    session?.user?.role === "STAFF"
                  }
                  className="h-[42px] w-full appearance-none rounded-full border border-[#e5e7eb] bg-white px-4 pr-9 text-sm text-slate-700 outline-none transition focus:border-[#1bb0a6] disabled:bg-muted disabled:text-muted-foreground dark:border-border dark:bg-card dark:text-foreground"
                  aria-label="Unit"
                >
                  <option value="">Pilih unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
              </div>

              <input
                type="date"
                value={quick.date}
                onChange={(e) =>
                  setQuick((prev) => ({ ...prev, date: e.target.value }))
                }
                className="h-[42px] w-full rounded-full border border-[#e5e7eb] bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-[#1bb0a6] dark:border-border dark:bg-card dark:text-foreground"
              />

              <button
                type="button"
                onClick={submitQuick}
                disabled={quickSaving}
                className="flex h-[42px] w-full items-center justify-center gap-1.5 rounded-full bg-[#1bb0a6] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#17a199] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {quickSaving ? "Menyimpan..." : "Simpan ke buku"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Cari deskripsi atau referensi..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-muted pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:bg-card"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <select
              value={filters.unitId}
              onChange={(e) => handleFilterChange("unitId", e.target.value)}
              className="h-8 appearance-none rounded-lg border border-border bg-card px-2.5 pr-7 text-xs outline-none transition focus:border-primary"
            >
              <option value="">Semua Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
          </div>

          <div className="relative">
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className="h-8 appearance-none rounded-lg border border-border bg-card px-2.5 pr-7 text-xs outline-none transition focus:border-primary"
            >
              <option value="">Semua Tipe</option>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
          </div>

          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="h-8 appearance-none rounded-lg border border-border bg-card px-2.5 pr-7 text-xs outline-none transition focus:border-primary"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
              <option value="DRAFT">Draft</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
          </div>

          <button
            type="button"
            onClick={() => setShowDateMenu((p) => !p)}
            className={`h-8 inline-flex items-center gap-1 rounded-lg border px-2 text-xs transition ${showDateMenu ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
          >
            <CalendarDays size={12} />
            {datePreset === "all" ? "Periode" : datePreset === "today" ? "Hari ini" : datePreset === "7d" ? "7 hari" : datePreset === "30d" ? "30 hari" : datePreset === "90d" ? "90 hari" : "Custom"}
          </button>

          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setFilters({ search: "", unitId: "", type: "", status: "", categoryId: "", startDate: "", endDate: "" });
                setDatePreset("all");
                setCurrentPage(1);
              }}
              className="h-8 inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          )}
        </div>

        {showDateMenu && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-2">
            {[
              { id: "all", label: "Semua" },
              { id: "today", label: "Hari ini" },
              { id: "7d", label: "7 hari" },
              { id: "30d", label: "30 hari" },
              { id: "90d", label: "90 hari" },
              { id: "custom", label: "Custom" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (p.id === "custom") { setDatePreset("custom"); return; }
                  applyDatePreset(p.id);
                  setShowDateMenu(false);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${datePreset === p.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {p.label}
              </button>
            ))}
            {datePreset === "custom" && (
              <div className="flex items-center gap-1.5 ml-2">
                <input type="date" value={filters.startDate} onChange={(e) => { handleFilterChange("startDate", e.target.value); setDatePreset("custom"); }} className="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:border-primary" />
                <span className="text-xs text-muted-foreground">-</span>
                <input type="date" value={filters.endDate} onChange={(e) => { handleFilterChange("endDate", e.target.value); setDatePreset("custom"); }} className="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:border-primary" />
              </div>
            )}
          </div>
        )}

        {showDateMenu && categories.length > 0 && (
          <div className="relative inline-block">
            <select
              value={filters.categoryId}
              onChange={(e) => handleFilterChange("categoryId", e.target.value)}
              className="h-8 appearance-none rounded-lg border border-border bg-card px-2.5 pr-7 text-xs outline-none transition focus:border-primary"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-[24px] border border-[#e5e7eb] bg-white py-12 text-center text-sm text-muted-foreground dark:border-border dark:bg-card">
          Memuat data...
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-[24px] border border-[#e5e7eb] bg-white py-12 text-center text-sm text-muted-foreground dark:border-border dark:bg-card">
          Tidak ada transaksi ditemukan
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.03)] dark:border-border dark:bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#eef1f4] bg-[#f8fafc] text-[10px] uppercase tracking-[0.12em] text-muted-foreground dark:border-border dark:bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold">No</th>
                  <th className="px-3 py-3 text-left font-semibold">Tanggal</th>
                  <th className="px-3 py-3 text-left font-semibold">Keterangan</th>
                  <th className="px-3 py-3 text-right font-semibold">Debet (Rp)</th>
                  <th className="px-3 py-3 text-right font-semibold">Kredit (Rp)</th>
                  <th className="px-3 py-3 text-right font-semibold">Saldo (Rp)</th>
                  <th className="w-12 px-3 py-3 text-right" />
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => {
                  const isExpanded = expandedId === tx.id;
                  const title =
                    tx.description || tx.reference || "(tanpa deskripsi)";
                  const detail = [
                    tx.categoryName || "-",
                    tx.reference ? `Ref ${tx.reference}` : null,
                    tx.createdByName ? `oleh ${tx.createdByName}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <Fragment key={tx.id}>
                      <tr
                        onClick={() =>
                          setExpandedId(isExpanded ? null : tx.id)
                        }
                        className="cursor-pointer border-b border-[#f1f5f9] transition hover:bg-[#fafcfd] dark:border-border dark:hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {(currentPage - 1) * limit + idx + 1}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[13px] text-foreground">
                          {new Date(tx.date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="min-w-[220px] px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="max-w-[240px] truncate text-[13px] font-semibold text-foreground">
                              {title}
                            </span>
                            <StatusPill status={tx.status} />
                          </div>
                          <div className="mt-0.5 max-w-[260px] truncate text-[11px] text-muted-foreground">
                            {tx.unitName || "Tanpa Unit"}
                            {detail ? ` · ${detail}` : ""}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          {tx.type === "INCOME" ? (
                            <span className="font-semibold text-[#1bb0a6]">
                              {formatCurrency(tx.amount)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          {tx.type === "EXPENSE" ? (
                            <span className="font-semibold text-[#e35d52]">
                              {formatCurrency(tx.amount)}
                            </span>
                          ) : tx.type === "TRANSFER" ? (
                            <span className="font-semibold text-[#3b82f6]">
                              {formatCurrency(tx.amount)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-foreground">
                          {formatCurrency(tx.balanceAfter ?? 0)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <ChevronDown
                            size={16}
                            className={`ml-auto text-muted-foreground transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={7}
                            className="border-b border-[#eef1f4] bg-[#fafcfd] px-4 py-3 dark:border-border dark:bg-muted/20"
                          >
                            <div className="grid gap-2 text-[12px] sm:grid-cols-2">
                              <div className="rounded-xl bg-white px-2.5 py-2 shadow-sm dark:bg-card">
                                <div className="text-muted-foreground">Kategori</div>
                                <div className="mt-1 font-medium text-foreground">
                                  {tx.categoryName || "-"}
                                </div>
                              </div>
                              <div className="rounded-xl bg-white px-2.5 py-2 shadow-sm dark:bg-card">
                                <div className="text-muted-foreground">Referensi</div>
                                <div className="mt-1 font-medium text-foreground">
                                  {tx.reference || "-"}
                                </div>
                              </div>
                              <div className="rounded-xl bg-white px-2.5 py-2 shadow-sm dark:bg-card sm:col-span-2">
                                <div className="text-muted-foreground">Keterangan</div>
                                <div className="mt-1 font-medium text-foreground">
                                  {tx.description || "-"}
                                </div>
                              </div>
                              <div className="rounded-xl bg-white px-2.5 py-2 shadow-sm dark:bg-card">
                                <div className="text-muted-foreground">Dibuat oleh</div>
                                <div className="mt-1 font-medium text-foreground">
                                  {tx.createdByName || "-"}
                                </div>
                              </div>
                              <div className="rounded-xl bg-white px-2.5 py-2 shadow-sm dark:bg-card">
                                <div className="text-muted-foreground">Unit</div>
                                <div className="mt-1 font-medium text-foreground">
                                  {tx.unitName || "-"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <Link
                                href={`/dashboard/transactions/${tx.id}/edit`}
                                className="flex h-9 items-center justify-center gap-1 rounded-full bg-white text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-[#f3f4f6] dark:bg-card dark:text-foreground dark:hover:bg-muted sm:text-sm"
                              >
                                <Edit size={13} /> Edit
                              </Link>
                              <Link
                                href={`/dashboard/transactions/${tx.id}`}
                                className="flex h-9 items-center justify-center gap-1 rounded-full bg-white text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-[#f3f4f6] dark:bg-card dark:text-foreground dark:hover:bg-muted sm:text-sm"
                              >
                                <Eye size={13} /> Detail
                              </Link>
                              {session?.user?.role === "SUPERADMIN" ||
                              session?.user?.role === "MANAGER" ||
                              session?.user?.role === "PIMPINAN" ? (
                                <button
                                  onClick={() => handleDelete(tx.id)}
                                  className="flex h-9 items-center justify-center gap-1 rounded-full bg-[#fdecec] px-2 text-[11px] font-medium text-[#d14d4d] transition hover:bg-[#fbdede] sm:text-sm"
                                >
                                  <Trash2 size={13} /> Hapus
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-sm text-muted-foreground">
          Menampilkan {loading ? "..." : (currentPage - 1) * limit + 1}-
          {Math.min(
            currentPage * limit,
            (currentPage - 1) * limit + transactions.length,
          )}{" "}
          dari {totalItems} transaksi
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={14} />
            Sebelumnya
          </button>
          <span className="rounded-full bg-[#eafaf7] px-3 py-1.5 text-sm font-semibold text-[#0f766e]">
            {currentPage}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage >= totalPages || loading}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Berikutnya
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

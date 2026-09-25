"use client";

import { useState, useEffect } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Eye,
  Trash2,
  Edit,
  Plus,
  Search,
  Wallet,
  FileSearch,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FinzoList,
  FinzoListRow,
  StatusPill,
  StatCard,
  FinzoButton,
  finzoInputClass,
  finzoSelectClass,
} from "@/components/ui/finzo";

interface Transaction {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description: string;
  amount: number;
  unitId: string | null;
  unitName?: string;
  categoryName?: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  reference?: string;
  createdByName?: string;
  createdAt: string;
  balanceAfter?: number;
}

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}

interface Filters {
  search: string;
  type: string;
  status: string;
  categoryId: string;
  startDate: string;
  endDate: string;
}

const DATE_PRESETS = [
  { key: "all", label: "Semua periode" },
  { key: "today", label: "Hari ini" },
  { key: "7d", label: "7 hari terakhir" },
  { key: "30d", label: "30 hari terakhir" },
  { key: "90d", label: "90 hari terakhir" },
] as const;

const statusLabel: Record<string, string> = {
  APPROVED: "Disetujui",
  PENDING: "Pending",
  REJECTED: "Ditolak",
  DRAFT: "Draft",
};

export function PimpinanBukuKas() {
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    pages: 1,
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    type: "",
    status: "",
    categoryId: "",
    startDate: "",
    endDate: "",
  });
  const [datePreset, setDatePreset] = useState<string>("all");
  const [showDateMenu, setShowDateMenu] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (iso: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/financial-categories");
      if (!res.ok) throw new Error("Gagal memuat kategori");
      const data = await res.json();
      setCategories(data.data ?? []);
    } catch {
      // abaikan — kategori opsional
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", limit.toString());
      if (filters.search) params.set("search", filters.search);
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memuat transaksi");
      }
      const result = await res.json();
      setTransactions(result.data ?? []);
      setSummary({
        total: result.summary?.total ?? 0,
        pages: result.summary?.pages ?? 1,
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
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    filters.search,
    filters.type,
    filters.status,
    filters.categoryId,
    filters.startDate,
    filters.endDate,
  ]);

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    const end = formatDateInput(today);

    if (preset === "all") {
      setFilters((prev) => ({ ...prev, startDate: "", endDate: "" }));
      setDatePreset("all");
      setShowDateMenu(false);
      setCurrentPage(1);
      return;
    }

    const start = new Date(today);
    if (preset === "today") start.setHours(0, 0, 0, 0);
    else if (preset === "7d") start.setDate(today.getDate() - 6);
    else if (preset === "30d") start.setDate(today.getDate() - 29);
    else if (preset === "90d") start.setDate(today.getDate() - 89);

    setFilters((prev) => ({
      ...prev,
      startDate: formatDateInput(start),
      endDate: end,
    }));
    setDatePreset(preset);
    setShowDateMenu(false);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus transaksi ini? Tindakan ini tidak dapat dibatalkan."))
      return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus transaksi");
      }
      toast.success("Transaksi berhasil dihapus");
      setExpandedId(null);
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus transaksi");
    } finally {
      setDeletingId(null);
    }
  };

  const rowIconFor = (tx: Transaction) => {
    if (tx.type === "INCOME")
      return <ArrowDownLeft size={16} className="shrink-0" />;
    if (tx.type === "EXPENSE")
      return <ArrowUpRight size={16} className="shrink-0" />;
    return <ArrowRightLeft size={16} className="shrink-0" />;
  };

  const toneFor = (tx: Transaction) =>
    tx.type === "INCOME"
      ? "income"
      : tx.type === "EXPENSE"
        ? "expense"
        : "transfer";

  const amountFor = (tx: Transaction) => {
    const sign = tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "–" : "";
    return `${sign} ${formatCurrency(tx.amount)}`;
  };

  const hasFilter =
    filters.search ||
    filters.type ||
    filters.status ||
    filters.categoryId ||
    filters.startDate ||
    filters.endDate;

  const startItem = transactions.length
    ? (currentPage - 1) * limit + 1
    : 0;
  const endItem = (currentPage - 1) * limit + transactions.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Buku Kas Lembaga
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grafik pemasukan, pengeluaran &amp; saldo bersih seluruh unit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/transactions/create">
            <FinzoButton>
              <Plus size={16} />
              Input Data
            </FinzoButton>
          </Link>
        </div>
      </div>
<div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Pemasukan"
          value={formatCurrency(summary.totalIncome)}
          tone="income"
          icon={<ArrowDownLeft size={18} />}
        />
        <StatCard
          label="Pengeluaran"
          value={formatCurrency(summary.totalExpense)}
          tone="expense"
          icon={<ArrowUpRight size={18} />}
        />
        <StatCard
          label="Saldo Bersih"
          value={formatCurrency(summary.netBalance)}
          tone={summary.netBalance >= 0 ? "income" : "expense"}
          icon={<Wallet size={18} />}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 shadow-elevation-1">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="Cari keterangan..."
              className={`${finzoInputClass} pl-9`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5 lg:w-auto">
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className={`${finzoSelectClass} lg:w-[140px]`}
            >
              <option value="">Semua tipe</option>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className={`${finzoSelectClass} lg:w-[150px]`}
            >
              <option value="">Semua status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
              <option value="DRAFT">Draft</option>
            </select>
            <select
              value={filters.categoryId}
              onChange={(e) =>
                handleFilterChange("categoryId", e.target.value)
              }
              className={`${finzoSelectClass} lg:w-[150px]`}
            >
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDateMenu((prev) => !prev)}
                className={`${finzoSelectClass} flex items-center gap-2 text-left lg:w-[180px]`}
              >
                <CalendarDays size={14} className="shrink-0" />
                <span className="truncate">
                  {DATE_PRESETS.find((d) => d.key === datePreset)?.label ||
                    "Periode custom"}
                </span>
              </button>
              {showDateMenu && (
                <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg">
                  {DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => applyDatePreset(preset.key)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <div className="my-1 border-t border-border" />
                  <div className="space-y-1.5 p-1">
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => {
                        handleFilterChange("startDate", e.target.value);
                        setDatePreset("custom");
                      }}
                      className={finzoInputClass}
                    />
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => {
                        handleFilterChange("endDate", e.target.value);
                        setDatePreset("custom");
                      }}
                      className={finzoInputClass}
                    />
                  </div>
                </div>
              )}
            </div>
            {hasFilter && (
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    search: "",
                    type: "",
                    status: "",
                    categoryId: "",
                    startDate: "",
                    endDate: "",
                  });
                  setDatePreset("all");
                  setCurrentPage(1);
                }}
                className="inline-flex h-[42px] items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-border bg-muted/50"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-14 text-center">
          <FileSearch
            size={44}
            className="mx-auto mb-4 text-muted-foreground/60"
          />
          <p className="text-sm font-medium text-foreground">
            Tidak ada transaksi
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilter
              ? "Coba ubah filter atau periode."
              : "Catat transaksi pertama melalui tombol Input Data."}
          </p>
        </div>
      ) : (
        <FinzoList>
          {transactions.map((tx) => {
            const expanded = expandedId === tx.id;
            return (
              <div key={tx.id}>
                <FinzoListRow
                  icon={rowIconFor(tx)}
                  tone={toneFor(tx)}
                  title={tx.description || "(tanpa keterangan)"}
                  subtitle={`${formatDate(tx.date)} · ${
                    tx.unitName || "Lembaga"
                  } · ${tx.categoryName || "Tanpa kategori"}`}
                  amount={amountFor(tx)}
                  trailing={<StatusPill status={tx.status} />}
                  onClick={() => setExpandedId(expanded ? null : tx.id)}
                  actions={
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-muted-foreground transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  }
                />
                {expanded && (
                  <div className="mx-3 mb-3 rounded-xl border border-border bg-muted/40 p-3">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Status
                        </dt>
                        <dd className="mt-0.5 font-medium text-foreground">
                          {statusLabel[tx.status] || tx.status}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Referensi
                        </dt>
                        <dd className="mt-0.5 break-all font-medium text-foreground">
                          {tx.reference || "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Dicatat oleh
                        </dt>
                        <dd className="mt-0.5 truncate font-medium text-foreground">
                          {tx.createdByName || "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Saldo setelah
                        </dt>
                        <dd className="mt-0.5 font-medium text-foreground">
                          {tx.balanceAfter != null
                            ? formatCurrency(tx.balanceAfter)
                            : "-"}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                      <Link
                        href={`/dashboard/transactions/${tx.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
                      >
                        <Eye size={14} />
                        Detail
                      </Link>
                      <Link
                        href={`/dashboard/transactions/${tx.id}/edit`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
                      >
                        <Edit size={14} />
                        Edit
                      </Link>
                      <FinzoButton
                        variant="danger"
                        className="h-8 rounded-full px-3 text-xs"
                        disabled={deletingId === tx.id}
                        onClick={() => handleDelete(tx.id)}
                      >
                        <Trash2 size={14} />
                        {deletingId === tx.id ? "..." : "Hapus"}
                      </FinzoButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </FinzoList>
      )}

      {summary.pages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground">
            Menampilkan {startItem}–{endItem} dari {summary.total} transaksi
          </p>
          <div className="flex items-center gap-1">
            <FinzoButton
              variant="outline"
              className="h-9 w-9 rounded-full px-0"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={16} />
            </FinzoButton>
            <span className="min-w-[64px] text-center text-xs font-medium text-muted-foreground">
              {currentPage} / {summary.pages}
            </span>
            <FinzoButton
              variant="outline"
              className="h-9 w-9 rounded-full px-0"
              disabled={currentPage >= summary.pages}
              onClick={() => setCurrentPage((p) => p + 1)}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={16} />
            </FinzoButton>
          </div>
        </div>
      )}
    </div>
  );
}
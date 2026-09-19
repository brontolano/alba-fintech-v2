"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Eye,
  Trash2,
  Plus,
  Filter,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
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
}

interface Unit {
  id: string;
  name: string;
}

interface TransactionsResponse {
  data: Transaction[];
  summary: {
    total: number;
    totalIncome: number;
    totalExpense: number;
    totalTransfer: number;
    pages: number;
    currentPage: number;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  const typeMeta = (type: Transaction["type"]) => {
    if (type === "INCOME")
      return {
        icon: <TrendingUp size={16} />,
        tone: "income" as const,
        sign: "+",
      };
    if (type === "EXPENSE")
      return {
        icon: <TrendingDown size={16} />,
        tone: "expense" as const,
        sign: "−",
      };
    return {
      icon: <ArrowLeftRight size={16} />,
      tone: "transfer" as const,
      sign: "",
    };
  };

  const hasFilter = Object.values(filters).some(
    (v) => v !== "" && v !== undefined,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-bold tracking-[-0.04em] text-foreground">
            Transaksi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola semua transaksi keuangan
          </p>
        </div>

        <Link
          href="/dashboard/transactions/create"
          className="inline-flex h-[46px] items-center justify-center gap-2 self-start rounded-full bg-[#1bb0a6] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#17a199] active:scale-[0.99]"
        >
          <Plus size={18} />
          <span>Buat Transaksi</span>
        </Link>
      </div>

      <div className="space-y-2.5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7280]"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari deskripsi atau referensi..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="h-[46px] w-full rounded-full border border-[#e5e7eb] bg-[#f3f4f6] pl-11 pr-14 text-[15px] text-foreground outline-none transition focus:border-[#1bb0a6] focus:bg-white"
          />

          <button
            type="button"
            onClick={() => setShowDateMenu((prev) => !prev)}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#374151] shadow-sm ring-1 ring-[#e5e7eb] transition hover:bg-[#f3faf9]"
            aria-label="Pilih periode"
          >
            <CalendarDays size={18} />
          </button>
        </div>

        {showDateMenu && (
          <div className="z-20 mt-2 w-full rounded-[24px] border border-border bg-popover p-3 shadow-lg">
            <div className="space-y-1.5">
              {[
                { id: "all", label: "Semua" },
                { id: "today", label: "Hari ini" },
                { id: "7d", label: "7 hari" },
                { id: "30d", label: "30 hari" },
                { id: "90d", label: "90 hari" },
                { id: "custom", label: "Custom" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    if (preset.id === "custom") {
                      setDatePreset("custom");
                      return;
                    }
                    applyDatePreset(preset.id);
                    setShowDateMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition ${
                    datePreset === preset.id
                      ? "bg-[#eafaf7] text-[#0f766e]"
                      : "text-foreground hover:bg-muted/40"
                  }`}
                >
                  <span>{preset.label}</span>
                  {datePreset === preset.id && (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1bb0a6]" />
                  )}
                </button>
              ))}
            </div>

            {datePreset === "custom" && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Dari
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      handleFilterChange("startDate", e.target.value);
                      setDatePreset(
                        e.target.value || filters.endDate ? "custom" : "all",
                      );
                    }}
                    className="h-10 w-full rounded-full border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-[#1bb0a6]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Sampai
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      handleFilterChange("endDate", e.target.value);
                      setDatePreset(
                        filters.startDate || e.target.value ? "custom" : "all",
                      );
                    }}
                    className="h-10 w-full rounded-full border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-[#1bb0a6]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2.5">
          <div className="relative">
            <select
              value={filters.unitId}
              onChange={(e) => handleFilterChange("unitId", e.target.value)}
              className="h-[52px] w-full appearance-none rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-4 pr-10 text-[15px] text-foreground outline-none transition focus:border-[#1bb0a6] focus:bg-white"
              aria-label="Filter unit"
            >
              <option value="">Semua Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7280]"
              size={18}
            />
          </div>

          <div className="relative">
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className="h-[52px] w-full appearance-none rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-4 pr-10 text-[15px] text-foreground outline-none transition focus:border-[#1bb0a6] focus:bg-white"
              aria-label="Filter tipe"
            >
              <option value="">Semua Tipe</option>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
              <option value="TRANSFER">Transfer</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7280]"
              size={18}
            />
          </div>

          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="h-[52px] w-full appearance-none rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-4 pr-10 text-[15px] text-foreground outline-none transition focus:border-[#1bb0a6] focus:bg-white"
              aria-label="Filter status"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
              <option value="DRAFT">Draft</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7280]"
              size={18}
            />
          </div>

          <div className="relative">
            <select
              value={filters.categoryId}
              onChange={(e) => handleFilterChange("categoryId", e.target.value)}
              className="h-[52px] w-full appearance-none rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-4 pr-10 text-[15px] text-foreground outline-none transition focus:border-[#1bb0a6] focus:bg-white"
              aria-label="Filter kategori"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7280]"
              size={18}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[24px] border border-[#e5e7eb] bg-white py-12 text-center text-sm text-muted-foreground">
          Memuat data...
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-[24px] border border-[#e5e7eb] bg-white py-12 text-center text-sm text-muted-foreground">
          Tidak ada transaksi ditemukan
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const meta = typeMeta(tx.type);
            const isExpanded = expandedId === tx.id;
            const title = tx.description || tx.reference || "(tanpa deskripsi)";
            const subtitle = `${new Date(tx.date).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })} · ${tx.unitName || "-"}${tx.reference ? ` · Ref ${tx.reference}` : ""}`;

            return (
              <div
                key={tx.id}
                className="rounded-[22px] border border-[#e5e7eb] bg-white px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                      meta.tone === "income"
                        ? "bg-[#dffaf2] text-[#1bb0a6]"
                        : meta.tone === "expense"
                          ? "bg-[#ffe7e5] text-[#e35d52]"
                          : "bg-[#e6f0ff] text-[#4a7ae6]"
                    }`}
                  >
                    {meta.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-foreground">
                          {title}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {subtitle}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <p
                          className={`text-[15px] font-semibold ${
                            meta.tone === "income"
                              ? "text-[#1bb0a6]"
                              : meta.tone === "expense"
                                ? "text-[#e35d52]"
                                : "text-[#3b82f6]"
                          }`}
                        >
                          {meta.sign}
                          {formatCurrency(tx.amount)}
                        </p>
                        <StatusPill status={tx.status} />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f4f6] text-[#64748b]"
                    aria-label="Lihat detail"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 border-t border-[#eef1f4] pt-3">
                    <div className="grid gap-2 text-[12px] sm:grid-cols-2">
                      <div className="rounded-xl bg-[#f8fafc] px-2.5 py-2">
                        <div className="text-muted-foreground">Kategori</div>
                        <div className="mt-1 font-medium text-foreground">
                          {tx.categoryName || "-"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#f8fafc] px-2.5 py-2">
                        <div className="text-muted-foreground">Referensi</div>
                        <div className="mt-1 font-medium text-foreground">
                          {tx.reference || "-"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#f8fafc] px-2.5 py-2 sm:col-span-2">
                        <div className="text-muted-foreground">Keterangan</div>
                        <div className="mt-1 font-medium text-foreground">
                          {tx.description || "-"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#f8fafc] px-2.5 py-2">
                        <div className="text-muted-foreground">Dibuat oleh</div>
                        <div className="mt-1 font-medium text-foreground">
                          {tx.createdByName || "-"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#f8fafc] px-2.5 py-2">
                        <div className="text-muted-foreground">Unit</div>
                        <div className="mt-1 font-medium text-foreground">
                          {tx.unitName || "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/dashboard/transactions/${tx.id}/edit`}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#f3f4f6] text-sm font-medium text-foreground transition hover:bg-[#e7ebef]"
                      >
                        <Edit size={14} /> Edit
                      </Link>
                      <Link
                        href={`/dashboard/transactions/${tx.id}`}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#f3f4f6] text-sm font-medium text-foreground transition hover:bg-[#e7ebef]"
                      >
                        <Eye size={14} /> Detail
                      </Link>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#fdecec] px-4 text-sm font-medium text-[#d14d4d] transition hover:bg-[#fbdede]"
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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

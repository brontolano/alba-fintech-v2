"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Calendar,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  FileText,
  Scale,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import {
  SegmentedTabs,
  FinzoButton,
  StatusPill,
  StatCard,
  FinzoCard,
  FinzoList,
  FinzoListRow,
  finzoInputClass,
  finzoSelectClass,
} from "@/components/ui/finzo";

interface FinancialNote {
  id: string;
  unitId: string | null;
  unitName?: string;
  title: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  isReconciled: boolean;
  createdAt: string;
  updatedAt: string;
}

type TypeTab = "" | "INCOME" | "EXPENSE" | "TRANSFER";

export default function FinancialNotesPage() {
  const [notes, setNotes] = useState<FinancialNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeTab>("");
  const [dateFilter, setDateFilter] = useState("");
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Tutup dropdown aksi saat klik di luar
  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMenu]);

  // Fetch notes
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (unitFilter) params.set("unitId", unitFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (dateFilter) {
        params.set("startDate", dateFilter);
        params.set("endDate", dateFilter);
      }

      const res = await fetch(`/api/financial-notes?${params.toString()}`);
      const data = await res.json();
      setNotes(data.data ?? []);
    } catch (err) {
      console.error("Error fetching financial notes:", err);
      toast.error("Gagal memuat catatan keuangan");
    } finally {
      setLoading(false);
    }
  };

  // Fetch units
  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/units");
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  };

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, unitFilter, typeFilter, dateFilter]);

  useEffect(() => {
    fetchUnits();
  }, []);

  const formatCurrency = (amount: number | string) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(amount ?? 0));

  // Summary
  const totalIncome = notes.reduce(
    (sum, note) =>
      sum + (note.type === "INCOME" ? Number(note.amount ?? 0) : 0),
    0,
  );
  const totalExpense = notes.reduce(
    (sum, note) =>
      sum + (note.type === "EXPENSE" ? Number(note.amount ?? 0) : 0),
    0,
  );
  const selisih = totalIncome - totalExpense;

  const hasFilter = Boolean(search || unitFilter || typeFilter || dateFilter);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan keuangan ini?")) return;
    try {
      const res = await fetch(`/api/financial-notes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus");
      }
      toast.success("Catatan dihapus");
      setNotes(notes.filter((n) => n.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus catatan");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Catatan Keuangan Pimpinan
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Catat pemasukan dan pengeluaran langsung pimpinan
          </p>
        </div>
        <Link
          href="/dashboard/financial-notes/create"
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all self-start sm:self-auto shrink-0"
        >
          <Plus size={18} />
          <span>Buat Catatan</span>
        </Link>
      </div>

      <div className="flex w-fit items-center gap-1 rounded-full border border-border bg-muted/50 p-1">
        <Link
          href="/dashboard/transactions"
          className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-card hover:text-foreground"
        >
          Transaksi Operasional
        </Link>
        <Link
          href="/dashboard/financial-notes"
          className="rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
        >
          Catatan Keuangan
        </Link>
      </div>

      {/* Summary — kartu stat Finzo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Pemasukan"
          value={formatCurrency(totalIncome)}
          tone="income"
          icon={<TrendingUp size={15} />}
        />
        <StatCard
          label="Pengeluaran"
          value={formatCurrency(totalExpense)}
          tone="expense"
          icon={<TrendingDown size={15} />}
        />
        <StatCard
          label="Selisih"
          value={formatCurrency(selisih)}
          tone={selisih >= 0 ? "positive" : "negative"}
          icon={<Scale size={15} />}
        />
        <StatCard
          label="Total Catatan"
          value={String(notes.length)}
          tone="neutral"
          icon={<FileText size={15} />}
        />
      </div>

      {/* Filter card */}
      <FinzoCard className="p-4 space-y-3">
        {/* Segmented tab jenis — ganti select jenis (lebih visual) */}
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedTabs<TypeTab>
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "", label: "Semua" },
              { value: "INCOME", label: "Pemasukan" },
              { value: "EXPENSE", label: "Pengeluaran" },
              { value: "TRANSFER", label: "Transfer" },
            ]}
          />
          {hasFilter && (
            <button
              onClick={() => {
                setSearch("");
                setUnitFilter("");
                setTypeFilter("");
                setDateFilter("");
              }}
              className="text-sm font-medium text-destructive hover:opacity-80 transition ml-auto"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Cari catatan atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${finzoInputClass} pl-10`}
            />
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
          </div>

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className={`${finzoSelectClass} min-w-[140px] flex-none w-auto`}
            aria-label="Filter unit"
          >
            <option value="">Semua Unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>

          <div className="relative flex-none">
            <Calendar
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              size={16}
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`${finzoInputClass} pl-10 w-44`}
              aria-label="Filter tanggal"
            />
          </div>
        </div>
      </FinzoCard>

      {/* Notes Table — premium responsive finance table */}
      <FinzoCard className="overflow-hidden">
        <div className="md:hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Memuat data...
            </div>
          ) : notes.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <FileText size={28} className="mx-auto mb-2 opacity-40" />
              Tidak ada catatan keuangan
            </div>
          ) : (
            <FinzoList>
              {notes.map((note) => {
                const isMenuOpen = openMenu === note.id;
                const isExpanded = expandedId === note.id;
                const tone =
                  note.type === "INCOME"
                    ? "income"
                    : note.type === "EXPENSE"
                      ? "expense"
                      : "transfer";

                return (
                  <div key={note.id} className="relative">
                    <FinzoListRow
                      icon={<FileText size={16} />}
                      tone={tone}
                      title={note.title}
                      subtitle={`${format(new Date(note.date), "dd MMM yyyy", {
                        locale: id,
                      })} · ${note.unitName || note.unitId || "-"}`}
                      amount={`${note.type === "INCOME" ? "+" : note.type === "EXPENSE" ? "−" : ""}${formatCurrency(note.amount)}`}
                      trailing={<StatusPill status={note.status} />}
                      onClick={() => setExpandedId(isExpanded ? null : note.id)}
                      actions={
                        <div
                          className="relative inline-block"
                          ref={isMenuOpen ? menuRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenu(isMenuOpen ? null : note.id);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title="Aksi"
                            aria-label={`Aksi untuk ${note.title}`}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {isMenuOpen && (
                            <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                              <Link
                                href={`/dashboard/financial-notes/${note.id}/edit`}
                                className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
                              >
                                <Pencil size={14} />
                                Edit
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenu(null);
                                  handleDelete(note.id);
                                }}
                                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm text-destructive transition hover:bg-destructive/10"
                              >
                                <Trash2 size={14} />
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      }
                    />

                    {isExpanded && (
                      <div className="space-y-2 border-t border-border bg-muted/20 px-4 pb-4 pt-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Jenis</span>
                          <span className="font-medium text-foreground text-right">
                            {note.type === "INCOME"
                              ? "Pemasukan"
                              : note.type === "EXPENSE"
                                ? "Pengeluaran"
                                : "Transfer"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Unit</span>
                          <span className="font-medium text-foreground text-right">
                            {note.unitName || note.unitId || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">
                            Deskripsi
                          </span>
                          <span className="max-w-[58%] text-right font-medium text-foreground">
                            {note.description || "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <span className="font-medium text-foreground text-right">
                            <StatusPill status={note.status} />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </FinzoList>
          )}
        </div>

        <div className="hidden md:block">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Unit
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Judul
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Deskripsi
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Jumlah
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Memuat data...
                  </td>
                </tr>
              ) : notes.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    <FileText size={28} className="mx-auto mb-2 opacity-40" />
                    Tidak ada catatan keuangan
                  </td>
                </tr>
              ) : (
                notes.map((note) => {
                  const isMenuOpen = openMenu === note.id;
                  return (
                    <tr
                      key={note.id}
                      className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/30"
                    >
                      <td
                        className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground"
                        data-label="Tanggal"
                      >
                        {format(new Date(note.date), "dd MMM yyyy", {
                          locale: id,
                        })}
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground"
                        data-label="Unit"
                      >
                        {note.unitName || note.unitId || "-"}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-medium text-foreground"
                        data-label="Judul"
                      >
                        {note.title}
                      </td>
                      <td
                        className="max-w-[220px] px-4 py-3 text-sm text-muted-foreground"
                        data-label="Deskripsi"
                      >
                        <div className="truncate">{note.description}</div>
                      </td>
                      <td
                        className="px-4 py-3 text-right text-sm"
                        data-label="Jumlah"
                      >
                        <span
                          className={
                            note.type === "INCOME"
                              ? "font-semibold text-emerald-600"
                              : note.type === "TRANSFER"
                                ? "font-medium text-foreground"
                                : "font-semibold text-rose-600"
                          }
                        >
                          {note.type === "INCOME"
                            ? "+"
                            : note.type === "TRANSFER"
                              ? ""
                              : "-"}{" "}
                          {formatCurrency(note.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" data-label="Status">
                        <StatusPill status={note.status} />
                      </td>
                      <td className="px-4 py-3 text-center" data-label="Aksi">
                        <div
                          className="relative inline-block"
                          ref={isMenuOpen ? menuRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenu(isMenuOpen ? null : note.id)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title="Aksi"
                            aria-label={`Aksi untuk ${note.title}`}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {isMenuOpen && (
                            <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                              <Link
                                href={`/dashboard/financial-notes/${note.id}/edit`}
                                className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
                              >
                                <Pencil size={14} />
                                Edit
                              </Link>
                              <button
                                onClick={() => {
                                  setOpenMenu(null);
                                  handleDelete(note.id);
                                }}
                                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm text-destructive transition hover:bg-destructive/10"
                              >
                                <Trash2 size={14} />
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </FinzoCard>
    </div>
  );
}

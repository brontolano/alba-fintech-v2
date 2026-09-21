"use client";

import { useState, useEffect } from "react";
import { Search, CheckCircle, Clock, Download, Send } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { buildReconciliationSummary } from "@/lib/modules/reconciliation/summary";

interface Unit {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  status: string;
  unitId: string | null;
  isReconciled: boolean;
  reconciledAt: string | null;
}

import { usePageGuard } from "@/lib/use-page-guard";

export default function ReconciliationPage() {
  usePageGuard(["SUPERADMIN", "PIMPINAN", "MANAGER"]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [cashOnHandInputs, setCashOnHandInputs] = useState<
    Record<string, string>
  >({});

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

  const fetchTransactions = async () => {
    try {
      // Ambil transaksi HANYA pada tanggal rekonsiliasi yang dipilih (bukan 10 teratas)
      const params = new URLSearchParams();
      params.set("startDate", filters.date);
      params.set("endDate", filters.date);
      params.set("limit", "1000");

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat transaksi");
      const data = await res.json();
      setTransactions(data.data ?? []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchUnits(), fetchTransactions()]);
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.date]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RECONCILED":
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            Selesai
          </span>
        );
      case "PENDING":
        return (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
            Pending
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
            Draft
          </span>
        );
    }
  };

  // Saldo sistem hanya berasal dari transaksi approved pada tanggal terpilih.
  const reconciliationTasks = Array.from(
    new Set(
      transactions
        .map((t) => t.unitId)
        .filter((id): id is string => Boolean(id)),
    ),
  ).map((unitId) => {
    const unit = units.find((u) => u.id === unitId);
    const approvedTxs = transactions.filter(
      (t) => t.unitId === unitId && t.status === "APPROVED",
    );
    const income = approvedTxs
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = approvedTxs
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const systemBalance = approvedTxs.reduce((sum, t) => {
      if (t.type === "INCOME") return sum + Number(t.amount);
      if (t.type === "EXPENSE") return sum - Number(t.amount);
      return sum;
    }, 0);

    const status =
      approvedTxs.length > 0 && approvedTxs.every((t) => t.isReconciled)
        ? "RECONCILED"
        : "PENDING";

    const cashOnHand = Number(cashOnHandInputs[unitId]) || 0;
    const variance = cashOnHand - systemBalance;

    return {
      id: unitId,
      date: filters.date,
      unit: unit?.name || "Unit Tidak Dikenal",
      txCount: approvedTxs.length,
      income,
      expense,
      cashOnHand,
      systemBalance,
      variance,
      status,
    };
  });

  // Filter tasks (tanggal sudah difilter di sumber data)
  const filteredTasks = reconciliationTasks.filter((task) => {
    const matchSearch = task.unit
      .toLowerCase()
      .includes(filters.search.toLowerCase());
    const matchStatus = filters.status
      ? task.status === filters.status.toUpperCase()
      : true;
    return matchSearch && matchStatus;
  });

  const reconciliationSummary = buildReconciliationSummary(
    filteredTasks.map((task) => ({
      income: task.income,
      expense: task.expense,
      variance: task.variance,
      status: task.status,
    })),
  );

  const totalIncome = reconciliationSummary.totalIncome;
  const totalExpense = reconciliationSummary.totalExpense;
  const totalVariance = reconciliationSummary.totalVariance;
  const reconciledCount = reconciliationSummary.reconciledCount;
  const pendingCount = reconciliationSummary.pendingCount;

  const handleReconcile = async (taskId: string) => {
    const task = filteredTasks.find((t) => t.id === taskId);
    if (task && task.variance !== 0) {
      const ok = confirm(
        `Selisih ${formatCurrency(Math.abs(task.variance))} masih ada. Tetap selesaikan rekonsiliasi?`,
      );
      if (!ok) return;
    }

    try {
      const response = await fetch("/api/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: taskId, date: filters.date }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal menyimpan rekonsiliasi");
      }

      await fetchTransactions();
      toast.success("Rekonsiliasi unit berhasil disimpan");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyelesaikan rekonsiliasi");
    }
  };

  const handleHandover = async (taskId: string) => {
    const task = filteredTasks.find((t) => t.id === taskId);
    if (!task) return;

    const cashOnHand = Number(cashOnHandInputs[taskId]) || 0;
    if (cashOnHand === 0) {
      toast.error("Masukkan jumlah Cash On Hand terlebih dahulu");
      return;
    }

    const ok = confirm(
      `Serahkan kas ${task.unit} sebesar ${formatCurrency(cashOnHand)} ke pimpinan?`,
    );
    if (!ok) return;

    try {
      const response = await fetch("/api/handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: taskId,
          date: filters.date,
          cashHanded: cashOnHand,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal mengajukan serah terima");
      }

      toast.success("Serah terima kas berhasil diajukan ke pimpinan");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengajukan serah terima");
    }
  };

  const handleExportCSV = () => {
    if (filteredTasks.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const rows: string[][] = [
      [
        "Tanggal",
        "Unit",
        "Transaksi",
        "Pemasukan",
        "Pengeluaran",
        "Saldo Sistem",
        "Cash On Hand",
        "Variansi",
        "Status",
      ],
    ];

    filteredTasks.forEach((task) => {
      rows.push([
        task.date,
        task.unit,
        String(task.txCount),
        String(task.income),
        String(task.expense),
        String(task.systemBalance),
        String(task.cashOnHand),
        String(task.variance),
        task.status,
      ]);
    });

    rows.push([]);
    rows.push(["Total Pemasukan", String(totalIncome)]);
    rows.push(["Total Pengeluaran", String(totalExpense)]);
    rows.push(["Total Variansi", String(totalVariance)]);
    rows.push(["Selesai", String(reconciledCount)]);
    rows.push(["Pending", String(pendingCount)]);

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekonsiliasi-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diunduh");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Rekonsiliasi Keuangan
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Rekonsiliasi harian per unit
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted sm:self-auto"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari unit..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="w-full rounded-full border border-border bg-background px-4 py-2.5 pl-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="reconciled">Selesai</option>
          </select>

          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2.5 text-sm text-foreground">
            <Clock size={16} className="text-muted-foreground" />
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="bg-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          Memuat data rekonsiliasi...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Total Unit
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {filteredTasks.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Selesai
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                {reconciledCount}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Perlu Rekon
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                {pendingCount}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Selisih
              </p>
              <p
                className={`mt-2 text-lg font-bold tracking-tight ${totalVariance >= 0 ? "text-rose-600" : "text-emerald-600"}`}
              >
                {formatCurrency(Math.abs(totalVariance))}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="md:hidden">
              {filteredTasks.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Tidak ada data rekonsiliasi ditemukan
                </div>
              ) : (
                <div className="space-y-3 p-3">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-[18px] border border-border bg-card/80 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {task.unit}
                          </div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            {format(new Date(task.date), "dd MMM yyyy", {
                              locale: id,
                            })}
                          </div>
                        </div>
                        <span className="text-sm">
                          {getStatusBadge(task.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Pemasukan
                          </div>
                          <div className="mt-1 font-medium text-emerald-600">
                            {formatCurrency(task.income)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Pengeluaran
                          </div>
                          <div className="mt-1 font-medium text-rose-600">
                            {formatCurrency(task.expense)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Sistem
                          </div>
                          <div className="mt-1 text-foreground">
                            {formatCurrency(task.systemBalance)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            Selisih
                          </div>
                          <div
                            className={`mt-1 font-medium ${
                              task.variance === 0
                                ? "text-foreground"
                                : task.variance > 0
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                            }`}
                          >
                            {task.variance !== 0 &&
                              (task.variance > 0 ? "+ " : "- ")}
                            {formatCurrency(Math.abs(task.variance))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 p-2">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Cash On Hand
                        </span>
                        <input
                          type="number"
                          value={cashOnHandInputs[task.id] ?? ""}
                          onChange={(e) =>
                            setCashOnHandInputs({
                              ...cashOnHandInputs,
                              [task.id]: e.target.value,
                            })
                          }
                          className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                          placeholder="0"
                        />
                      </div>

                      {task.status === "PENDING" && (
                        <button
                          onClick={() => handleReconcile(task.id)}
                          className="flex h-9 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <CheckCircle size={16} />
                          Selesaikan
                        </button>
                      )}
                      {task.status === "RECONCILED" && (
                        <button
                          onClick={() => handleHandover(task.id)}
                          className="flex h-9 w-full items-center justify-center gap-2 rounded-full bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary/90"
                        >
                          <Send size={16} />
                          Serahkan ke Pimpinan
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Pemasukan
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Pengeluaran
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Sistem
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Cash On Hand
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Selisih
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
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        Tidak ada data rekonsiliasi ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr
                        key={task.id}
                        className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                      >
                        <td
                          className="px-4 py-3 text-sm text-muted-foreground"
                          data-label="Tanggal"
                        >
                          {format(new Date(task.date), "dd MMM yyyy", {
                            locale: id,
                          })}
                        </td>
                        <td className="px-4 py-3" data-label="Unit">
                          <span className="text-sm font-medium text-primary">
                            {task.unit}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-right text-sm text-emerald-600"
                          data-label="Pemasukan"
                        >
                          {formatCurrency(task.income)}
                        </td>
                        <td
                          className="px-4 py-3 text-right text-sm text-rose-600"
                          data-label="Pengeluaran"
                        >
                          {formatCurrency(task.expense)}
                        </td>
                        <td
                          className="px-4 py-3 text-right text-sm text-muted-foreground"
                          data-label="Sistem"
                        >
                          {formatCurrency(task.systemBalance)}
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          data-label="Cash On Hand"
                        >
                          <input
                            type="number"
                            value={cashOnHandInputs[task.id] ?? ""}
                            onChange={(e) =>
                              setCashOnHandInputs({
                                ...cashOnHandInputs,
                                [task.id]: e.target.value,
                              })
                            }
                            className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                            placeholder="0"
                          />
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          data-label="Selisih"
                        >
                          <span
                            className={`text-sm font-medium ${
                              task.variance === 0
                                ? "text-foreground"
                                : task.variance > 0
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                            }`}
                          >
                            {task.variance !== 0 &&
                              (task.variance > 0 ? "+ " : "- ")}
                            {formatCurrency(Math.abs(task.variance))}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-center"
                          data-label="Status"
                        >
                          {getStatusBadge(task.status)}
                        </td>
                        <td className="px-4 py-3 text-center" data-label="Aksi">
                          {task.status === "PENDING" && (
                            <button
                              onClick={() => handleReconcile(task.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 transition hover:bg-emerald-50"
                              title="Selesaikan Rekonsiliasi"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          {task.status === "RECONCILED" && (
                            <button
                              onClick={() => handleHandover(task.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-primary transition hover:bg-primary/10"
                              title="Serahkan ke Pimpinan"
                            >
                              <Send size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

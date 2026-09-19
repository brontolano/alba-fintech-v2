"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Calendar,
  PieChart as PieChartIcon,
  FileText as FileTextIcon,
  Download as DownloadIcon,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
} from "lucide-react";
import { BarChart } from "@/components/charts/BarChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { FinzoList, FinzoListRow, StatusPill } from "@/components/ui/finzo";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface MonthlyDataItem {
  month: string;
  income: number;
  expense: number;
  transfer: number;
}

interface UnitDistributionItem {
  id: string;
  name: string;
  income: number;
  expense: number;
  percentage: number;
}

interface TypeDistribution {
  income: number;
  expense: number;
  transfer: number;
}

interface StatCards {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitRatio: number;
}

interface LembagaSummary {
  income: number;
  expense: number;
  net: number;
  count: number;
}

interface ReportsResponse {
  data: {
    monthlyData: MonthlyDataItem[];
    unitDistributionData: UnitDistributionItem[];
    typeDistribution: TypeDistribution;
    lembagaSummary?: LembagaSummary;
    statCards: StatCards;
    summary: {
      totalTransactions: number;
      totalUnits: number;
      period: string;
    };
  };
}

interface Unit {
  id: string;
  name: string;
}

interface ReportTransaction {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  description: string;
  reference?: string;
  status: string;
  unitName?: string;
  categoryName?: string;
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const [reportData, setReportData] = useState<ReportsResponse["data"] | null>(
    null,
  );
  const [transactions, setTransactions] = useState<ReportTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filters, setFilters] = useState({
    period: "6months",
    unitId: "",
  });

  // Set default unit filter for MANAGER/STAFF
  useEffect(() => {
    if (session?.user?.role === "MANAGER" || session?.user?.role === "STAFF") {
      if (session?.user?.unitId) {
        setFilters((prev) => ({ ...prev, unitId: session.user.unitId || "" }));
      }
    }
  }, [session]);

  const getDateRangeForPeriod = (period: string) => {
    const end = new Date();
    const start = new Date(end);

    switch (period) {
      case "daily":
        start.setDate(end.getDate() - 7);
        break;
      case "weekly":
        start.setDate(end.getDate() - 30);
        break;
      case "monthly":
        start.setMonth(end.getMonth() - 6);
        break;
      case "6months":
        start.setMonth(end.getMonth() - 6);
        break;
      case "12months":
        start.setFullYear(end.getFullYear() - 1);
        break;
      case "year":
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setMonth(end.getMonth() - 6);
        break;
    }

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("period", filters.period);
      if (filters.unitId) params.set("unitId", filters.unitId);

      const res = await fetch(`/api/reports/aggregations?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memuat laporan");
      }
      const data: ReportsResponse = await res.json();
      setReportData(data.data);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const range = getDateRangeForPeriod(filters.period);
      const params = new URLSearchParams({
        limit: "20",
        status: "APPROVED",
        startDate: range.startDate,
        endDate: range.endDate,
      });

      if (filters.unitId) params.set("unitId", filters.unitId);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memuat transaksi laporan");
      }

      const data = await res.json();
      const list = (data.data ?? []).map((tx: any) => ({
        id: tx.id,
        date: tx.date,
        type: tx.type,
        amount: Number(tx.amount ?? 0),
        description: tx.description || tx.reference || "Transaksi",
        reference: tx.reference,
        status: tx.status,
        unitName: tx.unitName || tx.units?.name || "-",
        categoryName: tx.categoryName || "Umum",
      }));

      setTransactions(list);
    } catch (err: any) {
      console.error("Error fetching report transactions:", err);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

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

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    fetchReportData();
    fetchTransactions();
  }, [filters]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  // Build chart data from API response
  const monthlyChartData = reportData
    ? {
        labels: reportData.monthlyData.map((m) => {
          const [year, month, dayOrWeek] = m.month.split("-");
          if (dayOrWeek) {
            const date = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(dayOrWeek),
            );
            return date.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            });
          }
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return date.toLocaleDateString("id-ID", { month: "short" });
        }),
        datasets: [
          {
            label: "Pemasukan",
            data: reportData.monthlyData.map((m) => m.income),
            backgroundColor: "rgba(34, 197, 94, 0.6)",
            borderColor: "rgb(34, 197, 94)",
            borderWidth: 1,
          },
          {
            label: "Pengeluaran",
            data: reportData.monthlyData.map((m) => m.expense),
            backgroundColor: "rgba(239, 68, 68, 0.6)",
            borderColor: "rgb(239, 68, 68)",
            borderWidth: 1,
          },
        ],
      }
    : { labels: [], datasets: [] };

  const unitDistributionChartData = reportData
    ? {
        labels: reportData.unitDistributionData.map((u) => u.name),
        datasets: [
          {
            data: reportData.unitDistributionData.map((u) => u.income),
            backgroundColor: [
              "rgba(16, 185, 129, 0.7)",
              "rgba(139, 92, 246, 0.7)",
              "rgba(249, 115, 22, 0.7)",
              "rgba(6, 182, 219, 0.7)",
              "rgba(251, 113, 131, 0.7)",
              "rgba(147, 51, 234, 0.7)",
            ],
            borderColor: [
              "rgb(16, 185, 129)",
              "rgb(139, 92, 246)",
              "rgb(249, 115, 22)",
              "rgb(6, 182, 219)",
              "rgb(251, 113, 131)",
              "rgb(147, 51, 234)",
            ],
            borderWidth: 1,
          },
        ],
      }
    : { labels: [], datasets: [] };

  const statCards = reportData
    ? [
        {
          title: "Total Pemasukan",
          value: formatCurrency(reportData.statCards.totalIncome),
          change: "",
          icon: <TrendingUp className="w-6 h-6 text-green-600" />,
          bgColor: "bg-green-100",
        },
        {
          title: "Total Pengeluaran",
          value: formatCurrency(reportData.statCards.totalExpense),
          change: "",
          icon: <TrendingDown className="w-6 h-6 text-red-600" />,
          bgColor: "bg-red-100",
        },
        {
          title: "Laba Bersih",
          value: formatCurrency(reportData.statCards.netProfit),
          change: "",
          icon: <PieChartIcon className="w-6 h-6 text-emerald-600" />,
          bgColor: "bg-emerald-100",
        },
        {
          title: "Rasio Profit",
          value: `${reportData.statCards.profitRatio}%`,
          change: "",
          icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
          bgColor: "bg-blue-100",
        },
      ]
    : [];

  const selectedUnitName = filters.unitId
    ? units.find((unit) => unit.id === filters.unitId)?.name || "Unit terpilih"
    : "Semua Unit";

  const transactionTone = (type: string) => {
    if (type === "INCOME") return "income" as const;
    if (type === "EXPENSE") return "expense" as const;
    return "transfer" as const;
  };

  const buildReportPdf = () => {
    if (!reportData) return null;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const d = reportData;
    const now = new Date();
    const margin = 14;

    doc.setProperties({
      title: `Laporan Keuangan ALBA Finance - ${periodLabel}`,
      subject: "Laporan keuangan resmi",
      author: "ALBA Finance",
      creator: "ALBA Finance",
    });

    // Official report header and selected filter metadata.
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 210, 8, "F");
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ALBA FINANCE", margin, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Pondok Pesantren Al-Basyariyah", margin, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("LAPORAN KEUANGAN", 105, 20, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Financial Statements Report", 105, 26, { align: "center" });
    doc.text(`Periode: ${periodLabel}`, 196, 20, { align: "right" });
    doc.text(`Cakupan: ${selectedUnitName}`, 196, 26, { align: "right" });
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, 31, 196, 31);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("RINGKASAN KEUANGAN", margin, 40);

    autoTable(doc, {
      startY: 44,
      head: [["Indikator", "Nilai"]],
      body: [
        ["Total Pemasukan", formatCurrency(d.statCards.totalIncome)],
        ["Total Pengeluaran", formatCurrency(d.statCards.totalExpense)],
        ["Laba Bersih", formatCurrency(d.statCards.netProfit)],
        ["Rasio Profit", `${d.statCards.profitRatio}%`],
        ["Jumlah Transaksi", String(d.summary.totalTransactions)],
        ["Jumlah Unit", String(d.summary.totalUnits)],
      ],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 92 },
        1: { halign: "right", cellWidth: 90 },
      },
      margin: { left: margin, right: margin },
    });

    let nextY = ((doc as any).lastAutoTable?.finalY || 80) + 10;
    if (d.lembagaSummary && d.lembagaSummary.count > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("RINGKASAN TRANSAKSI LEMBAGA", margin, nextY);
      autoTable(doc, {
        startY: nextY + 4,
        head: [["Pemasukan", "Pengeluaran", "Selisih", "Transaksi"]],
        body: [
          [
            formatCurrency(d.lembagaSummary.income),
            formatCurrency(d.lembagaSummary.expense),
            formatCurrency(d.lembagaSummary.net),
            String(d.lembagaSummary.count),
          ],
        ],
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3, halign: "right" },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });
      nextY = ((doc as any).lastAutoTable?.finalY || nextY + 20) + 10;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("REKAPITULASI PERIODE", margin, nextY);
    autoTable(doc, {
      startY: nextY + 4,
      head: [["Periode", "Pemasukan", "Pengeluaran", "Transfer"]],
      body: d.monthlyData.length
        ? d.monthlyData.map((item) => [
            item.month,
            formatCurrency(item.income),
            formatCurrency(item.expense),
            formatCurrency(item.transfer || 0),
          ])
        : [["-", "-", "-", "-"]],
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 2.8 },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
      margin: { left: margin, right: margin },
    });

    nextY = ((doc as any).lastAutoTable?.finalY || nextY + 25) + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DISTRIBUSI BERDASARKAN UNIT", margin, nextY);
    autoTable(doc, {
      startY: nextY + 4,
      head: [["Unit", "Pemasukan", "Pengeluaran", "Laba/Rugi", "Porsi"]],
      body: d.unitDistributionData.length
        ? d.unitDistributionData.map((unit) => [
            unit.name,
            formatCurrency(unit.income),
            formatCurrency(unit.expense),
            formatCurrency(unit.income - unit.expense),
            `${unit.percentage}%`,
          ])
        : [["Tidak ada data", "-", "-", "-", "-"]],
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2.8 },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      margin: { left: margin, right: margin },
    });

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, 285, 196, 285);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Dicetak ${format(now, "dd MMMM yyyy HH:mm", { locale: id })} · Halaman ${page}/${pageCount}`,
        margin,
        291,
      );
      doc.text("ALBA Finance · Dokumen resmi laporan keuangan", 196, 291, {
        align: "right",
      });
    }

    return doc;
  };

  const handleExportPDF = () => {
    const doc = buildReportPdf();
    if (!doc) return;
    doc.save(
      `laporan-keuangan-${filters.period}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`,
    );
    toast.success("PDF laporan resmi berhasil dibuat");
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    const rows: string[][] = [];

    // Section 1: Unit Distribution
    rows.push(["=== Distribusi Unit ==="]);
    rows.push(["Unit ID", "Nama", "Pemasukan", "Pengeluaran", "Persentase"]);
    reportData.unitDistributionData.forEach((u) => {
      rows.push([
        u.id,
        u.name,
        String(u.income),
        String(u.expense),
        `${u.percentage}%`,
      ]);
    });

    // Section 2: Monthly Data
    rows.push([]);
    rows.push(["=== Data Bulanan ==="]);
    rows.push(["Bulan", "Pemasukan", "Pengeluaran", "Transfer"]);
    reportData.monthlyData.forEach((m) => {
      rows.push([
        m.month,
        String(m.income),
        String(m.expense),
        String(m.transfer || 0),
      ]);
    });

    // Section 3: Summary
    rows.push([]);
    rows.push(["=== Ringkasan ==="]);
    rows.push([
      "Total Transaksi",
      String(reportData.summary.totalTransactions),
    ]);
    rows.push(["Total Unit", String(reportData.summary.totalUnits)]);
    rows.push(["Periode", reportData.summary.period]);

    const csvContent = rows.map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-keuangan-${filters.period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Label periode yang dipilih (untuk judul dokumen cetak/PDF)
  const periodLabels: Record<string, string> = {
    daily: "Harian (7 hari terakhir)",
    weekly: "Mingguan (4 minggu terakhir)",
    monthly: "Bulanan (6 bulan terakhir)",
    "6months": "6 Bulan Terakhir",
    "12months": "12 Bulan Terakhir",
    year: "1 Tahun Terakhir",
  };
  const periodLabel = periodLabels[filters.period] ?? filters.period;

  const handlePrint = () => {
    const doc = buildReportPdf();
    if (!doc) {
      toast.error("Data laporan belum siap");
      return;
    }

    (doc as any).autoPrint({ variant: "non-conform" });
    const pdfUrl = doc.output("bloburl");
    const printWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");
    if (!printWindow) {
      doc.save(
        `laporan-keuangan-${filters.period}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`,
      );
      toast.info("PDF dibuat. Izinkan popup browser untuk mencetak langsung.");
      return;
    }
    toast.success("Dokumen laporan siap dicetak");
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Laporan Keuangan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analisis dan laporan keuangan mendetail
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            <FileTextIcon size={16} />
            <span>Cetak Laporan</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            <FileTextIcon size={16} />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            <DownloadIcon size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-muted-foreground" />
            <div className="flex-1">
              <select
                value={filters.period}
                onChange={(e) =>
                  setFilters({ ...filters, period: e.target.value })
                }
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="daily">Harian (7 hari)</option>
                <option value="weekly">Mingguan (4 minggu)</option>
                <option value="monthly">Bulanan (6 bulan)</option>
                <option value="6months">6 Bulan Terakhir</option>
                <option value="12months">12 Bulan Terakhir</option>
              </select>
            </div>
          </div>

          <select
            value={filters.unitId}
            onChange={(e) => setFilters({ ...filters, unitId: e.target.value })}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Semua Unit</option>
            {units
              .filter((unit) => !unit.name.endsWith("(Lembaga)"))
              .map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Memuat data laporan...
        </div>
      ) : !reportData ? (
        <div className="py-12 text-center text-muted-foreground">
          Tidak ada data laporan tersedia
        </div>
      ) : (
        <>
          {/* Ringkasan compact: 2 kolom mobile / 4 kolom desktop */}
          <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {statCards.map((stat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.bgColor}`}
                >
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="truncate text-sm font-bold text-foreground sm:text-base">
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Info periode ringkas */}
          <p className="mb-4 text-xs text-muted-foreground">
            {reportData.summary.totalTransactions} transaksi ·{" "}
            {reportData.summary.totalUnits} unit · Periode: {periodLabel}
          </p>

          {/* Baris Transaksi Lembaga (pisah dari unit) */}
          {reportData.lembagaSummary && reportData.lembagaSummary.count > 0 && (
            <div className="mb-4 rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  🏛️ Transaksi Lembaga (Pimpinan)
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {reportData.lembagaSummary.count} transaksi
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Pemasukan
                  </p>
                  <p className="text-sm font-bold text-income">
                    {formatCurrency(reportData.lembagaSummary.income)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Pengeluaran
                  </p>
                  <p className="text-sm font-bold text-expense">
                    {formatCurrency(reportData.lembagaSummary.expense)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Selisih
                  </p>
                  <p
                    className={`text-sm font-bold ${reportData.lembagaSummary.net >= 0 ? "text-income" : "text-expense"}`}
                  >
                    {formatCurrency(reportData.lembagaSummary.net)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Bar Chart */}
            <div className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Tren Pemasukan vs Pengeluaran
                </h2>
                <select
                  value={filters.period}
                  onChange={(e) =>
                    setFilters({ ...filters, period: e.target.value })
                  }
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="6months">6 Bulan Terakhir</option>
                  <option value="12months">12 Bulan Terakhir</option>
                </select>
              </div>
              <div className="h-64">
                <BarChart
                  data={monthlyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "top",
                      },
                    },
                    scales: {
                      y: {
                        ticks: {
                          callback: (value: any) => {
                            return formatCurrency(value as number);
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Doughnut Chart */}
            <div className="rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Distribusi Pemasukan per Unit
                </h2>
              </div>
              <div className="h-64">
                <DoughnutChart
                  data={unitDistributionChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: {
                          usePointStyle: true,
                          padding: 12,
                          boxWidth: 8,
                          font: { size: 11 },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Detailed Transaction List */}
          <div className="overflow-hidden rounded-[22px] border border-border bg-card/90 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Detail transaksi
                </p>
                <h2 className="text-lg font-semibold text-foreground">
                  {filters.unitId ? "Transaksi Unit" : "Transaksi"}
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                {transactions.length} data
              </div>
            </div>

            {transactionsLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Memuat transaksi...
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Tidak ada transaksi pada periode dan filter yang dipilih.
                </p>
              </div>
            ) : (
              <FinzoList className="border-0 divide-y-0">
                {transactions.map((tx) => {
                  const isIncome = tx.type === "INCOME";
                  const amountPrefix = isIncome
                    ? "+"
                    : tx.type === "TRANSFER"
                      ? "→"
                      : "-";
                  const isExpanded = expandedId === tx.id;

                  return (
                    <div
                      key={tx.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <FinzoListRow
                        icon={
                          isIncome ? (
                            <ArrowUpRight size={15} />
                          ) : tx.type === "TRANSFER" ? (
                            <ArrowDownRight size={15} />
                          ) : (
                            <ArrowDownRight size={15} />
                          )
                        }
                        tone={transactionTone(tx.type)}
                        title={tx.description || tx.reference || "Transaksi"}
                        subtitle={`${format(new Date(tx.date), "dd MMM yyyy", { locale: id })} · ${tx.unitName || "-"} · ${tx.categoryName || "Umum"}`}
                        amount={`${amountPrefix} ${formatCurrency(tx.amount)}`}
                        trailing={<StatusPill status={tx.status} />}
                        onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                        actions={
                          <ChevronDown
                            size={16}
                            className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        }
                      />

                      {isExpanded && (
                        <div className="space-y-2 border-t border-border bg-muted/20 px-4 pb-4 pt-3">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">
                              Kategori
                            </span>
                            <span className="font-medium text-foreground text-right">
                              {tx.categoryName || "-"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">
                              Referensi
                            </span>
                            <span className="font-medium text-foreground text-right">
                              {tx.reference || "-"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">Unit</span>
                            <span className="font-medium text-foreground text-right">
                              {tx.unitName || "-"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">
                              Status
                            </span>
                            <span className="font-medium text-foreground text-right">
                              <StatusPill status={tx.status} />
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
        </>
      )}
    </div>
  );
}

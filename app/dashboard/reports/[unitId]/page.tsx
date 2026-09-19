"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText as FileTextIcon,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend as LegendJS,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  LegendJS,
);

interface UnitInfo {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface ReportData {
  monthlyData: { month: string; income: number; expense: number }[];
  statCards: {
    income: number;
    expense: number;
    netProfit: number;
    profitRatio: number;
  };
  summary: { totalTransactions: number; totalUnits: number; period: string };
}

interface Transaction {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  description: string;
  category: { name: string; code: string } | null;
  status: string;
}

export default function UnitReportPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{
    unitId: string;
  } | null>(null);
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const unitId = resolvedParams?.unitId;

  useEffect(() => {
    if (!unitId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch report aggregations (API membungkus hasil di key `data`)
        const res = await fetch(`/api/reports/aggregations?unitId=${unitId}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Gagal memuat laporan");
        const reportData = await res.json();
        const d = reportData.data ?? reportData;
        setReport({
          monthlyData: d.monthlyData || [],
          statCards: d.statCards,
          summary: d.summary,
        });

        // Fetch unit info (fetch all units, filter client-side)
        const unitRes = await fetch("/api/units", {
          headers: { "Content-Type": "application/json" },
        });
        if (unitRes.ok) {
          const unitData = await unitRes.json();
          const found = unitData.data?.find((u: any) => u.id === unitId);
          if (found) {
            setUnit({
              id: found.id,
              name: found.name,
              code: found.code,
              type: found.type || "UMUM",
            });
          }
        }

        // Fetch recent transactions for this unit
        const txRes = await fetch(
          `/api/transactions?unitId=${unitId}&limit=50`,
          { headers: { "Content-Type": "application/json" } },
        );
        if (txRes.ok) {
          const txData = await txRes.json();
          const txs =
            txData.data?.map((t: any) => ({
              id: t.id,
              date: t.date,
              type: t.type,
              amount: Number(t.amount),
              description: t.description,
              category: t.categoryName
                ? { name: t.categoryName, code: "" }
                : null,
              status: t.status,
            })) || [];
          setTransactions(txs);
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal memuat laporan");
        router.push("/dashboard/reports");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [unitId, router]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);

  /** Cetak/PDF: dokumen berisi data periode terpilih (bukan print layar). */
  const handlePrintPdf = () => {
    if (!report || !unit) return;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 14;

    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 210, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("ALBA FINANCE", margin, 7);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text(`Laporan Unit ${unit.name}`, 105, 22, { align: "center" });
    doc.setFontSize(9);
    doc.text(
      `Kode: ${unit.code} · Tipe: ${unit.type} · Dicetak: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: idLocale })}`,
      105,
      28,
      { align: "center" },
    );

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Ringkasan", margin, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Total Transaksi : ${report.summary.totalTransactions}`,
      margin,
      48,
    );
    doc.text(
      `Total Pemasukan : ${formatCurrency(report.statCards.income)}`,
      margin,
      54,
    );
    doc.text(
      `Total Pengeluaran : ${formatCurrency(report.statCards.expense)}`,
      margin,
      60,
    );
    doc.text(
      `Laba Bersih : ${formatCurrency(report.statCards.netProfit)} (margin ${report.statCards.profitRatio}%)`,
      margin,
      66,
    );

    autoTable(doc, {
      startY: 72,
      head: [["Periode", "Pemasukan", "Pengeluaran"]],
      body: report.monthlyData.map((m) => [
        m.month,
        formatCurrency(m.income),
        formatCurrency(m.expense),
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY
        ? (doc as any).lastAutoTable.finalY + 8
        : 120,
      head: [["Tanggal", "Deskripsi", "Kategori", "Jumlah", "Status"]],
      body:
        transactions.length === 0
          ? [["-", "Tidak ada transaksi", "-", "-", "-"]]
          : transactions.map((tx) => [
              new Date(tx.date).toLocaleDateString("id-ID"),
              tx.description.slice(0, 50),
              tx.category?.name || "-",
              `${tx.type === "INCOME" ? "+" : "-"} ${formatCurrency(tx.amount)}`,
              tx.status,
            ]),
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    });

    try {
      const pdfUrl = doc.output("bloburl");
      const printWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");
      if (printWindow) {
        printWindow.focus();
        toast.success("Dokumen laporan unit siap dicetak");
        return;
      }
    } catch {
      // fallback below
    }

    doc.save(`laporan-${unit.code}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
    toast.success("Dokumen laporan unit berhasil dibuat");
  };

  const exportCSV = () => {
    if (!report || !unit) return;
    const rows = [
      ["Laporan Unit", unit.name],
      ["Total Transaksi", report.summary.totalTransactions.toString()],
      ["Total Pemasukan", formatCurrency(report.statCards.income)],
      ["Total Pengeluaran", formatCurrency(report.statCards.expense)],
      ["Net Profit", formatCurrency(report.statCards.netProfit)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${unit.code}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !resolvedParams) {
    return (
      <div className="p-6">
        <div className="py-12 text-center text-muted-foreground">
          Memuat laporan...
        </div>
      </div>
    );
  }

  if (!report || !unit) {
    return (
      <div className="p-6">
        <div className="py-12 text-center text-muted-foreground">
          Laporan tidak ditemukan
        </div>
      </div>
    );
  }

  const netColor =
    report.statCards.netProfit >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/reports")}
            className="rounded-xl border border-border bg-card p-2 text-foreground transition hover:bg-muted"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Laporan {unit.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Unit: {unit.code} ({unit.type})
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            <FileTextIcon size={16} />
            <span>Cetak / PDF</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            <Download size={16} />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Ringkasan Unit
            </p>
            <h2 className="text-lg font-semibold text-foreground">
              {unit.name}
            </h2>
          </div>
          <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {report.summary.period}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-background/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Transaksi
            </p>
            <p className="text-base font-bold text-foreground sm:text-xl">
              {report.summary.totalTransactions}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Pemasukan
            </p>
            <p className="text-base font-bold text-income sm:text-xl">
              {formatCurrency(report.statCards.income)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Pengeluaran
            </p>
            <p className="text-base font-bold text-expense sm:text-xl">
              {formatCurrency(report.statCards.expense)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Laba Bersih
            </p>
            <p className={`text-base font-bold sm:text-xl ${netColor}`}>
              {formatCurrency(report.statCards.netProfit)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Margin: {report.statCards.profitRatio}%
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-lg font-semibold text-foreground">
            Tren Bulanan
          </h2>
          <span className="text-xs text-muted-foreground">
            Periode {report.summary.period}
          </span>
        </div>
        <div className="h-64 sm:h-72">
          <Bar
            data={{
              labels: report.monthlyData.map((m) => m.month),
              datasets: [
                {
                  label: "Pemasukan",
                  data: report.monthlyData.map((m) => m.income),
                  backgroundColor: "#10b984",
                },
                {
                  label: "Pengeluaran",
                  data: report.monthlyData.map((m) => m.expense),
                  backgroundColor: "#ef4444",
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: "top", labels: { usePointStyle: true } },
                title: { display: false },
              },
            }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-border bg-card/90 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <div className="border-b border-border p-6 pb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Transaksi Terkait
          </h2>
        </div>
        {/* Mobile: card list */}
        <div className="md:hidden">
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Tidak ada transaksi
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx) => {
                const isIncome = tx.type === "INCOME";
                const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
                const statusClass =
                  tx.status === "APPROVED"
                    ? "bg-emerald-100 text-emerald-700"
                    : tx.status === "PENDING"
                      ? "bg-amber-100 text-amber-700"
                      : tx.status === "REJECTED"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-700";

                return (
                  <div key={tx.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          isIncome
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-rose-100 text-rose-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {tx.description}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {new Date(tx.date).toLocaleDateString("id-ID")} ·{" "}
                              {tx.category?.name || "Umum"}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}
                          >
                            {tx.status}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                            Jumlah
                          </span>
                          <span
                            className={`text-sm font-semibold ${isIncome ? "text-green-600" : "text-red-600"}`}
                          >
                            {isIncome ? "+" : "-"} {formatCurrency(tx.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Desktop: tabel normal */}
        <div className="hidden md:block">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Deskripsi
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Kategori
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Jumlah
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((tx) => {
                const isIncome = tx.type === "INCOME";
                const statusClass =
                  tx.status === "APPROVED"
                    ? "bg-emerald-100 text-emerald-700"
                    : tx.status === "PENDING"
                      ? "bg-amber-100 text-amber-700"
                      : tx.status === "REJECTED"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-700";

                return (
                  <tr
                    key={tx.id}
                    className="border-b border-border transition-colors hover:bg-muted/40"
                  >
                    <td
                      className="px-4 py-3 text-sm text-foreground"
                      data-label="Tanggal"
                    >
                      {new Date(tx.date).toLocaleDateString("id-ID")}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-foreground"
                      data-label="Deskripsi"
                    >
                      {tx.description}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-muted-foreground"
                      data-label="Kategori"
                    >
                      {tx.category?.name || "-"}
                    </td>
                    <td className="py-3 px-4 text-right" data-label="Jumlah">
                      <span
                        className={`font-semibold ${isIncome ? "text-green-600" : "text-red-600"}`}
                      >
                        {isIncome ? "+" : "-"} {formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center" data-label="Status">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}
                      >
                        {tx.status === "APPROVED" && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {tx.status === "PENDING" && (
                          <Clock3 className="h-3 w-3" />
                        )}
                        {tx.status === "REJECTED" && (
                          <XCircle className="h-3 w-3" />
                        )}
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="hidden p-8 text-center text-muted-foreground md:block">
              Tidak ada transaksi
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

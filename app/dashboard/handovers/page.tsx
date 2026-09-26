"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { usePageGuard } from "@/lib/use-page-guard";
import { CheckCircle, XCircle, Clock, Printer } from "lucide-react";
import { printData, escapeHtml } from "@/lib/print";

interface Handover {
  id: string;
  date: string;
  totalIncome: number;
  totalExpense: number;
  systemBalance: number;
  cashHanded: number;
  variance: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  submittedById: string;
  submittedAt: string;
  acceptedById: string | null;
  acceptedAt: string | null;
  note: string | null;
  units: { id: string; name: string };
  submittedBy: { id: string; name: string };
  acceptedBy: { id: string; name: string } | null;
}

export default function HandoversPage() {
  usePageGuard(["SUPERADMIN", "PIMPINAN", "MANAGER"]);
  const { data: session } = useSession();
  // Terima/Tolak hanya pimpinan (manager pantau status serah terimanya)
  const canDecide =
    session?.user?.role === "SUPERADMIN" ||
    session?.user?.role === "PIMPINAN";
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const fetchHandovers = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.date) params.set("date", filters.date);

      const res = await fetch(`/api/handovers?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat data");
      const data = await res.json();
      setHandovers(data.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data serah terima");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandovers();
  }, [filters.status, filters.date]);

  const handleAccept = async (id: string) => {
    const ok = confirm("Setujui serah terima kas ini?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/handovers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACCEPTED" }),
      });
      if (!res.ok) throw new Error("Gagal menerima");
      toast.success("Serah terima kas diterima");
      fetchHandovers();
    } catch (err: any) {
      toast.error(err.message || "Gagal menerima serah terima");
    }
  };

  const handleReject = async (id: string) => {
    const note = prompt("Alasan penolakan (opsional):");
    if (note === null) return;

    try {
      const res = await fetch(`/api/handovers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", note }),
      });
      if (!res.ok) throw new Error("Gagal menolak");
      toast.success("Serah terima kas ditolak");
      fetchHandovers();
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak serah terima");
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const statusLabel = (status: string) =>
    status === "ACCEPTED" ? "Diterima" : status === "REJECTED" ? "Ditolak" : "Pending";

  const handlePrint = (h: Handover) => {
    const bodyHtml = `
      <div class="site-header">
        <h1>ALBA FINANCE</h1>
        <p class="sub">Pondok Pesantren Al-Basyariyah · Berita Acara Serah Terima Kas</p>
      </div>
      <h2>Serah Terima Kas Harian</h2>
      <p class="sub">Unit: ${escapeHtml(h.units.name)}</p>
      <p class="sub">Tanggal: ${escapeHtml(format(new Date(h.date), "dd MMMM yyyy", { locale: id }))}</p>
      <p class="sub">Diserahkan oleh: ${escapeHtml(h.submittedBy.name)} ${h.submittedAt ? `(${escapeHtml(format(new Date(h.submittedAt), "dd MMMM yyyy HH:mm", { locale: id }))})` : ""}</p>
      <p class="sub">Diterima oleh: ${h.acceptedBy ? escapeHtml(h.acceptedBy.name) : "—"}${h.acceptedAt ? ` (${escapeHtml(format(new Date(h.acceptedAt), "dd MMMM yyyy HH:mm", { locale: id }))})` : ""}</p>
      <p class="sub">Status: ${escapeHtml(statusLabel(h.status))}</p>
      <table>
        <tbody>
          <tr><td>Pemasukan Sistem</td><td class="num">${escapeHtml(formatCurrency(h.totalIncome))}</td></tr>
          <tr><td>Pengeluaran Sistem</td><td class="num">${escapeHtml(formatCurrency(h.totalExpense))}</td></tr>
          <tr class="total"><td>Saldo Sistem</td><td class="num">${escapeHtml(formatCurrency(h.systemBalance))}</td></tr>
          <tr class="total"><td>Kas Diserahkan</td><td class="num">${escapeHtml(formatCurrency(h.cashHanded))}</td></tr>
          <tr><td>Selisih</td><td class="num">${h.variance !== 0 && (h.variance > 0 ? "+" : "- ")}${escapeHtml(formatCurrency(Math.abs(h.variance)))}</td></tr>
        </tbody>
      </table>
      ${h.note ? `<p class="sub">Catatan: ${escapeHtml(h.note)}</p>` : ""}
      <div style="margin-top:40px; display:flex; gap:48px;">
        <div style="flex:1; text-align:center;">
          <p>Penanggung Jawab (Kasir),</p>
          <div style="height:72px;"></div>
          <p><b>${escapeHtml(h.submittedBy.name)}</b></p>
        </div>
        <div style="flex:1; text-align:center;">
          <p>Pimpinan,</p>
          <div style="height:72px;"></div>
          <p><b>${h.acceptedBy ? escapeHtml(h.acceptedBy.name) : "_____________"}</b></p>
        </div>
      </div>
      <p class="footer">Dokumen ini dihasilkan otomatis oleh ALBA Finance</p>
    `;
    printData(`Serah Terima Kas — ${h.units.name}`, bodyHtml);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle size={12} />
            Diterima
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
            <XCircle size={12} />
            Ditolak
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
            <Clock size={12} />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const pendingCount = handovers.filter((h) => h.status === "PENDING").length;
  const acceptedCount = handovers.filter((h) => h.status === "ACCEPTED").length;
  const rejectedCount = handovers.filter((h) => h.status === "REJECTED").length;
  const totalHanded = handovers
    .filter((h) => h.status === "ACCEPTED")
    .reduce((sum, h) => sum + Number(h.cashHanded), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Serah Terima Kas Harian
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Review dan terima serah terima kas dari unit
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Menunggu
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Diterima
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{acceptedCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Ditolak
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-600">{rejectedCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Total Diterima
          </p>
          <p className="mt-2 text-lg font-bold text-foreground">
            {formatCurrency(totalHanded)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="">Semua Status</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Diterima</option>
            <option value="REJECTED">Ditolak</option>
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
          Memuat data serah terima...
        </div>
      ) : handovers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          Tidak ada data serah terima kas untuk filter ini
        </div>
      ) : (
        <div className="space-y-3">
          {handovers.map((h) => (
            <div
              key={h.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {h.units.name}
                    </span>
                    {getStatusBadge(h.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(h.date), "dd MMMM yyyy", { locale: id })} &middot; Diserahkan oleh{" "}
                    {h.submittedBy.name}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handlePrint(h)}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                    title="Cetak berita acara serah terima"
                  >
                    <Printer size={14} />
                    Cetak
                  </button>

                  {h.status === "PENDING" &&
                    (canDecide ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(h.id)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <CheckCircle size={14} />
                          Terima
                        </button>
                        <button
                          onClick={() => handleReject(h.id)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                        >
                          <XCircle size={14} />
                          Tolak
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Menunggu pimpinan
                      </span>
                    ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Pemasukan Sistem
                  </p>
                  <p className="mt-0.5 font-medium text-emerald-600">
                    {formatCurrency(h.totalIncome)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Pengeluaran Sistem
                  </p>
                  <p className="mt-0.5 font-medium text-rose-600">
                    {formatCurrency(h.totalExpense)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Saldo Sistem
                  </p>
                  <p className="mt-0.5 font-medium text-foreground">
                    {formatCurrency(h.systemBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Kas Diserahkan
                  </p>
                  <p className="mt-0.5 font-medium text-primary">
                    {formatCurrency(h.cashHanded)}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Selisih:{" "}
                  <span
                    className={
                      h.variance === 0
                        ? "text-foreground"
                        : h.variance > 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                    }
                  >
                    {h.variance !== 0 && (h.variance > 0 ? "+" : "- ")}
                    {formatCurrency(Math.abs(h.variance))}
                  </span>
                </span>
                {h.note && <span>Catatan: {h.note}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

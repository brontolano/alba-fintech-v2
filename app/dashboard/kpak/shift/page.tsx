"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Users,
  FileText,
  Check,
  Loader2,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePageGuard } from "@/lib/use-page-guard";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const fmtTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtDuration = (min: number | null) => {
  if (min == null) return "berjalan";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} jam ${m} mnt` : `${m} mnt`;
};

const serviceLabel = (s?: string | null) =>
  s === "KEUANGAN" ? "Keuangan" : s === "TABUNGAN" ? "Tabungan" : "—";

interface Attendance {
  id: string;
  userId: string;
  checkInAt: string;
  checkOutAt?: string | null;
  service?: string | null;
  user?: { id: string; name: string; role: string };
}

interface CrewMember {
  id: string;
  name: string;
  role: string;
  attendance: Attendance | null;
}

interface HistoryRow {
  id: string;
  date: string;
  service?: string | null;
  checkInAt: string;
  checkOutAt?: string | null;
  durationMin: number | null;
  txCount: number;
}

interface ShiftReport {
  id: string;
  userId: string;
  cashIncomeCounted: number | string;
  cashExpenseCounted: number | string;
  note?: string | null;
  status: string;
  submittedAt: string;
  staff: { id: string; name: string; role: string };
  reviewer?: { id: string; name: string } | null;
  system: { income: number; expense: number; savingsIn: number; savingsOut: number };
}

export default function KpakShiftPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      ((u?.role === "MANAGER" || u?.role === "STAFF") &&
        u?.unitIsRetail !== true),
  });

  const { data: session } = useSession();
  const role = session?.user?.role;
  const canReview =
    role === "SUPERADMIN" || role === "PIMPINAN" || role === "MANAGER";

  const [tab, setTab] = useState<"saya" | "kru">("saya");
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<Attendance | null>(null);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [nowWib, setNowWib] = useState("");
  const [acting, setActing] = useState(false);
  const [service, setService] = useState<"TABUNGAN" | "KEUANGAN">("TABUNGAN");
  const [tick, setTick] = useState(0);

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [repNote, setRepNote] = useState("");
  const [repSaving, setRepSaving] = useState(false);

  const fetchShift = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kpak/shift");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat shift");
      setMine(json.data.mine);
      setCrew(json.data.crew || []);
      setNowWib(json.data.nowWib || "");
      if (json.data.mine?.service) setService(json.data.mine.service);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/kpak/shift?history=1");
      const json = await res.json();
      if (res.ok) setHistory(json.data.history || []);
    } catch {
      // abaikan — log opsional
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/kpak/shift-reports");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat laporan");
      setReports(json.data.reports || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShift();
    fetchHistory();
    fetchReports();
  }, [fetchShift, fetchHistory, fetchReports]);

  // Stopwatch: tick tiap detik saat shift aktif
  useEffect(() => {
    if (!mine || mine.checkOutAt) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [mine]);

  const liveSeconds =
    mine && !mine.checkOutAt
      ? Math.max(0, Math.floor((Date.now() - new Date(mine.checkInAt).getTime()) / 1000)) +
        tick * 0
      : 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  const liveStr = `${pad(Math.floor(liveSeconds / 3600))}:${pad(Math.floor((liveSeconds % 3600) / 60))}:${pad(liveSeconds % 60)}`;

  const shiftOn = !!mine && !mine.checkOutAt;

  const opStatus =
    !nowWib || nowWib < "08:00"
      ? "Belum jam operasional"
      : nowWib <= "16:00"
        ? "Jam operasional (08:00–16:00)"
        : nowWib <= "17:00"
          ? "Waktu pelaporan (s/d 17:00)"
          : "Shift selesai";

  const router = useRouter();

  // Satu ketuk: check-in + langsung diantar ke halaman layanannya.
  // Check-out: tetap di sini (menu menyesuaikan otomatis).
  const doCheck = async (
    action: "check-in" | "check-out",
    svc: "TABUNGAN" | "KEUANGAN" = service,
  ) => {
    setActing(true);
    try {
      const res = await fetch("/api/kpak/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, service: svc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      if (action === "check-in") {
        setService(svc);
        toast.success("Check-in tercatat — selamat bertugas");
        fetchShift();
        fetchHistory();
        router.push(
          svc === "TABUNGAN" ? "/dashboard/savings" : "/dashboard/kpak/finance",
        );
      } else {
        toast.success("Check-out tercatat — terima kasih");
        fetchShift();
        fetchHistory();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActing(false);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepSaving(true);
    try {
      const res = await fetch("/api/kpak/shift-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: repNote.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim laporan");
      toast.success("Laporan shift terkirim ke manager");
      setRepNote("");
      fetchReports();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRepSaving(false);
    }
  };

  const acceptReport = async (id: string) => {
    try {
      const res = await fetch("/api/kpak/shift-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success("Laporan diterima");
      fetchReports();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const myReport = reports.find((r) => r.userId === session?.user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shift Saya</h1>
        <p className="text-sm text-muted-foreground">
          Operasional KPAK 08:00–16:00 WIB · laporan s/d 17:00
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("saya")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "saya"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/70"
          }`}
        >
          Shift Saya
        </button>
        <button
          onClick={() => setTab("kru")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "kru"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/70"
          }`}
        >
          Kru & Laporan
        </button>
      </div>

      {tab === "saya" ? (
        <>
          {/* Header info operasional */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <h2 className="text-sm font-semibold">Operasional KPAK</h2>
            </div>
            <p className="mt-2 text-2xl font-bold">08:00 – 16:00 WIB</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {opStatus}
              {nowWib ? ` · sekarang ${nowWib} WIB` : ""}
            </p>
          </div>

          {/* Mulai shift: 1 ketuk = pilih layanan + check-in + antar */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">
              {shiftOn ? "Shift berjalan" : "Mulai shift hari ini"}
            </h2>
            {loading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                <Loader2 size={16} className="mx-auto animate-spin" />
              </p>
            ) : !shiftOn ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => doCheck("check-in", "TABUNGAN")}
                  disabled={acting}
                  className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center transition-colors hover:border-primary disabled:opacity-50"
                >
                  <LogIn size={20} className="mx-auto mb-1 text-primary" />
                  <p className="text-sm font-bold">Tabungan</p>
                  <p className="text-[11px] text-muted-foreground">
                    Setor / tarik
                  </p>
                </button>
                <button
                  onClick={() => doCheck("check-in", "KEUANGAN")}
                  disabled={acting}
                  className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center transition-colors hover:border-primary disabled:opacity-50"
                >
                  <LogIn size={20} className="mx-auto mb-1 text-primary" />
                  <p className="text-sm font-bold">Keuangan</p>
                  <p className="text-[11px] text-muted-foreground">
                    HER, daful, internal
                  </p>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <Timer size={16} /> {liveStr}
                </p>
                <button
                  onClick={() => doCheck("check-out")}
                  disabled={acting}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {acting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LogOut size={16} />
                  )}
                  Check-out
                </button>
              </div>
            )}
            {shiftOn && (
              <p className="mt-2 text-xs text-muted-foreground">
                Masuk {fmtTime(mine?.checkInAt)} · layanan{" "}
                {serviceLabel(mine?.service)}
              </p>
            )}
          </div>

          {/* Log tabel */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Log Shift Saya</h2>
            {history.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada riwayat shift
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Tanggal</th>
                      <th className="py-2 pr-3 font-medium">Durasi</th>
                      <th className="py-2 pr-3 font-medium">Layanan</th>
                      <th className="py-2 text-right font-medium">Transaksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-3">{fmtDate(h.date)}</td>
                        <td className="py-2.5 pr-3">
                          {fmtDuration(h.durationMin)}
                        </td>
                        <td className="py-2.5 pr-3">
                          {serviceLabel(h.service)}
                        </td>
                        <td className="py-2.5 text-right font-medium">
                          {h.txCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Kru hari ini */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users size={15} /> Kru Bertugas ({crew.filter((c) => c.attendance).length}/
              {crew.length})
            </h2>
            {crew.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada petugas unit
              </p>
            ) : (
              <div className="divide-y">
                {crew.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.role}
                        {c.attendance?.service
                          ? ` · ${serviceLabel(c.attendance.service)}`
                          : ""}
                      </p>
                    </div>
                    {c.attendance ? (
                      <p className="text-xs">
                        <span className="font-medium text-emerald-600">
                          {fmtTime(c.attendance.checkInAt)}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          –{" "}
                          {c.attendance.checkOutAt
                            ? fmtTime(c.attendance.checkOutAt)
                            : "bertugas"}
                        </span>
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Belum check-in
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Laporan shift */}
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <form
              onSubmit={submitReport}
              className="space-y-4 rounded-xl border bg-card p-5"
            >
              <h2 className="text-sm font-semibold">
                Laporan Saya (otomatis)
              </h2>
              <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                Angka dihitung otomatis dari transaksimu hari ini. Cukup
                kirim.
              </p>
              {myReport && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Masuk</p>
                    <p className="font-semibold text-emerald-600">
                      {formatCurrency(Number(myReport.cashIncomeCounted || 0))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Keluar</p>
                    <p className="font-semibold text-rose-600">
                      {formatCurrency(Number(myReport.cashExpenseCounted || 0))}
                    </p>
                  </div>
                </div>
              )}
              {myReport?.status === "ACCEPTED" && (
                <p className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                  Laporan hari ini sudah diterima manager.
                </p>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium">
                  Catatan serah terima (opsional)
                </label>
                <textarea
                  value={repNote}
                  onChange={(e) => setRepNote(e.target.value)}
                  rows={2}
                  placeholder="Contoh: laci diserahkan + kunci..."
                  className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm"
                />
              </div>
              <button
                disabled={repSaving}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {repSaving ? "Mengirim..." : "Buat & Kirim Laporan Otomatis"}
              </button>
            </form>

            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold">
                Laporan Masuk Hari Ini
              </h2>
              {reportsLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  <Loader2 size={16} className="mx-auto animate-spin" />
                </p>
              ) : reports.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Belum ada laporan masuk
                </p>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{r.staff.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Masuk {formatCurrency(Number(r.cashIncomeCounted))} ·
                            Keluar{" "}
                            {formatCurrency(Number(r.cashExpenseCounted))}
                            {r.reviewer && ` · diterima ${r.reviewer.name}`}
                          </p>
                          {r.note && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              “{r.note}”
                            </p>
                          )}
                        </div>
                        {r.status === "ACCEPTED" ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600">
                            <Check size={12} /> Diterima
                          </span>
                        ) : canReview ? (
                          <button
                            onClick={() => acceptReport(r.id)}
                            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                          >
                            Terima
                          </button>
                        ) : (
                          <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-600">
                            Menunggu
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

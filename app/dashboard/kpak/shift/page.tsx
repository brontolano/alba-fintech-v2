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
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
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

interface Attendance {
  id: string;
  userId: string;
  checkInAt: string;
  checkOutAt?: string | null;
  late: boolean;
  user?: { id: string; name: string; role: string };
}

interface CrewMember {
  id: string;
  name: string;
  role: string;
  attendance: Attendance | null;
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

  const [tab, setTab] = useState<"absensi" | "laporan">("absensi");
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<Attendance | null>(null);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [nowWib, setNowWib] = useState("");
  const [acting, setActing] = useState(false);

  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [repForm, setRepForm] = useState({ income: "", expense: "", note: "" });
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
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
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
    fetchReports();
  }, [fetchShift, fetchReports]);

  const shiftState = !mine
    ? "none"
    : !mine.checkOutAt
      ? "active"
      : "done";

  const opStatus =
    !nowWib || nowWib < "08:00"
      ? { label: "Belum jam operasional", tone: "muted" }
      : nowWib <= "16:00"
        ? { label: "Jam operasional (08:00–16:00)", tone: "ok" }
        : nowWib <= "17:00"
          ? { label: "Waktu pelaporan staff (s/d 17:00)", tone: "warn" }
          : { label: "Shift selesai", tone: "muted" };

  const doCheck = async (action: "check-in" | "check-out") => {
    setActing(true);
    try {
      const res = await fetch("/api/kpak/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast.success(
        action === "check-in"
          ? json.data.late
            ? "Check-in tercatat (telat)"
            : "Check-in tercatat — selamat bertugas"
          : "Check-out tercatat — terima kasih",
      );
      fetchShift();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActing(false);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const ci = Number(repForm.income);
    const ce = Number(repForm.expense);
    if (isNaN(ci) || isNaN(ce) || ci < 0 || ce < 0) {
      toast.error("Nominal harus angka ≥ 0");
      return;
    }
    setRepSaving(true);
    try {
      const res = await fetch("/api/kpak/shift-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashIncomeCounted: ci,
          cashExpenseCounted: ce,
          note: repForm.note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim laporan");
      toast.success(
        json.data?.late
          ? "Laporan terkirim (melewati 17:00)"
          : "Laporan shift terkirim ke manager",
      );
      setRepForm({ income: "", expense: "", note: "" });
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
        <h1 className="text-2xl font-bold">Shift Petugas</h1>
        <p className="text-sm text-muted-foreground">
          Absensi shift 08:00–16:00 · laporan staff ke manager s/d 17:00
        </p>
      </div>

      {/* Status operasional + saya */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">Status Shift Saya</h2>
          </div>
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              <Loader2 size={16} className="mx-auto animate-spin" />
            </p>
          ) : shiftState === "none" ? (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground">
                Belum check-in hari ini.
              </p>
              <button
                onClick={() => doCheck("check-in")}
                disabled={acting}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {acting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <LogIn size={16} />
                )}
                Check-in Sekarang
              </button>
            </div>
          ) : shiftState === "active" ? (
            <div className="mt-3">
              <p className="text-sm">
                Bertugas sejak{" "}
                <span className="font-semibold">{fmtTime(mine?.checkInAt)}</span>{" "}
                {mine?.late && (
                  <span className="ml-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
                    Telat
                  </span>
                )}
              </p>
              <button
                onClick={() => doCheck("check-out")}
                disabled={acting}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {acting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <LogOut size={16} />
                )}
                Check-out
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Selesai: {fmtTime(mine?.checkInAt)} – {fmtTime(mine?.checkOutAt)}
            </p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">Jam Operasional KPAK</h2>
          <p className="mt-2 text-2xl font-bold">08:00 – 16:00 WIB</p>
          <p
            className={`mt-1 text-sm ${
              opStatus.tone === "ok"
                ? "text-emerald-600"
                : opStatus.tone === "warn"
                  ? "text-amber-600"
                  : "text-muted-foreground"
            }`}
          >
            {opStatus.label}
            {nowWib ? ` · sekarang ${nowWib} WIB` : ""}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Alur: check-in → operasional → staff lapor ke manager (s/d 17:00)
            → manager lapor + setor ke pimpinan.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("absensi")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "absensi"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/70"
          }`}
        >
          <Users size={15} /> Kru Hari Ini
        </button>
        <button
          onClick={() => setTab("laporan")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "laporan"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/70"
          }`}
        >
          <FileText size={15} /> Laporan Shift
        </button>
      </div>

      {tab === "absensi" ? (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">
            Kru Bertugas ({crew.filter((c) => c.attendance).length}/{crew.length})
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
                    <p className="text-xs text-muted-foreground">{c.role}</p>
                  </div>
                  {c.attendance ? (
                    <p className="text-xs">
                      <span className="font-medium text-emerald-600">
                        {fmtTime(c.attendance.checkInAt)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        – {fmtTime(c.attendance.checkOutAt) || "bertugas"}
                      </span>
                      {c.attendance.late && (
                        <span className="ml-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600">
                          Telat
                        </span>
                      )}
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
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <form
            onSubmit={submitReport}
            className="space-y-4 rounded-xl border bg-card p-5"
          >
            <h2 className="text-sm font-semibold">
              Laporan Kas Saya (s/d 17:00)
            </h2>
            {myReport?.status === "ACCEPTED" && (
              <p className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                Laporan hari ini sudah diterima manager — terkunci.
              </p>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium">
                Uang masuk terhitung (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={repForm.income}
                onChange={(e) =>
                  setRepForm({ ...repForm, income: e.target.value })
                }
                placeholder="Hitung fisik kas masuk"
                disabled={myReport?.status === "ACCEPTED"}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Uang keluar terhitung (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={repForm.expense}
                onChange={(e) =>
                  setRepForm({ ...repForm, expense: e.target.value })
                }
                placeholder="Hitung fisik kas keluar"
                disabled={myReport?.status === "ACCEPTED"}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Catatan</label>
              <textarea
                value={repForm.note}
                onChange={(e) =>
                  setRepForm({ ...repForm, note: e.target.value })
                }
                rows={2}
                placeholder="Catatan serah terima..."
                disabled={myReport?.status === "ACCEPTED"}
                className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <button
              disabled={repSaving || myReport?.status === "ACCEPTED"}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {repSaving ? "Mengirim..." : "Kirim Laporan ke Manager"}
            </button>
          </form>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Laporan Masuk Hari Ini</h2>
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
                {reports.map((r) => {
                  const sysIn = r.system.income + r.system.savingsIn;
                  const sysOut = r.system.expense + r.system.savingsOut;
                  const dIn = Number(r.cashIncomeCounted) - sysIn;
                  const dOut = Number(r.cashExpenseCounted) - sysOut;
                  const ok = dIn === 0 && dOut === 0;
                  return (
                    <div key={r.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{r.staff.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.submittedAt).toLocaleTimeString(
                              "id-ID",
                              { hour: "2-digit", minute: "2-digit" },
                            )}{" "}
                            WIB
                            {r.reviewer && ` · diterima ${r.reviewer.name}`}
                          </p>
                        </div>
                        {r.status === "ACCEPTED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600">
                            <Check size={12} /> Diterima
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-600">
                            Menunggu
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded bg-muted/60 p-2">
                          <p className="text-muted-foreground">Masuk: hitung</p>
                          <p className="font-semibold">
                            {formatCurrency(Number(r.cashIncomeCounted))}
                          </p>
                          <p className="text-muted-foreground">
                            sistem {formatCurrency(sysIn)}
                          </p>
                        </div>
                        <div className="rounded bg-muted/60 p-2">
                          <p className="text-muted-foreground">Keluar: hitung</p>
                          <p className="font-semibold">
                            {formatCurrency(Number(r.cashExpenseCounted))}
                          </p>
                          <p className="text-muted-foreground">
                            sistem {formatCurrency(sysOut)}
                          </p>
                        </div>
                      </div>
                      {!ok && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle size={12} />
                          Selisih masuk {formatCurrency(Math.abs(dIn))} · keluar{" "}
                          {formatCurrency(Math.abs(dOut))}
                        </p>
                      )}
                      {r.note && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          “{r.note}”
                        </p>
                      )}
                      {canReview && r.status !== "ACCEPTED" && (
                        <button
                          onClick={() => acceptReport(r.id)}
                          className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                        >
                          Terima Laporan
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

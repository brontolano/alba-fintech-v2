"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  CircleAlert,
  Wallet,
  Landmark,
  PiggyBank,
  ClipboardCheck,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { usePageGuard } from "@/lib/use-page-guard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

/**
 * Fase 2 Manager KPAK — Wizard "Tutup Hari".
 * 3 langkah terpandu: Cek Sistem → Hitung Fisik → Selesai & Serah Terima.
 * POST /api/kpak/reconcile otomatis membuat serah terima untuk pimpinan.
 *
 * FILE BARU (di luar permukaan beku staff — lihat docs/KPAK-STAFF-FREEZE.md).
 * Khusus hari ini (tanpa pilih tanggal) agar sederhana.
 */

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface Preview {
  date: string;
  kasIn: number;
  kasOut: number;
  savIn: number;
  savOut: number;
  bankIn: number;
  bankOut: number;
  totalIncome: number;
  totalExpense: number;
  expected: number;
  txCount: number;
  savingsCount: number;
  existingHandover?: { id: string; status: string; cashHanded: number | string } | null;
}

const STEPS = ["Cek Sistem", "Hitung Fisik", "Selesai"];

export default function CloseDayPage() {
  // Manager KPAK (+ SUPERADMIN/PIMPINAN untuk pengawasan). Retail tidak masuk.
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      (u?.role === "MANAGER" && u?.unitIsRetail !== true),
  });

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [cashCounted, setCashCounted] = useState("");
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState(false);
  const [handoverStatus, setHandoverStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayLocal();
      const [prevRes, hoRes] = await Promise.all([
        fetch(`/api/kpak/reconcile?date=${today}`).catch(() => null),
        fetch(`/api/handovers?date=${today}`).catch(() => null),
      ]);
      if (prevRes && prevRes.ok) {
        const j = await prevRes.json();
        const p: Preview = j.data;
        setPreview({
          ...p,
          kasIn: Number(p.kasIn || 0),
          kasOut: Number(p.kasOut || 0),
          savIn: Number(p.savIn || 0),
          savOut: Number(p.savOut || 0),
          bankIn: Number(p.bankIn || 0),
          bankOut: Number(p.bankOut || 0),
          totalIncome: Number(p.totalIncome || 0),
          totalExpense: Number(p.totalExpense || 0),
          expected: Number(p.expected || 0),
        });
        if (p.existingHandover) {
          setDone(true);
          setHandoverStatus(p.existingHandover.status);
          setStep(2);
        }
      } else {
        setPreview(null);
      }
      if (hoRes && hoRes.ok) {
        const j = await hoRes.json();
        const list: any[] = j.data || [];
        if (list.length > 0) setHandoverStatus(list[0].status);
      }
    } catch {
      toast.error("Gagal memuat angka sistem");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const variance =
    preview && cashCounted !== "" ? Number(cashCounted) - preview.expected : null;

  const doClose = async () => {
    if (cashCounted === "" || Number(cashCounted) < 0 || Number.isNaN(Number(cashCounted))) {
      toast.error("Isi hitung fisik laci dulu (angka ≥ 0)");
      return;
    }
    if (!confirm(`Tutup hari ini dengan kas fisik ${formatCurrency(Number(cashCounted))}?`))
      return;
    setClosing(true);
    try {
      const res = await fetch("/api/kpak/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayLocal(), cashCounted: Number(cashCounted) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Gagal menutup hari");
      setDone(true);
      setHandoverStatus("PENDING");
      setStep(2);
      setCashCounted("");
      toast.success("Hari ditutup — serah terima dibuat untuk pimpinan");
    } catch (e: any) {
      toast.error(e.message || "Gagal menutup hari");
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Memuat angka sistem...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-24 md:pb-8">
      <DashboardHeader title="Tutup Hari" subtitle="Rekonsiliasi laci lalu serah terima ke pimpinan" />

      {/* Indikator langkah */}
      <ol className="flex items-center gap-1">
        {STEPS.map((label, i) => {
          const active = i === step;
          const passed = i < step || done;
          return (
            <li key={label} className="flex flex-1 items-center gap-1 last:flex-none">
              <div className="flex flex-1 flex-col items-center gap-1">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    passed
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {passed ? <CheckCircle2 size={16} /> : i + 1}
                </span>
                <span
                  className={`text-[10px] font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mb-5 h-0.5 flex-1 rounded ${i < step || done ? "bg-emerald-500" : "bg-border"}`} />
              )}
            </li>
          );
        })}
      </ol>

      {/* Langkah 1: cek sistem */}
      {step === 0 && !done && (
        <div className="space-y-3">
          {!preview ? (
            <p className="rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              Angka sistem tidak tersedia.{" "}
              <button type="button" onClick={load} className="font-semibold text-primary">
                Muat ulang
              </button>
            </p>
          ) : (
            <>
              <div className="rounded-[22px] border border-border bg-card/90 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Wallet size={13} /> Laci fisik (tunai)
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-emerald-500/10 p-2.5">
                    <p className="text-[11px] text-muted-foreground">Masuk</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(preview.kasIn + preview.savIn)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-500/10 p-2.5">
                    <p className="text-[11px] text-muted-foreground">Keluar</p>
                    <p className="font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(preview.kasOut + preview.savOut)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 rounded-xl bg-primary/10 p-3 text-center">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Laci seharusnya berisi
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(preview.expected)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {preview.txCount} layanan • {preview.savingsCount} transaksi tabungan
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <Landmark size={14} className="mt-0.5 shrink-0" />
                <p>
                  Bank terpisah dan tidak dihitung di laci: masuk{" "}
                  {formatCurrency(preview.bankIn)} • keluar {formatCurrency(preview.bankOut)}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[0.98]"
              >
                Lanjut hitung fisik <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Langkah 2: hitung fisik */}
      {step === 1 && !done && preview && (
        <div className="space-y-3">
          <div className="rounded-[22px] border border-border bg-card/90 p-4">
            <label
              htmlFor="cashCounted"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              <PiggyBank size={13} /> Uang fisik di laci saat ini
            </label>
            <input
              id="cashCounted"
              type="number"
              min={0}
              inputMode="numeric"
              value={cashCounted}
              onChange={(e) => setCashCounted(e.target.value)}
              placeholder="Contoh: 1500000"
              className="mt-2 h-14 w-full rounded-2xl border border-border bg-background px-4 text-2xl font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {variance !== null && (
              <p
                className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  variance === 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                {variance === 0 ? (
                  <>
                    <CheckCircle2 size={13} /> Pas — tidak ada selisih
                  </>
                ) : (
                  <>
                    <CircleAlert size={13} /> Selisih {formatCurrency(variance)}
                  </>
                )}
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Sistem mengharapkan {formatCurrency(preview.expected)}. Hitung semua lembar &
              koin di laci, bank tidak ikut.
            </p>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <ChevronLeft size={16} /> Kembali
            </button>
            <button
              type="button"
              onClick={doClose}
              disabled={closing}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {closing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ClipboardCheck size={16} />
              )}
              {closing ? "Menutup..." : "Tutup Hari Ini"}
            </button>
          </div>
        </div>
      )}

      {/* Langkah 3: selesai */}
      {step === 2 && done && (
        <div className="space-y-3">
          <div className="rounded-[22px] border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
            <PartyPopper className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-2 text-base font-bold text-foreground">Hari ini sudah ditutup</p>
            <p className="text-sm text-muted-foreground">
              Serah terima kas terkirim ke pimpinan — status:{" "}
              <span className="font-semibold text-foreground">
                {handoverStatus === "ACCEPTED"
                  ? "Diterima"
                  : handoverStatus === "REJECTED"
                    ? "Ditolak — periksa halaman serah terima"
                    : "Menunggu pimpinan"}
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/dashboard/handovers"
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Pantau Serah Terima
            </Link>
            <Link
              href="/dashboard/kpak/workflow"
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Kembali ke Pusat Kerja
            </Link>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw size={12} /> Muat ulang status
          </button>
        </div>
      )}
    </div>
  );
}

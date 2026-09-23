"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  LogIn,
  LogOut,
  Clock,
  ArrowLeft,
  Loader2,
  Check,
  Store,
  Boxes,
} from "lucide-react";

const WIB = 7 * 3600 * 1000;
const wibNow = () =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(new Date());

export default function RetailShiftPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [clock, setClock] = useState(wibNow());
  const [shift, setShift] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const t = setInterval(() => setClock(wibNow()), 1000);
    loadData();
    return () => clearInterval(t);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/shift?history=1");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memuat shift");
      setShift(body.data?.mine ?? null);
      setHistory(body.data?.history ?? []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const post = async (body: any) => {
    setActing(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal");
      await loadData();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setActing(false);
    }
  };

  const isOn = !!shift && !shift.checkOutAt;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <span className="text-xs text-muted-foreground">{clock}</span>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold">Shift Retail</h1>
        <p className="text-sm text-muted-foreground">
          {session?.user?.name}
        </p>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">
          {err}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 size={20} className="mx-auto animate-spin" />
        </div>
      ) : (
        <>
          {/* Status sekarang */}
          <div
            className={`rounded-2xl border p-5 text-center ${
              isOn
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-amber-500/40 bg-amber-500/10"
            }`}
          >
            {isOn ? (
              <>
                <p className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Shift aktif
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {shift.service === "INVENTORY" ? "Inventori" : "Kasir POS"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Check-in {new Date(shift.checkInAt).toLocaleTimeString("id-ID")}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() =>
                      post({ action: "set-service", service: "POS" })
                    }
                    disabled={acting || shift.service === "POS"}
                    className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium hover:border-primary/50 disabled:opacity-50"
                  >
                    <Store size={15} /> {shift.service === "POS" && <Check size={14} />}
                    Kasir POS
                  </button>
                  <button
                    onClick={() =>
                      post({ action: "set-service", service: "INVENTORY" })
                    }
                    disabled={acting || shift.service === "INVENTORY"}
                    className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium hover:border-primary/50 disabled:opacity-50"
                  >
                    <Boxes size={15} />
                    {shift.service === "INVENTORY" && <Check size={14} />}
                    Inventori
                  </button>
                  <button
                    onClick={() => post({ action: "check-out" })}
                    disabled={acting}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {acting ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                    Check-out
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Belum check-in
                </p>
                <p className="mt-1 text-lg font-semibold text-muted-foreground">
                  Buka shift untuk mulai melayani
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => post({ action: "check-in", service: "POS" })}
                    disabled={acting}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {acting ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
                    Check-in Kasir
                  </button>
                  <button
                    onClick={() =>
                      post({ action: "check-in", service: "INVENTORY" })
                    }
                    disabled={acting}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {acting ? <Loader2 size={15} className="animate-spin" /> : <Boxes size={15} />}
                    Check-in Inventori
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Riwayat 14 hari */}
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Clock size={15} /> Riwayat Shift (14 hari)
            </h2>
            {history.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                Belum ada riwayat
              </p>
            ) : (
              <div className="divide-y">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {new Date(h.checkInAt).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {h.service === "INVENTORY" ? "Inventori" : "Kasir"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.checkInAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {h.checkOutAt
                          ? ` — ${new Date(h.checkOutAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                          : " (berjalan)"}
                        {h.durationMin != null && ` · ${Math.round(h.durationMin)} mnt`}
                        {h.txCount != null && ` · ${h.txCount} trx`}
                      </p>
                    </div>
                    {!h.checkOutAt && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                        aktif
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
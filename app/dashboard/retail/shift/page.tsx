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
  Store,
  Boxes,
  Wallet,
  LockOpen,
  Lock,
  AlertTriangle,
} from "lucide-react";

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const fmtTime = (v: string | null | undefined) => {
  if (!v) return "-";
  return new Date(v).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDur = (min: number | null | undefined) => {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
};

const wibNow = () =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(new Date());

type Segment = {
  id: string;
  service: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  durationMin: number | null;
  running: boolean;
};

type PosOpen = {
  id: string;
  openedAt: string;
  openingCash: number;
  expectedCash: number;
  txCount: number;
  txTotal: number;
};

export default function RetailShiftPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [clock, setClock] = useState(wibNow());

  const [shift, setShift] = useState<any>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [totalActiveMin, setTotalActiveMin] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  const [pos, setPos] = useState<PosOpen | null>(null);
  const [openingCash, setOpeningCash] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [closeResult, setCloseResult] = useState<any>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(wibNow()), 1000);
    loadData();
    return () => clearInterval(t);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [hRes, pRes] = await Promise.all([
        fetch("/api/retail/shift?history=1"),
        fetch("/api/retail/pos-session"),
      ]);
      const hBody = await hRes.json();
      if (!hRes.ok) throw new Error(hBody.error || "Gagal memuat shift");
      const pBody = await pRes.json();
      if (!pRes.ok) throw new Error(pBody.error || "Gagal memuat sesi POS");
      setShift(hBody.data?.history?.[0] ?? null);
      setSegments(hBody.data?.today?.segments ?? []);
      setTotalActiveMin(hBody.data?.today?.totalActiveMin ?? 0);
      setHistory(hBody.data?.history ?? []);
      setPos(pBody.data?.open ?? null);
      setCloseResult(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const post = async (body: any) => {
    setActing(true);
    setErr(null);
    setMsg(null);
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

  const postPos = async (body: any) => {
    setActing(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/retail/pos-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal");
      if (body.action === "close") {
        setCloseResult(data.data);
        setCountedCash("");
      } else {
        setMsg(`POS dibuka · modal ${fmtRp(Number(openingCash) || 0)}`);
        setOpeningCash("");
      }
      await loadData();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setActing(false);
    }
  };

  const isOn = segments.some((s) => s.running);

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
        <h1 className="text-xl font-bold">Shift Saya</h1>
        <p className="text-sm text-muted-foreground">
          {(session?.user as any)?.name}
        </p>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">
          {err}
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 size={20} className="mx-auto animate-spin" />
        </div>
      ) : (
        <>
          {/* 1. Ringkasan shift */}
          <div
            className={`rounded-2xl border p-5 text-center ${
              isOn
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-amber-500/40 bg-amber-500/10"
            }`}
          >
            <p
              className={`text-xs uppercase tracking-wider ${
                isOn
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {isOn ? "Shift aktif" : "Belum check-in"}
            </p>
            <p className="mt-1 text-2xl font-bold">
              Total aktif hari ini: {fmtDur(totalActiveMin)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {segments.length} sesi
              {segments.some((s) => s.running) &&
                ` · berjalan sejak ${fmtTime(
                  segments.find((s) => s.running)?.checkInAt,
                )}`}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {!isOn ? (
                <>
                  <button
                    onClick={() => post({ action: "check-in", service: "POS" })}
                    disabled={acting}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {acting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <LogIn size={15} />
                    )}
                    Check-in Kasir
                  </button>
                  <button
                    onClick={() =>
                      post({ action: "check-in", service: "INVENTORY" })
                    }
                    disabled={acting}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {acting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Boxes size={15} />
                    )}
                    Check-in Inventori
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() =>
                      post({ action: "set-service", service: "POS" })
                    }
                    disabled={acting}
                    className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium hover:border-primary/50 disabled:opacity-50"
                  >
                    <Store size={15} /> Kasir POS
                  </button>
                  <button
                    onClick={() =>
                      post({ action: "set-service", service: "INVENTORY" })
                    }
                    disabled={acting}
                    className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium hover:border-primary/50 disabled:opacity-50"
                  >
                    <Boxes size={15} /> Inventori
                  </button>
                  <button
                    onClick={() => {
                      if (
                        pos &&
                        !window.confirm(
                          "Sesi POS masih terbuka. Check-out akan DITOLAK kecuali POS ditutup dulu. Lanjut coba check-out?",
                        )
                      )
                        return;
                      post({ action: "check-out" });
                    }}
                    disabled={acting}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {acting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <LogOut size={15} />
                    )}
                    Check-out
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 2. Kontrol POS */}
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Wallet size={15} /> Kontrol POS
            </h2>
            {pos ? (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                    OPEN
                  </span>{" "}
                  <span className="text-muted-foreground">
                    dibuka {fmtTime(pos.openedAt)} · modal{" "}
                    {fmtRp(pos.openingCash)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Ekspektasi kas:{" "}
                  <span className="font-bold text-foreground">
                    {fmtRp(pos.expectedCash)}
                  </span>{" "}
                  · {pos.txCount} transaksi
                </p>
                <div className="flex gap-2">
                  <input
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="Hasil hitung kas fisik"
                    type="number"
                    min="0"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() =>
                      postPos({
                        action: "close",
                        countedCash: Number(countedCash),
                      })
                    }
                    disabled={acting || !countedCash}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {acting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Lock size={15} />
                    )}
                    Close POS
                  </button>
                </div>
                {closeResult && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      Number(closeResult.discrepancy) === 0
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
                        : "border-amber-500/30 bg-amber-500/5 text-amber-700"
                    }`}
                  >
                    Ditutup {fmtTime(closeResult.closedAt)} · ekspektasi{" "}
                    {fmtRp(Number(closeResult.expectedCash))} · dihitung{" "}
                    {fmtRp(Number(closeResult.countedCash))} · selisih{" "}
                    <span className="font-bold">
                      {fmtRp(Number(closeResult.discrepancy))}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">
                    CLOSED
                  </span>{" "}
                  {isOn
                    ? "Buka sesi kasir dengan modal awal."
                    : "Check-in dulu sebelum buka POS."}
                </p>
                <div className="flex gap-2">
                  <input
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    placeholder="Modal awal (Rp)"
                    type="number"
                    min="1"
                    disabled={!isOn}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
                  />
                  <button
                    onClick={() =>
                      postPos({
                        action: "open",
                        openingCash: Number(openingCash),
                      })
                    }
                    disabled={acting || !isOn || !openingCash}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {acting ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <LockOpen size={15} />
                    )}
                    Open POS
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Akses cepat */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={isOn ? "/dashboard/pos" : "#"}
              onClick={(e) => {
                if (!isOn) e.preventDefault();
              }}
              aria-disabled={!isOn}
              className={`flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-semibold ${
                isOn
                  ? "bg-card hover:border-primary/50"
                  : "cursor-not-allowed bg-muted/50 text-muted-foreground"
              }`}
              title={isOn ? "Buka kasir" : "Check-in dulu untuk buka kasir"}
            >
              {!isOn && <AlertTriangle size={14} />}
              <Store size={16} /> Kasir POS
            </Link>
            <Link
              href={isOn ? "/dashboard/retail/inventory" : "#"}
              onClick={(e) => {
                if (!isOn) e.preventDefault();
              }}
              aria-disabled={!isOn}
              className={`flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-semibold ${
                isOn
                  ? "bg-card hover:border-primary/50"
                  : "cursor-not-allowed bg-muted/50 text-muted-foreground"
              }`}
              title={isOn ? "Buka inventaris" : "Check-in dulu untuk buka inventaris"}
            >
              {!isOn && <AlertTriangle size={14} />}
              <Boxes size={16} /> Inventaris
            </Link>
          </div>

          {/* 4. Timeline hari ini */}
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Clock size={15} /> Timeline hari ini
            </h2>
            {segments.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                Belum ada sesi hari ini
              </p>
            ) : (
              <div className="space-y-0">
                {segments.map((s, idx) => (
                  <div key={s.id} className="flex gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                          s.running ? "bg-emerald-500" : "bg-muted-foreground/40"
                        }`}
                      />
                      {idx < segments.length - 1 && (
                        <span className="w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className="font-medium">
                        Check-in {fmtTime(s.checkInAt)}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {s.service === "INVENTORY" ? "Inventori" : "Kasir"}
                          {s.running && " · berjalan"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.checkOutAt
                          ? `Check-out ${fmtTime(s.checkOutAt)} · ${fmtDur(s.durationMin)}`
                          : "Segmen berjalan"}
                      </p>
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-right text-xs font-semibold">
                  Total aktif: {fmtDur(totalActiveMin)}
                </p>
              </div>
            )}
          </div>

          {/* Riwayat 14 hari */}
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Clock size={15} /> Riwayat (14 hari)
            </h2>
            {history.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                Belum ada riwayat
              </p>
            ) : (
              <div className="divide-y">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
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
                        {fmtTime(h.checkInAt)}
                        {h.checkOutAt
                          ? ` — ${fmtTime(h.checkOutAt)}`
                          : " (berjalan)"}
                        {h.durationMin != null && ` · ${fmtDur(h.durationMin)}`}
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

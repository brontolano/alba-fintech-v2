"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, Loader2, Wallet, CheckCircle2, XCircle } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type OwnerRow = {
  ownerId: string;
  ownerName: string;
  qtySold: number;
  omzet: number;
  hakPemilik: number;
  komisiUnit: number;
  coveredTo?: string | null;
};

type Payout = {
  id: string;
  status: string;
  amount: number;
  fromDate: string;
  toDate: string;
  ownerName?: string;
  note?: string;
};

export default function LaporanPage() {
  const [from, setFrom] = useState(todayLocal());
  const [to, setTo] = useState(todayLocal());
  const [rows, setRows] = useState<OwnerRow[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [repRes, payRes] = await Promise.all([
        fetch(`/api/retail/consignments/report?from=${from}&to=${to}`),
        fetch("/api/retail/consignments/payouts").catch(() => null),
      ]);
      const rep = await repRes.json();
      if (!repRes.ok) throw new Error(rep.error || "Gagal memuat laporan");
      setRows(rep.data?.owners || []);
      if (payRes && payRes.ok) {
        const p = await payRes.json();
        setPayouts(p.data || []);
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createPayout = async (ownerId: string) => {
    setActing(ownerId);
    setErr(null);
    try {
      const res = await fetch("/api/retail/consignments/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId, from, to }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal membuat payout");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setActing(null);
    }
  };

  const setPayoutStatus = async (id: string, action: "pay" | "cancel") => {
    setActing(id);
    setErr(null);
    try {
      const res = await fetch(`/api/retail/consignments/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memproses");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setActing(null);
    }
  };

  const totals = rows.reduce(
    (t, r) => ({
      omzet: t.omzet + r.omzet,
      hak: t.hak + r.hakPemilik,
      komisi: t.komisi + r.komisiUnit,
    }),
    { omzet: 0, hak: 0, komisi: 0 },
  );

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <BarChart3 size={20} /> Laporan Titipan
          </h1>
          <p className="text-sm text-muted-foreground">Penjualan & hak pemilik</p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali
        </Link>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">
          {err}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3"
      >
        <label className="text-xs text-muted-foreground">
          Dari
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Sampai
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
          Tampilkan
        </button>
      </form>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 size={20} className="mx-auto animate-spin" />
        </div>
      ) : (
        <>
          {/* Total 3 kartu */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">Omzet</p>
              <p className="mt-1 text-sm font-bold">{fmt(totals.omzet)}</p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">Hak Pemilik</p>
              <p className="mt-1 text-sm font-bold text-amber-600">{fmt(totals.hak)}</p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">Komisi Unit</p>
              <p className="mt-1 text-sm font-bold text-emerald-600">{fmt(totals.komisi)}</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Per Pemilik</h2>
            {rows.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                Tidak ada data pada rentang ini
              </p>
            ) : (
              <div className="divide-y">
                {rows.map((r) => (
                  <div key={r.ownerId} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{r.ownerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.qtySold} item terjual
                        {r.coveredTo && (
                          <span className="ml-2 text-emerald-600">
                            s/d {String(r.coveredTo).slice(0, 10)} dibayar
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold text-amber-600">hak {fmt(r.hakPemilik)}</p>
                      <p className="text-muted-foreground">komisi {fmt(r.komisiUnit)}</p>
                      <button
                        onClick={() => createPayout(r.ownerId)}
                        disabled={acting !== null || r.hakPemilik <= 0}
                        className="mt-1 inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {acting === r.ownerId ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Wallet size={12} />
                        )}
                        Buat Pembayaran
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Riwayat payout */}
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Riwayat Pembayaran Titipan</h2>
            {payouts.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                Belum ada pembayaran
              </p>
            ) : (
              <div className="divide-y">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{p.ownerName || "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {String(p.fromDate).slice(0, 10)} — {String(p.toDate).slice(0, 10)}{" "}
                        · {p.status}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-right text-xs">
                      <p className="font-semibold">{fmt(Number(p.amount))}</p>
                      {p.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => setPayoutStatus(p.id, "pay")}
                            disabled={acting !== null}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 font-semibold text-white disabled:opacity-50"
                          >
                            {acting === p.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            Bayar
                          </button>
                          <button
                            onClick={() => setPayoutStatus(p.id, "cancel")}
                            disabled={acting !== null}
                            className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 font-semibold disabled:opacity-50"
                          >
                            <XCircle size={12} />
                            Batal
                          </button>
                        </>
                      )}
                      {p.status === "PAID" && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-600">
                          Lunas
                        </span>
                      )}
                    </div>
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
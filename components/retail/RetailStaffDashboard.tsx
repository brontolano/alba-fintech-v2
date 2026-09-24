"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  LogIn,
  LogOut,
  Clock,
  AlertTriangle,
  Package,
  ReceiptText,
  ChevronRight,
  Loader2,
  Store,
  Users,
} from "lucide-react";

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const fmtTime = (v: string | Date | null | undefined) => {
  if (!v) return "-";
  const d = new Date(v);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

const fmtDateTime = (v: string | Date | null | undefined) => {
  if (!v) return "-";
  const d = new Date(v);
  return (
    d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
};

type Summary = {
  unit: { id: string; name: string; code: string };
  date: string;
  shift: {
    mine: {
      id: string;
      service: string | null;
      checkInAt: string;
      checkOutAt: string | null;
      active: boolean;
    } | null;
    onShift: {
      id: string;
      service: string | null;
      checkInAt: string;
      user: { id: string; name: string | null; role: string | null };
    }[];
    onShiftCount: number;
  };
  lowStock: {
    count: number;
    items: {
      id: string;
      name: string;
      sku: string;
      imageUrl: string | null;
      currentStock: number;
      minStock: number;
      unitPrice: number | null;
      empty: boolean;
    }[];
  };
  recent: {
    id: string;
    type: string;
    amount: number;
    description: string;
    status: string | null;
    paymentMethod: string | null;
    createdAt: string;
    by: string;
  }[];
};

export function RetailStaffDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/dashboard");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal memuat dasbor");
      setData(body.data as Summary);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const shiftAction = async (action: "check-in" | "check-out") => {
    setActing(true);
    setErr(null);
    try {
      const res = await fetch("/api/retail/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "check-in"
            ? { action: "check-in", service: "POS" }
            : { action: "check-out" },
        ),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal mencatat shift");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setActing(false);
    }
  };

  const user = session?.user;
  const mine = data?.shift.mine ?? null;
  const active = mine?.active ?? false;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      {/* Sapaan + unit */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs opacity-90">Halo,</p>
            <h1 className="truncate text-xl font-bold">
              {(user as any)?.name || "Staff"}
            </h1>
            <p className="mt-0.5 flex items-center gap-1 text-xs opacity-90">
              <Store size={13} />
              {data?.unit.name ?? "Unit Retail"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold">
            <span
              className={`h-2 w-2 rounded-full ${active ? "bg-emerald-300" : "bg-white/60"}`}
            />
            {active ? "Shift aktif" : "Belum check-in"}
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">
          {err}
        </div>
      )}

      {loading || !data ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 size={20} className="mx-auto animate-spin" />
        </div>
      ) : (
        <>
          {/* Check-in / Check-out */}
          <div
            className={`rounded-2xl border p-5 ${
              active
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-amber-500/40 bg-amber-500/10"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Clock size={15} />
                  {active ? "Sedang bertugas" : "Shift hari ini"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mine
                    ? `Check-in ${fmtTime(mine.checkInAt)}${
                        mine.checkOutAt
                          ? ` · Check-out ${fmtTime(mine.checkOutAt)}`
                          : ` · Layanan ${mine.service === "INVENTORY" ? "Inventori" : "Kasir POS"}`
                      }`
                    : "Kamu belum check-in hari ini"}
                </p>
              </div>
              {active ? (
                <button
                  onClick={() => shiftAction("check-out")}
                  disabled={acting}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {acting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <LogOut size={15} />
                  )}
                  Check-out
                </button>
              ) : (
                <button
                  onClick={() => shiftAction("check-in")}
                  disabled={acting}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {acting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <LogIn size={15} />
                  )}
                  Check-in
                </button>
              )}
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users size={13} />
              {data.shift.onShiftCount} kru sedang bertugas
              {data.shift.onShift.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-background px-2 py-0.5 font-medium"
                >
                  {s.user.name}
                </span>
              ))}
              <Link
                href="/dashboard/retail/shift"
                className="ml-auto inline-flex items-center gap-0.5 font-semibold text-primary"
              >
                Detail <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* Peringatan stok menipis */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle
                  size={16}
                  className={
                    data.lowStock.count > 0
                      ? "text-rose-600"
                      : "text-muted-foreground"
                  }
                />
                Stok menipis
                {data.lowStock.count > 0 && (
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                    {data.lowStock.count}
                  </span>
                )}
              </h2>
              <Link
                href="/dashboard/retail/inventory"
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary"
              >
                Lihat stok <ChevronRight size={13} />
              </Link>
            </div>
            {data.lowStock.items.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                Semua stok aman
              </p>
            ) : (
              <div className="divide-y">
                {data.lowStock.items.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center gap-3 py-2 text-sm"
                  >
                    {i.imageUrl ? (
                      <img
                        src={i.imageUrl}
                        alt={i.name}
                        className="h-9 w-9 shrink-0 rounded-lg border object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted">
                        <Package size={16} className="text-muted-foreground" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        sisa {i.currentStock} / min {i.minStock}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        i.empty
                          ? "bg-rose-500/15 text-rose-600"
                          : "bg-amber-500/15 text-amber-700"
                      }`}
                    >
                      {i.empty ? "habis" : "menipis"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aktivitas terkini */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ReceiptText size={16} /> Aktivitas terkini
              </h2>
              <Link
                href="/dashboard/transactions"
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary"
              >
                Semua <ChevronRight size={13} />
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                Belum ada transaksi di unit ini
              </p>
            ) : (
              <div className="divide-y">
                {data.recent.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {t.description || t.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDateTime(t.createdAt)} · {t.by}
                        {t.status ? ` · ${t.status}` : ""}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 font-bold ${
                        t.type === "INCOME"
                          ? "text-emerald-600"
                          : "text-foreground"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : "-"}
                      {fmtRp(t.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

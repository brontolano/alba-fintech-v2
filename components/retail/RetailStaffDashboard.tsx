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
  ShoppingCart,
  PackagePlus,
  ClipboardCheck,
  UserPlus,
  ShoppingBag,
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

const fmtDur = (min: number | null | undefined) => {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
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
    totalActiveMin: number;
  };
  pos: {
    id: string;
    openedAt: string;
    openingCash: number;
    expectedCash: number;
    txCount: number;
    txTotal: number;
  } | null;
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

const SHORTCUTS = [
  {
    label: "Kasir POS",
    desc: "Jual & bayar",
    href: "/dashboard/pos",
    icon: <ShoppingCart size={22} />,
    color: "bg-amber-500",
  },
  {
    label: "Shift Saya",
    desc: "Check-in & sesi POS",
    href: "/dashboard/retail/shift",
    icon: <Clock size={22} />,
    color: "bg-emerald-500",
  },
  {
    label: "Stok",
    desc: "Lihat & cari barang",
    href: "/dashboard/retail/inventory",
    icon: <Package size={22} />,
    color: "bg-blue-500",
  },
  {
    label: "Stok Masuk",
    desc: "Catat kedatangan",
    href: "/dashboard/retail/stok-masuk",
    icon: <PackagePlus size={22} />,
    color: "bg-violet-500",
  },
  {
    label: "Belanja Stok",
    desc: "Ajukan belanja unit",
    href: "/dashboard/retail/belanja",
    icon: <ShoppingBag size={22} />,
    color: "bg-teal-600",
  },
  {
    label: "Hitung Sisa",
    desc: "Sisa titipan",
    href: "/dashboard/retail/sisa",
    icon: <ClipboardCheck size={22} />,
    color: "bg-cyan-600",
  },
  {
    label: "Titipan UMKM",
    desc: "Pemilik & payout",
    href: "/dashboard/retail/konsinyasi",
    icon: <UserPlus size={22} />,
    color: "bg-orange-500",
  },
];

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
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      {/* Sapaan + status shift */}
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
              {data && ` · aktif ${fmtDur(data.shift.totalActiveMin)} hari ini`}
            </p>
          </div>
          {active ? (
            <button
              onClick={() => shiftAction("check-out")}
              disabled={acting}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/20 px-3 py-2 text-xs font-bold hover:bg-white/30 disabled:opacity-50"
            >
              {acting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <LogOut size={14} />
              )}
              Check-out
            </button>
          ) : (
            <button
              onClick={() => shiftAction("check-in")}
              disabled={acting}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
            >
              {acting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <LogIn size={14} />
              )}
              Check-in
            </button>
          )}
        </div>
        {!active && (
          <p className="mt-2 text-[11px] opacity-90">
            Check-in dulu untuk buka kasir, stok & titipan.
          </p>
        )}
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
          {/* Jalan pintas */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SHORTCUTS.map((a) => (
              <Link key={a.href} href={a.href} className="group">
                <div className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:shadow-sm">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${a.color}`}
                  >
                    {a.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold group-hover:text-primary">
                      {a.label}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {a.desc}
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Status POS */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {data.pos ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                      POS OPEN
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                      POS CLOSED
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.pos
                    ? `Dibuka ${fmtTime(data.pos.openedAt)} · ekspektasi ${fmtRp(
                        data.pos.expectedCash,
                      )} · ${data.pos.txCount} transaksi`
                    : active
                      ? "Buka sesi kasir dari halaman Shift sebelum melayani."
                      : "Check-in dulu, lalu buka sesi POS."}
                </p>
              </div>
              <Link
                href="/dashboard/retail/shift"
                className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary"
              >
                {data.pos ? "Kelola" : "Buka"} <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* Kru bertugas */}
          {data.shift.onShiftCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border bg-card px-4 py-3 text-xs text-muted-foreground">
              <Users size={13} />
              {data.shift.onShiftCount} kru bertugas
              {data.shift.onShift.slice(0, 4).map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground"
                >
                  {s.user.name}
                </span>
              ))}
            </div>
          )}

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

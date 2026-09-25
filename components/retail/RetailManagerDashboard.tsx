"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ShoppingCart,
  Package,
  PackagePlus,
  ShoppingBag,
  BarChart2,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  ClipboardCheck,
  Store,
  LogIn,
  LogOut,
  Loader2,
  Users,
  ReceiptText,
  ChevronRight,
  UserPlus,
} from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  href: string;
  color: "amber" | "blue" | "green" | "red";
  className?: string;
}

function StatCard({ label, value, change, icon, href, color, className }: StatCardProps) {
  const colors = {
    amber: "bg-amber-500/15 text-amber-600",
    blue: "bg-blue-500/15 text-blue-600",
    green: "bg-emerald-500/15 text-emerald-600",
    red: "bg-rose-500/15 text-rose-600",
  };

  return (
    <Link href={href} className={className}>
      <div className="flex min-h-[92px] flex-col justify-between gap-3 rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <span className="break-words text-[10px] font-medium uppercase leading-snug tracking-wider text-muted-foreground">
            {label}
          </span>
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colors[color as keyof typeof colors]}`}
          >
            {icon}
          </span>
        </div>
        <div className="min-w-0">
          <p
            className="break-words text-base font-bold tabular-nums leading-tight text-foreground group-hover:text-primary"
            title={String(value)}
          >
            {value}
          </p>
          {change && (
            <p className="mt-1 break-words text-[11px] leading-snug text-muted-foreground">
              {change}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}
      </div>
    </div>
  );
}

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

interface Summary {
  unit: { id: string; name: string; code: string };
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
}

const QUICK_ACTIONS = [
  { label: "Buka POS", desc: "Jual & bayar", href: "/dashboard/pos", icon: <ShoppingCart size={22} />, color: "bg-amber-500" },
  { label: "Cek Stok", desc: "Lihat & cari barang", href: "/dashboard/retail/inventory", icon: <Package size={22} />, color: "bg-blue-500" },
  { label: "Stok Masuk", desc: "Catat kedatangan", href: "/dashboard/retail/stok-masuk", icon: <PackagePlus size={22} />, color: "bg-violet-500" },
  { label: "Hitung Sisa", desc: "Sisa titipan", href: "/dashboard/retail/sisa", icon: <ClipboardCheck size={22} />, color: "bg-cyan-600" },
  { label: "Titipan UMKM", desc: "Pemilik & payout", href: "/dashboard/retail/konsinyasi", icon: <UserPlus size={22} />, color: "bg-orange-500" },
  { label: "Laporan Penjualan", desc: "Rekap harian", href: "/dashboard/reports", icon: <BarChart2 size={22} />, color: "bg-emerald-500" },
];

export function RetailManagerDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    posToday: 0,
    posRevenue: 0,
    lowStock: 0,
    draftBatch: 0,
    pendingApprovals: 0,
  });
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
    Promise.all([
      fetch("/api/transactions?range=today&limit=1&type=INCOME").then(r => r.json()).catch(() => ({})),
      fetch("/api/retail/dashboard").then(r => r.json()).catch(() => ({})),
      fetch("/api/retail/batches?status=DRAFT&limit=100").then(r => r.json()).catch(() => ({})),
      fetch("/api/approvals?status=PENDING").then(r => r.json()).catch(() => ({})),
    ]).then(([sales, dash, drafts, appr]) => {
      setStats({
        posToday: sales?.summary?.todayCount ?? 0,
        posRevenue: sales?.summary?.todayIncome ?? 0,
        lowStock: dash?.data?.lowStock?.count ?? 0,
        draftBatch: Array.isArray(drafts?.data) ? drafts.data.length : 0,
        pendingApprovals: Array.isArray(appr?.data) ? appr.data.length : 0,
      });
      if (dash?.data) setData(dash.data as Summary);
      setLoading(false);
    }).catch(() => setLoading(false));
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

  if (loading) return <DashboardSkeleton />;

  const user = session?.user as any;
  const mine = data?.shift.mine ?? null;
  const active = mine?.active ?? false;
  const unitName = data?.unit.name ?? "Unit Retail";
  const unitCode = data?.unit.code ?? "";
  const { posToday, posRevenue, lowStock, draftBatch, pendingApprovals } = stats;

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-4">
      {/* Sapaan + status shift (check-in/check-out) */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs opacity-90">Halo,</p>
            <h1 className="truncate text-xl font-bold">
              {user?.name || "Manager"}
            </h1>
            <p className="mt-0.5 flex items-center gap-1 text-xs opacity-90">
              <Store size={13} />
              {unitName}
              {unitCode && ` · ${unitCode}`}
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

      {/* Ringkasan */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Ringkasan</h2>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Transaksi POS Hari Ini" value={posToday} change="transaksi tercatat" icon={<ShoppingCart size={16} />} href="/dashboard/pos" color="amber" />
          <StatCard label="Pendapatan Hari Ini" value={`Rp ${posRevenue.toLocaleString("id-ID")}`} change="pendapatan unit" icon={<TrendingUp size={16} />} href="/dashboard/reports" color="green" />
          <StatCard label="Stok Menipis" value={lowStock} change="perlu restock" icon={<AlertTriangle size={16} />} href="/dashboard/retail/inventory" color="red" />
          <StatCard label="Draf Batch" value={draftBatch} change="menunggu review" icon={<ShoppingBag size={16} />} href="/dashboard/retail/stok-masuk/review" color="blue" />
          <StatCard label="Persetujuan Menunggu" value={pendingApprovals} change="perlu tindakan" icon={<ClipboardList size={16} />} href="/dashboard/approvals" color="red" className="col-span-2" />
        </div>
      </div>

      {/* Status POS */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {data?.pos ? (
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
              {data?.pos
                ? `Dibuka ${fmtTime(data.pos.openedAt)} · ekspektasi ${fmtRp(
                    data.pos.expectedCash,
                  )} · ${data.pos.txCount} transaksi · kas ${fmtRp(data.pos.txTotal)}`
                : active
                  ? "Buka sesi kasir dari halaman Shift sebelum melayani."
                  : "Check-in dulu, lalu buka sesi POS."}
            </p>
          </div>
          <Link
            href="/dashboard/retail/shift"
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary"
          >
            {data?.pos ? "Kelola" : "Buka"} <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* Kru bertugas */}
      {data && data.shift.onShiftCount > 0 && (
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

      {/* Aksi Cepat */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Aksi Cepat</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUICK_ACTIONS.map((a) => (
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
      </div>

      {/* Perlu Perhatian */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Perlu Perhatian</h2>
        {draftBatch === 0 && lowStock === 0 && pendingApprovals === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Semua aman — tidak ada draf, stok menipis, atau persetujuan menunggu.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {draftBatch > 0 && (
              <Link
                href="/dashboard/retail/stok-masuk/review"
                className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 hover:shadow-md transition-all"
              >
                <p className="text-xl font-bold text-amber-700">{draftBatch}</p>
                <p className="text-xs text-muted-foreground">draf batch menunggu review</p>
              </Link>
            )}
            {lowStock > 0 && (
              <Link
                href="/dashboard/retail/inventory"
                className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-3 hover:shadow-md transition-all"
              >
                <p className="text-xl font-bold text-rose-600">{lowStock}</p>
                <p className="text-xs text-muted-foreground">barang stok menipis</p>
              </Link>
            )}
            {pendingApprovals > 0 && (
              <Link
                href="/dashboard/approvals"
                className="rounded-xl border bg-card p-3 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <p className="text-xl font-bold">{pendingApprovals}</p>
                <p className="text-xs text-muted-foreground">persetujuan menunggu</p>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Unit Overview */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Unit Saya</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/dashboard/retail/inventory" className="group">
            <div className="rounded-xl border bg-card p-3 hover:shadow-md hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
                  <Store size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{unitName}</p>
                  <p className="text-[10px] text-muted-foreground">{unitCode} · Klik untuk detail stok</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
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
        {!data || data.recent.length === 0 ? (
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
    </div>
  );
}
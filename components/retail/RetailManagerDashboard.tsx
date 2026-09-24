"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  PackageOpen,
  ShoppingBag,
  Wallet,
  BarChart2,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  BookOpen,
  Utensils,
  Store,
} from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  href: string;
  color: "amber" | "blue" | "green" | "purple" | "red";
}

function StatCard({ label, value, change, icon, href, color }: StatCardProps) {
  const colors = {
    amber: "bg-gradient-to-br from-amber-500 to-orange-500",
    blue: "bg-gradient-to-br from-blue-500 to-cyan-500",
    green: "bg-gradient-to-br from-emerald-500 to-teal-500",
    purple: "bg-gradient-to-br from-violet-500 to-purple-500",
    red: "bg-gradient-to-br from-red-500 to-rose-500",
  };

  return (
    <Link href={href} className="group">
      <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-lg font-bold text-foreground truncate">{value}</p>
            {change && <p className="mt-0.5 text-xs text-emerald-600">{change}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color as keyof typeof colors]} text-white shrink-0`}>
            {icon}
          </div>
        </div>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
      </div>
    </div>
  );
}

export function RetailManagerDashboard() {
  const [stats, setStats] = useState({
    posToday: 0,
    posRevenue: 0,
    lowStock: 0,
    draftBatch: 0,
    savingsActive: 0,
    pendingApprovals: 0,
  });
  const [unitName, setUnitName] = useState("Unit Retail");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/transactions?range=today&limit=1&type=INCOME").then(r => r.json()).catch(() => ({})),
      fetch("/api/retail/dashboard").then(r => r.json()).catch(() => ({})),
      fetch("/api/retail/batches?status=DRAFT&limit=100").then(r => r.json()).catch(() => ({})),
      fetch("/api/savings/limits").then(r => r.json()).catch(() => ({})),
      fetch("/api/approvals?status=PENDING").then(r => r.json()).catch(() => ({})),
    ]).then(([sales, dash, drafts, sav, appr]) => {
      setStats({
        posToday: sales?.summary?.todayCount ?? 0,
        posRevenue: sales?.summary?.todayIncome ?? 0,
        lowStock: dash?.data?.lowStock?.count ?? 0,
        draftBatch: Array.isArray(drafts?.data) ? drafts.data.length : 0,
        savingsActive: (sav?.data ?? []).filter((a: any) => Number(a.balance) > 0).length || 0,
        pendingApprovals: Array.isArray(appr?.data) ? appr.data.length : 0,
      });
      if (dash?.data?.unit?.name) setUnitName(dash.data.unit.name);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const { posToday, posRevenue, lowStock, draftBatch, savingsActive, pendingApprovals } = stats;

  return (
    <div className="mx-auto max-w-7xl p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold truncate">Dashboard Manager Retail</h1>
          <p className="text-xs text-muted-foreground">
            {unitName} · {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/retail/pos" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:from-amber-600 hover:to-orange-700">
            <ShoppingCart className="w-4 h-4" /> Buka POS
          </Link>
          {draftBatch > 0 && (
            <Link href="/dashboard/retail/stok-masuk/review" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600">
              Review ({draftBatch})
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Transaksi POS Hari Ini" value={posToday} change={`Rp ${posRevenue.toLocaleString("id-ID")}`} icon={<ShoppingCart size={18} />} href="/dashboard/pos" color="amber" />
        <StatCard label="Pendapatan Hari Ini" value={`Rp ${posRevenue.toLocaleString("id-ID")}`} icon={<TrendingUp size={18} />} href="/dashboard/reports" color="green" />
        <StatCard label="Stok Menipis" value={lowStock} icon={<AlertTriangle size={18} />} href="/dashboard/retail/inventory" color="red" />
        <StatCard label="Draf Batch" value={draftBatch} icon={<ShoppingBag size={18} />} href="/dashboard/retail/stok-masuk/review" color="blue" />
        <StatCard label="Tabungan Aktif" value={savingsActive} icon={<Wallet size={18} />} href="/dashboard/savings" color="purple" />
        <StatCard label="Persetujuan Menunggu" value={pendingApprovals} icon={<ClipboardList size={18} />} href="/dashboard/approvals" color="red" />
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Aksi Cepat</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Buka POS", href: "/dashboard/retail/pos", icon: <ShoppingCart size={18} />, color: "from-amber-500 to-orange-600" },
            { label: "Cek Stok", href: "/dashboard/retail/inventory", icon: <Package size={18} />, color: "from-blue-500 to-cyan-600" },
            { label: "Barang Titipan", href: "/dashboard/retail/inventory", icon: <PackageOpen size={18} />, color: "from-amber-500 to-yellow-600" },
            { label: "Review Batch", href: "/dashboard/retail/stok-masuk/review", icon: <ShoppingBag size={18} />, color: "from-violet-500 to-purple-600" },
            { label: "Laporan Penjualan", href: "/dashboard/reports", icon: <BarChart2 size={18} />, color: "from-emerald-500 to-teal-600" },
            { label: "Cek Tabungan", href: "/dashboard/savings", icon: <Wallet size={18} />, color: "from-purple-500 to-pink-600" },
          ].map((action) => (
            <Link key={action.href} href={action.href} className="group">
              <div className="rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${action.color} text-white`}>
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground group-hover:text-primary truncate">{action.label}</p>
                    <p className="text-[11px] text-muted-foreground">Klik untuk buka</p>
                  </div>
                </div>
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
        <h2 className="mb-3 text-sm font-semibold">Ringkasan Unit Retail</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { id: "cmubg2y5h001fxx3d51558t81", name: "Koperasi Buku", code: "KOP", icon: <BookOpen size={16} /> },
            { id: "cmubg2y5b001dxx3d8ybh8kx9", name: "Kantin Umi", code: "KUM", icon: <Utensils size={16} /> },
            { id: "cmubg2y54001bxx3d7c6scg0h", name: "Kantin Baru", code: "KAB", icon: <Store size={16} /> },
          ].map((unit) => (
            <Link key={unit.id} href={`/dashboard/retail/inventory?unitId=${unit.id}`} className="group">
              <div className="rounded-xl border bg-card p-3 hover:shadow-md hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
                    {unit.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{unit.name}</p>
                    <p className="text-[10px] text-muted-foreground">{unit.code} · Klik untuk detail stok</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Package, PackageOpen, ShoppingBag, Wallet, BarChart2, TrendingUp, Users, AlertCircle, Clock, TrendingDown, DollarSign, BookOpen, Utensils, Store, TrendingUp as TrendingUpIcon } from "lucide-react";

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
      <div className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            {change && <p className="mt-1 text-sm text-emerald-600">{change}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color as keyof typeof colors]} text-white`}>
            {icon}
          </div>
        </div>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
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

  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Manager Retail</h1>
          <p className="text-muted-foreground">{unitName} • {today}</p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/pos" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-white font-semibold shadow hover:from-amber-600 hover:to-orange-700">
            <ShoppingCart className="w-5 h-5" /> Buka POS
          </a>
          {stats.draftBatch > 0 && (
            <a href="/dashboard/retail/stok-masuk/review" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-white font-semibold shadow hover:bg-amber-600">
              Review ({stats.draftBatch})
            </a>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Transaksi POS Hari Ini" value={stats.posToday} change={`Rp ${stats.posRevenue.toLocaleString("id-ID")}`} icon={<ShoppingCart size={24} />} href="/dashboard/pos" color="amber" />
        <StatCard label="Pendapatan Hari Ini" value={`Rp ${stats.posRevenue.toLocaleString("id-ID")}`} icon={<TrendingUpIcon size={24} />} href="/dashboard/reports" color="green" />
        <StatCard label="Stok Menipis" value={stats.lowStock} icon={<AlertCircle size={24} />} href="/dashboard/retail/inventory" color="red" />
        <StatCard label="Draf Batch" value={stats.draftBatch} icon={<ShoppingBag size={24} />} href="/dashboard/retail/stok-masuk/review" color="blue" />
        <StatCard label="Tabungan Aktif" value={stats.savingsActive} icon={<Wallet size={24} />} href="/dashboard/savings" color="purple" />
        <StatCard label="Persetujuan Menunggu" value={stats.pendingApprovals} icon={<Clock size={24} />} href="/dashboard/approvals" color="red" />
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Aksi Cepat</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Buka POS", href: "/dashboard/pos", icon: <ShoppingCart size={24} />, color: "from-amber-500 to-orange-600" },
            { label: "Cek Stok", href: "/dashboard/retail/inventory", icon: <Package size={24} />, color: "from-blue-500 to-cyan-600" },
            { label: "Barang Titipan", href: "/dashboard/retail/inventory", icon: <PackageOpen size={24} />, color: "from-amber-500 to-yellow-600" },
            { label: "Review Batch", href: "/dashboard/retail/stok-masuk/review", icon: <ShoppingBag size={24} />, color: "from-violet-500 to-purple-600" },
            { label: "Laporan Penjualan", href: "/dashboard/reports", icon: <BarChart2 size={24} />, color: "from-emerald-500 to-teal-600" },
            { label: "Cek Tabungan", href: "/dashboard/savings", icon: <Wallet size={24} />, color: "from-purple-500 to-pink-600" },
          ].map((action) => (
            <Link key={action.href} href={action.href} className="group">
              <div className="rounded-xl border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${action.color} text-white`}>
                    {action.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary">{action.label}</p>
                    <p className="text-xs text-muted-foreground">Klik untuk buka</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Perlu perhatian */}
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Perlu Perhatian</h2>
        {stats.draftBatch === 0 && stats.lowStock === 0 && stats.pendingApprovals === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Semua aman — tidak ada draf, stok menipis, atau persetujuan menunggu.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.draftBatch > 0 && (
              <Link
                href="/dashboard/retail/stok-masuk/review"
                className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 hover:shadow-md transition-all"
              >
                <p className="text-2xl font-bold text-amber-700">{stats.draftBatch}</p>
                <p className="text-sm text-muted-foreground">draf batch menunggu review</p>
              </Link>
            )}
            {stats.lowStock > 0 && (
              <Link
                href="/dashboard/retail/inventory"
                className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-4 hover:shadow-md transition-all"
              >
                <p className="text-2xl font-bold text-rose-600">{stats.lowStock}</p>
                <p className="text-sm text-muted-foreground">barang stok menipis</p>
              </Link>
            )}
            {stats.pendingApprovals > 0 && (
              <Link
                href="/dashboard/approvals"
                className="rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                <p className="text-sm text-muted-foreground">persetujuan menunggu</p>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
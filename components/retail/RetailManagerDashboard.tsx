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
    pendingOrders: 0,
    savingsActive: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/retail/pos/stats?period=today").then(r => r.json()).catch(() => ({ data: {} })),
      fetch("/api/retail/inventory?isConsignment=false&limit=100").then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/retail/reorder?status=PENDING").then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/savings/limits").then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/approvals?status=PENDING").then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([pos, inv, orders, sav, appr]) => {
      setStats({
        posToday: pos.data?.count || 0,
        posRevenue: pos.data?.revenue || 0,
        lowStock: inv.data?.filter((i: any) => (i.currentStock || 0) <= (i.minStock || 0)).length || 0,
        pendingOrders: orders.data?.length || 0,
        savingsActive: sav.data?.filter((a: any) => a.balance > 0).length || 0,
        pendingApprovals: appr.data?.length || 0,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const unitName = "Koperasi Buku";
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
          <a href="/dashboard/retail/pos" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-white font-semibold shadow hover:from-amber-600 hover:to-orange-700">
            <ShoppingCart className="w-5 h-5" /> Buka POS
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Transaksi POS Hari Ini" value={stats.posToday} change={`Rp ${stats.posRevenue.toLocaleString("id-ID")}`} icon={<ShoppingCart size={24} />} href="/dashboard/retail/pos" color="amber" />
        <StatCard label="Pendapatan Hari Ini" value={`Rp ${stats.posRevenue.toLocaleString("id-ID")}`} icon={<TrendingUpIcon size={24} />} href="/dashboard/reports" color="green" />
        <StatCard label="Stok Menipis" value={stats.lowStock} icon={<AlertCircle size={24} />} href="/dashboard/retail/inventory" color="red" />
        <StatCard label="Belanja Pending" value={stats.pendingOrders} icon={<ShoppingBag size={24} />} href="/dashboard/retail/belanja" color="blue" />
        <StatCard label="Tabungan Aktif" value={stats.savingsActive} icon={<Wallet size={24} />} href="/dashboard/retail/tabungan" color="purple" />
        <StatCard label="Persetujuan Menunggu" value={stats.pendingApprovals} icon={<Clock size={24} />} href="/dashboard/approvals" color="red" />
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Aksi Cepat</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Buka POS", href: "/dashboard/retail/pos", icon: <ShoppingCart size={24} />, color: "from-amber-500 to-orange-600" },
            { label: "Cek Stok", href: "/dashboard/retail/inventory", icon: <Package size={24} />, color: "from-blue-500 to-cyan-600" },
            { label: "Barang Titipan", href: "/dashboard/retail/inventory", icon: <PackageOpen size={24} />, color: "from-amber-500 to-yellow-600" },
            { label: "Buat Belanja", href: "/dashboard/retail/belanja", icon: <ShoppingBag size={24} />, color: "from-violet-500 to-purple-600" },
            { label: "Laporan Penjualan", href: "/dashboard/reports", icon: <BarChart2 size={24} />, color: "from-emerald-500 to-teal-600" },
            { label: "Cek Tabungan", href: "/dashboard/retail/tabungan", icon: <Wallet size={24} />, color: "from-purple-500 to-pink-600" },
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

      {/* Unit Overview */}
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Ringkasan 3 Unit Retail</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { id: "cmubg2y5h001fxx3d51558t81", name: "Koperasi Buku", code: "KOP", icon: <BookOpen size={20} /> },
            { id: "cmubg2y5b001dxx3d8ybh8kx9", name: "Kantin Umi", code: "KUM", icon: <Utensils size={20} /> },
            { id: "cmubg2y54001bxx3d7c6scg0h", name: "Kantin Baru", code: "KAB", icon: <Store size={20} /> },
          ].map(unit => (
            <a key={unit.id} href={`/dashboard/retail/inventory?unitId=${unit.id}`} className="group">
              <div className="rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    {unit.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{unit.name}</p>
                    <p className="text-xs text-muted-foreground">{unit.code} • Klik untuk detail stok</p>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
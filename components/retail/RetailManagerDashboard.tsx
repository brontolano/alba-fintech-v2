"use client";

import { useState, useEffect } from "react";
import {
  Handshake,
  ClipboardCheck,
  PackageOpen,
  Wallet,
  BarChart3,
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickAccessGrid } from "@/components/dashboard/QuickAccessGrid";
import type { QuickAccessAction } from "@/components/dashboard/QuickAccessGrid";

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

const isCashTx = (x: any) => !x.paymentMethod || x.paymentMethod === "CASH";

/**
 * Dashboard Manager Retail (unit isRetail): saldo unit, payout konsinyasi,
 * pengajuan menunggu, serah terima & rekap.
 */
export function RetailManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    masuk: 0,
    keluar: 0,
    count: 0,
    pendingPayout: 0,
    pendingApprovals: 0,
    lowStock: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const today = todayLocal();
        const [txRes, payoutRes, approvalRes, invRes] = await Promise.all([
          fetch(`/api/transactions?startDate=${today}&endDate=${today}&limit=100`),
          fetch("/api/retail/consignments/payouts?status=PENDING").catch(() => null),
          fetch("/api/approvals").catch(() => null),
          fetch("/api/inventory?limit=100").catch(() => null),
        ]);

        let txs: any[] = [];
        let payouts: any[] = [];
        let approvals: any[] = [];
        let inv: any[] = [];
        if (txRes.ok) {
          const t = await txRes.json();
          txs = (t.data || t.transactions || []).filter(
            (x: any) => x.status !== "REJECTED",
          );
        }
        if (payoutRes && payoutRes.ok) {
          const p = await payoutRes.json();
          payouts = p.data || [];
        }
        if (approvalRes && approvalRes.ok) {
          const a = await approvalRes.json();
          approvals = (a.data || []).filter((x: any) => x.status === "PENDING");
        }
        if (invRes && invRes.ok) {
          const i = await invRes.json();
          const list = i.data && Array.isArray(i.data) ? i.data : i.items || [];
          inv = list.filter(
            (x: any) =>
              x.isActive !== false &&
              Number(x.currentStock ?? 0) <= Number(x.minStock ?? 0),
          );
        }

        const sum = (l: any[]) =>
          l.reduce((s, x) => s + Number(x.amount || 0), 0);
        const cashTxs = txs.filter(isCashTx);
        const masuk = sum(cashTxs.filter((x) => x.type === "INCOME"));
        const keluar = sum(cashTxs.filter((x) => x.type === "EXPENSE"));

        setStats({
          masuk,
          keluar,
          count: txs.length,
          pendingPayout: sum(payouts),
          pendingApprovals: approvals.length,
          lowStock: inv.length,
        });
      } catch {
        // dashboard tetap tampil walau ringkasan gagal
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const actions: QuickAccessAction[] = [
    { href: "/dashboard/handovers", icon: Handshake, label: "Serah Terima", color: "blue" },
    { href: "/dashboard/approvals", icon: ClipboardCheck, label: "Persetujuan", color: "orange" },
    { href: "/dashboard/retail/konsinyasi", icon: PackageOpen, label: "Titipan", color: "purple" },
    { href: "/dashboard/retail/konsinyasi/serah-terima", icon: Wallet, label: "Payout", color: "green" },
    { href: "/dashboard/retail/konsinyasi/laporan", icon: BarChart3, label: "Rekap", color: "amber" },
    { href: "/dashboard/retail/inventory", icon: Boxes, label: "Stok", color: "green" },
  ];

  return (
    <div className="space-y-4">
      <DashboardHeader title="Dashboard Retail" subtitle="Manager" />

      {/* Saldo tunai */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
        <p className="text-xs opacity-80">Saldo Unit Hari Ini (tunai)</p>
        {loading ? (
          <Loader2 size={18} className="my-2 animate-spin" />
        ) : (
          <>
            <p className="mt-1 text-3xl font-bold">
              {formatCurrency(stats.masuk - stats.keluar)}
            </p>
            <div className="mt-2 flex gap-4 text-xs">
              <span className="inline-flex items-center gap-1">
                <ArrowDownRight size={12} /> Masuk {formatCurrency(stats.masuk)}
              </span>
              <span className="inline-flex items-center gap-1">
                <ArrowUpRight size={12} /> Keluar {formatCurrency(stats.keluar)}
              </span>
              <span>{stats.count} transaksi</span>
            </div>
          </>
        )}
      </div>

      <QuickAccessGrid actions={actions} />

      {/* Ringkasan aksi */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/handovers"
          className="rounded-xl border bg-card p-4 hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} className="text-orange-600" />
            <p className="text-xs text-muted-foreground">Menunggu Aksi Anda</p>
          </div>
          <p className="mt-1 text-sm font-bold">{stats.pendingApprovals} pengajuan</p>
          <p className="text-[11px] text-muted-foreground">perlu disetujui/tolak</p>
        </Link>
        <Link
          href="/dashboard/retail/konsinyasi/serah-terima"
          className="rounded-xl border bg-card p-4 hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-green-600" />
            <p className="text-xs text-muted-foreground">Kewajiban Titipan</p>
          </div>
          <p className="mt-1 text-sm font-bold text-green-600">
            {formatCurrency(stats.pendingPayout)}
          </p>
          <p className="text-[11px] text-muted-foreground">hak pemilik, belum dibayar</p>
        </Link>
        <Link
          href="/dashboard/retail/inventory"
          className="rounded-xl border bg-card p-4 hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <Boxes size={16} className="text-emerald-600" />
            <p className="text-xs text-muted-foreground">Stok Menipis</p>
          </div>
          <p className="mt-1 text-sm font-bold">{stats.lowStock} barang</p>
          <p className="text-[11px] text-muted-foreground">≤ stok minimum</p>
        </Link>
        <Link
          href="/dashboard/retail/konsinyasi"
          className="rounded-xl border bg-card p-4 hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <PackageOpen size={16} className="text-purple-600" />
            <p className="text-xs text-muted-foreground">Titipan UMKM</p>
          </div>
          <p className="mt-1 text-sm font-bold">Kelola</p>
          <p className="text-[11px] text-muted-foreground">pemilik & barang</p>
        </Link>
      </div>
    </div>
  );
}
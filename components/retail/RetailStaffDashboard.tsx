"use client";

import { useState, useEffect } from "react";
import {
  Store,
  Clock,
  PackageOpen,
  Boxes,
  BarChart3,
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
 * Dashboard Staff Retail (unit isRetail): shift, omzet tunai, nilai barang
 * titipan, quick akses POS/Shift/Titipan/Stok/Laporan.
 */
export function RetailStaffDashboard() {
  const [loading, setLoading] = useState(true);
  const [shiftOn, setShiftOn] = useState<boolean | null>(null);
  const [service, setService] = useState<string | null>(null);
  const [stats, setStats] = useState({
    masuk: 0,
    keluar: 0,
    count: 0,
    itemCount: 0,
    consignmentValue: 0,
    pendingPayout: 0,
  });
  const [log, setLog] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const today = todayLocal();
        const [txRes, shiftRes, itemsRes, payoutRes] = await Promise.all([
          fetch(`/api/transactions?startDate=${today}&endDate=${today}&limit=100`),
          fetch("/api/retail/shift").catch(() => null),
          fetch("/api/retail/consignments/items").catch(() => null),
          fetch("/api/retail/consignments/payouts?status=PENDING").catch(() => null),
        ]);

        let txs: any[] = [];
        let items: any[] = [];
        let payouts: any[] = [];
        if (txRes.ok) {
          const t = await txRes.json();
          txs = (t.data || t.transactions || []).filter(
            (x: any) => x.status !== "REJECTED",
          );
        }
        if (shiftRes && shiftRes.ok) {
          const s = await shiftRes.json();
          setShiftOn(!!s.data?.mine && !s.data.mine.checkOutAt);
          setService(s.data?.mine?.service ?? null);
        }
        if (itemsRes && itemsRes.ok) {
          const it = await itemsRes.json();
          items = it.data || [];
        }
        if (payoutRes && payoutRes.ok) {
          const p = await payoutRes.json();
          payouts = p.data || [];
        }

        const sum = (l: any[]) =>
          l.reduce((s, x) => s + Number(x.amount || 0), 0);
        const cashTxs = txs.filter(isCashTx);
        const masuk = sum(cashTxs.filter((x) => x.type === "INCOME"));
        const keluar = sum(cashTxs.filter((x) => x.type === "EXPENSE"));

        const consignmentValue = items.reduce(
          (s, it) => s + Number(it.inventory?.currentStock || 0) * Number(it.costPrice || 0),
          0,
        );
        const pendingPayout = sum(payouts);

        setStats({
          masuk,
          keluar,
          count: txs.length,
          itemCount: items.length,
          consignmentValue,
          pendingPayout,
        });

        const entries = [
          ...txs.map((x) => ({
            key: `k-${x.id}`,
            dir: x.type === "INCOME" ? "in" : "out",
            title: x.description,
            dateISO: x.date,
            amount: Number(x.amount || 0),
          })),
        ]
          .sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""))
          .slice(0, 8);
        setLog(entries);
      } catch {
        // dashboard tetap tampil walau ringkasan gagal
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const actions: QuickAccessAction[] = [
    { href: "/dashboard/pos", icon: Store, label: "Kasir POS", color: "blue" },
    { href: "/dashboard/retail/shift", icon: Clock, label: "Shift", color: "amber" },
    { href: "/dashboard/retail/konsinyasi", icon: PackageOpen, label: "Titipan", color: "purple" },
    { href: "/dashboard/retail/inventory", icon: Boxes, label: "Stok", color: "green" },
    { href: "/dashboard/retail/konsinyasi/laporan", icon: BarChart3, label: "Laporan", color: "orange" },
  ];

  return (
    <div className="space-y-4">
      <DashboardHeader title="Dashboard Retail" subtitle="Petugas Shift" />

      {shiftOn === false && !loading && (
        <Link
          href="/dashboard/retail/shift"
          className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          <span className="font-medium">Belum check-in shift hari ini</span>
          <span className="font-semibold text-primary">Check-in →</span>
        </Link>
      )}

      {shiftOn && <CheckInBanner service={service} />}

      {/* Saldo tunai */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 p-5 text-white">
        <p className="text-xs opacity-80">Saldo Tunai Hari Ini (kasir)</p>
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

      {/* Ringkasan kanan: titipan + payout pending */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/retail/konsinyasi"
          className="rounded-xl border bg-card p-4 hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <PackageOpen size={16} className="text-purple-600" />
            <p className="text-xs text-muted-foreground">Barang Titipan</p>
          </div>
          <p className="mt-1 text-sm font-bold">{stats.itemCount} item</p>
          <p className="text-[11px] text-muted-foreground">
            nilai stok {formatCurrency(stats.consignmentValue)}
          </p>
        </Link>
        <Link
          href="/dashboard/retail/konsinyasi/serah-terima"
          className="rounded-xl border bg-card p-4 hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <ArrowUpRight size={16} className="text-amber-600" />
            <p className="text-xs text-muted-foreground">Payout Menunggu</p>
          </div>
          <p className="mt-1 text-sm font-bold text-amber-600">
            {formatCurrency(stats.pendingPayout)}
          </p>
          <p className="text-[11px] text-muted-foreground">hak pemilik titipan</p>
        </Link>
      </div>

      {/* Log kasir */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Log Kasir Hari Ini</h2>
        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="mx-auto animate-spin" />
          </p>
        ) : log.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Belum ada aktivitas
          </p>
        ) : (
          <div className="divide-y">
            {log.map((e) => (
              <div
                key={e.key}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <p className="min-w-0 truncate">{e.title}</p>
                <p
                  className={`shrink-0 font-semibold ${
                    e.dir === "in" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {e.dir === "in" ? "+" : "-"}
                  {formatCurrency(e.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckInBanner({ service }: { service: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
      <span className="font-medium">
        Shift aktif — Layanan:{" "}
        {service === "INVENTORY" ? "Inventori" : service === "POS" ? "Kasir POS" : "—"}
      </span>
      <Link href="/dashboard/retail/shift" className="font-semibold text-primary">
        Kelola shift →
      </Link>
    </div>
  );
}
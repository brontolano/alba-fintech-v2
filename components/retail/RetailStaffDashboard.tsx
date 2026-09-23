"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShoppingCart, Package, PackageOpen, ShoppingBag, Clock, LogOut } from "lucide-react";

export function RetailStaffDashboard() {
  const { data: session } = useSession();
  const user = session?.user;
  const unitName = (user as any)?.unitName || "Unit Retail";

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Selamat datang,</p>
            <h1 className="text-xl font-bold">{user?.name || "Staff"}</h1>
            <p className="text-sm opacity-80 mt-1">{unitName}</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <ShoppingCart className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Primary Action - POS */}
      <Link href="/dashboard/retail/pos" className="block">
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white shadow-lg hover:from-amber-600 hover:to-orange-700 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <p className="text-sm opacity-90">AKSI UTAMA</p>
              <h2 className="text-2xl font-bold">Buka POS Kasir</h2>
              <p className="text-sm opacity-80 mt-1">Layani santri • Proses transaksi • Cetak struk</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
        </div>
      </Link>

      {/* Secondary Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Cek Stok Barang", href: "/dashboard/retail/inventory", icon: <Package size={24} />, color: "bg-blue-500" },
          { label: "Barang Titipan (UMKM)", href: "/dashboard/retail/inventory/barang-titipan", icon: <PackageOpen size={24} />, color: "bg-amber-500" },
          { label: "Ajukan Belanja Stok", href: "/dashboard/retail/belanja", icon: <ShoppingBag size={24} />, color: "bg-violet-500" },
          { label: "Shift & Absensi", href: "/dashboard/retail/shift", icon: <Clock size={24} />, color: "bg-emerald-500" },
        ].map(action => (
          <Link key={action.href} href={action.href} className="group">
            <div className="rounded-xl border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color} text-white`}>
                  {action.icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground group-hover:text-primary">{action.label}</p>
                  <p className="text-xs text-muted-foreground">Buka halaman</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Info */}
      <div className="rounded-xl border bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">Info Shift</p>
        <p>Masuk shift via halaman <strong>Shift & Absensi</strong> sebelum buka POS. Pilih layanan: <span className="font-medium">POS</span> atau <span className="font-medium">INVENTORY</span>.</p>
      </div>
    </div>
  );
}
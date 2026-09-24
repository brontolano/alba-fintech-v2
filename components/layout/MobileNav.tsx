"use client";

import {
  Home,
  BarChart2,
  Wallet,
  User,
  Settings,
  ShoppingCart,
  Package,
  PackageOpen,
  Receipt,
  Clock,
  ClipboardList,
  Monitor,
  BookOpen,
  CalendarCheck,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface MobileNavProps {
  user: {
    role?: string;
    unitIsRetail?: boolean;
    unitType?: string;
  } | null;
  className?: string;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  isPrimary?: boolean;
};

export function MobileNav({ user }: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const getNavItems = (): NavItem[] => {
    const role = user?.role;
    const isRetail = user?.unitIsRetail === true;
    const isKpak = user?.unitType === "KPAK";

    switch (role) {
      // ── SUPERADMIN ──────────────────────────────
      // Pusat: Papan Pantau — overview global, ini yang paling penting
      // Sisa: Beranda, Transaksi, Laporan, Pengaturan
      case "SUPERADMIN":
        return [
          { label: "Beranda", href: "/dashboard", icon: <Home size={24} /> },
          {
            label: "Transaksi",
            href: "/dashboard/transactions",
            icon: <Receipt size={24} />,
          },
          {
            label: "Pantau",
            href: "/dashboard/monitor",
            icon: <Monitor size={24} />,
            isPrimary: true,
          },
          {
            label: "Laporan",
            href: "/dashboard/reports",
            icon: <BarChart2 size={24} />,
          },
          {
            label: "Pengaturan",
            href: "/dashboard/settings",
            icon: <Settings size={24} />,
          },
        ];

      // ── PIMPINAN ────────────────────────────────
      // Pusat: Pengajuan — approve/reject, keputusan inti pimpinan
      // Sisa: Beranda, Rekonsiliasi, Laporan, Profil
      case "PIMPINAN":
        return [
          { label: "Beranda", href: "/dashboard", icon: <Home size={24} /> },
          {
            label: "Rekonsiliasi",
            href: "/dashboard/reconciliation",
            icon: <Clock size={24} />,
          },
          {
            label: "Pengajuan",
            href: "/dashboard/approvals",
            icon: <ClipboardList size={24} />,
            isPrimary: true,
          },
          {
            label: "Laporan",
            href: "/dashboard/reports",
            icon: <BarChart2 size={24} />,
          },
          {
            label: "Profil",
            href: "/dashboard/profile",
            icon: <User size={24} />,
          },
        ];

      // ── MANAGER RETAIL ──────────────────────────
      // Pusat: POS — operasional harian utama retail
      // Sisa: Beranda, Transaksi, Laporan, Inventori
      case "MANAGER":
        if (isRetail) {
          return [
            {
              label: "Beranda",
              href: "/dashboard",
              icon: <Home size={24} />,
            },
            {
              label: "Transaksi",
              href: "/dashboard/transactions",
              icon: <Receipt size={24} />,
            },
            {
              label: "POS",
              href: "/dashboard/pos",
              icon: <ShoppingCart size={24} />,
              isPrimary: true,
            },
            {
              label: "Laporan",
              href: "/dashboard/reports",
              icon: <BarChart2 size={24} />,
            },
            {
              label: "Inventori",
              href: "/dashboard/inventory",
              icon: <Package size={24} />,
            },
          ];
        }
        // ── MANAGER & STAFF KPAK ──────────────────
        // Beranda | Santri | Shift Saya (pusat) | Rekap | Profil
        // Layanan dibuka dari Shift Saya (otomatis sesuai shift).
        if (isKpak) {
          return [
            { label: "Beranda", href: "/dashboard", icon: <Home size={24} /> },
            {
              label: "Santri",
              href: "/dashboard/kpak/students",
              icon: <BookOpen size={24} />,
            },
            {
              label: "Shift Saya",
              href: "/dashboard/kpak/shift",
              icon: <CalendarCheck size={24} />,
              isPrimary: true,
            },
            {
              label: "Rekap",
              href: "/dashboard/kpak/reports",
              icon: <BarChart2 size={24} />,
            },
            {
              label: "Profil",
              href: "/dashboard/profile",
              icon: <User size={24} />,
            },
          ];
        }
        // ── MANAGER NON-RETAIL ────────────────────
        // Pusat: Tabungan — aktivitas keuangan inti non-retail
        // Sisa: Beranda, Transaksi, Rekonsiliasi, Laporan
        return [
          { label: "Beranda", href: "/dashboard", icon: <Home size={24} /> },
          {
            label: "Transaksi",
            href: "/dashboard/transactions",
            icon: <Receipt size={24} />,
          },
          {
            label: "Tabungan",
            href: "/dashboard/savings",
            icon: <Wallet size={24} />,
            isPrimary: true,
          },
          {
            label: "Rekonsiliasi",
            href: "/dashboard/reconciliation",
            icon: <Clock size={24} />,
          },
          {
            label: "Laporan",
            href: "/dashboard/reports",
            icon: <BarChart2 size={24} />,
          },
        ];

      // ── STAFF RETAIL ────────────────────────────
      // Pusat: POS — operasional harian utama
      // Sisa: Beranda, Transaksi, Inventori, Laporan
      case "STAFF":
        if (isRetail) {
          return [
            {
              label: "Beranda",
              href: "/dashboard",
              icon: <Home size={24} />,
            },
            {
              label: "Titipan",
              href: "/dashboard/retail/inventory/barang-titipan",
              icon: <PackageOpen size={24} />,
            },
            {
              label: "POS",
              href: "/dashboard/pos",
              icon: <ShoppingCart size={24} />,
              isPrimary: true,
            },
            {
              label: "Inventori",
              href: "/dashboard/retail/inventory",
              icon: <Package size={24} />,
            },
            {
              label: "Laporan",
              href: "/dashboard/reports",
              icon: <BarChart2 size={24} />,
            },
          ];
        }
        // ── STAFF KPAK ────────────────────────────
        // Beranda | Santri | Shift Saya (pusat) | Rekap | Profil.
        // Layanan dibuka dari Shift Saya (otomatis sesuai shift).
        if (isKpak) {
          return [
            { label: "Beranda", href: "/dashboard", icon: <Home size={24} /> },
            {
              label: "Santri",
              href: "/dashboard/kpak/students",
              icon: <BookOpen size={24} />,
            },
            {
              label: "Shift Saya",
              href: "/dashboard/kpak/shift",
              icon: <CalendarCheck size={24} />,
              isPrimary: true,
            },
            {
              label: "Rekap",
              href: "/dashboard/kpak/reports",
              icon: <BarChart2 size={24} />,
            },
            {
              label: "Profil",
              href: "/dashboard/profile",
              icon: <User size={24} />,
            },
          ];
        }
        // ── STAFF NON-RETAIL ──────────────────────
        // Pusat: Tabungan — aktivitas harian utama
        // Sisa: Beranda, Transaksi, Kas, Profil
        return [
          { label: "Beranda", href: "/dashboard", icon: <Home size={24} /> },
          {
            label: "Transaksi",
            href: "/dashboard/transactions",
            icon: <Receipt size={24} />,
          },
          {
            label: "Tabungan",
            href: "/dashboard/savings",
            icon: <Wallet size={24} />,
            isPrimary: true,
          },
          {
            label: "Kas",
            href: "/dashboard/cash-unit",
            icon: <Receipt size={24} />,
          },
          {
            label: "Profil",
            href: "/dashboard/profile",
            icon: <User size={24} />,
          },
        ];

      // ── DEFAULT ─────────────────────────────────
      default:
        return [
          { label: "Beranda", href: "/dashboard", icon: <Home size={24} /> },
          {
            label: "Laporan",
            href: "/dashboard/reports",
            icon: <BarChart2 size={24} />,
          },
          {
            label: "Beranda",
            href: "/dashboard",
            icon: <Home size={24} />,
            isPrimary: true,
          },
          {
            label: "Profil",
            href: "/dashboard/profile",
            icon: <User size={24} />,
          },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.97))] pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_22px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(15,23,42,0.98))]">
      <div className="flex h-20 items-end justify-around px-2 pb-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          if ("isPrimary" in item && item.isPrimary) {
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="relative -mt-5 flex w-24 flex-col items-center justify-center"
                aria-label={item.label}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-gradient-to-br from-primary to-primary/80 text-white shadow-[0_12px_30px_rgba(15,118,110,0.35)] transition-transform duration-200 hover:scale-105">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                    {item.icon}
                  </div>
                </div>
                <span className="mt-1 text-[10px] font-semibold text-primary">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`relative flex h-full w-full flex-col items-center justify-center transition-all duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`${isActive ? "scale-110 rounded-xl bg-primary/10 p-2" : "scale-100 p-2"} transition-all duration-200`}
              >
                {item.icon}
              </div>
              <span className="mt-1 text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

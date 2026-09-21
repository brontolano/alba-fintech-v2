"use client";

import {
  Home,
  BarChart2,
  Wallet,
  User,
  Settings,
  ShoppingCart,
  Package,
  PiggyBank,
  Bell,
  Plus,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface MobileNavProps {
  user: {
    role?: string;
    unitIsRetail?: boolean;
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
    const canUseRetailModules =
      role === "SUPERADMIN" || user?.unitIsRetail === true;

    const primaryAction: NavItem = {
      label: "Pengumuman",
      href: "/dashboard/announcements",
      icon: <Bell size={24} />,
      isPrimary: true,
    };

    const base = [
      { label: "Home", href: "/dashboard", icon: <Home size={24} /> },
      {
        label: "Laporan",
        href: "/dashboard/reports",
        icon: <BarChart2 size={24} />,
      },
      primaryAction,
      {
        label: "Profil",
        href: "/dashboard/profile",
        icon: <User size={24} />,
      },
    ];

    switch (role) {
      case "SUPERADMIN":
        return [
          { label: "Home", href: "/dashboard", icon: <Home size={24} /> },
          {
            label: "Laporan",
            href: "/dashboard/reports",
            icon: <BarChart2 size={24} />,
          },
          primaryAction,
          {
            label: "Pengaturan",
            href: "/dashboard/settings",
            icon: <Settings size={24} />,
          },
          {
            label: "Profil",
            href: "/dashboard/profile",
            icon: <User size={24} />,
          },
        ];
      case "PIMPINAN":
        return [
          { label: "Home", href: "/dashboard", icon: <Home size={24} /> },
          {
            label: "Tabungan",
            href: "/dashboard/savings",
            icon: <Wallet size={24} />,
          },
          primaryAction,
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
      case "MANAGER":
        return [
          { label: "Home", href: "/dashboard", icon: <Home size={24} /> },
          ...(canUseRetailModules
            ? []
            : [
                {
                  label: "Kas",
                  href: "/dashboard/cash-unit",
                  icon: <Wallet size={24} />,
                },
              ]),
          primaryAction,
          ...(canUseRetailModules
            ? [
                {
                  label: "POS",
                  href: "/dashboard/pos",
                  icon: <ShoppingCart size={24} />,
                },
                {
                  label: "Inventori",
                  href: "/dashboard/inventory",
                  icon: <Package size={24} />,
                },
              ]
            : [
                {
                  label: "Laporan",
                  href: "/dashboard/reports",
                  icon: <BarChart2 size={24} />,
                },
              ]),
          {
            label: "Profil",
            href: "/dashboard/profile",
            icon: <User size={24} />,
          },
        ];
      case "STAFF":
        return [
          { label: "Home", href: "/dashboard", icon: <Home size={24} /> },
          ...(canUseRetailModules
            ? []
            : [
                {
                  label: "Kas",
                  href: "/dashboard/cash-unit",
                  icon: <Wallet size={24} />,
                },
              ]),
          primaryAction,
          ...(canUseRetailModules
            ? [
                {
                  label: "POS",
                  href: "/dashboard/pos",
                  icon: <ShoppingCart size={24} />,
                },
                {
                  label: "Inventori",
                  href: "/dashboard/inventory",
                  icon: <Package size={24} />,
                },
              ]
            : [
                {
                  label: "Tabungan",
                  href: "/dashboard/savings",
                  icon: <PiggyBank size={24} />,
                },
              ]),
          {
            label: "Profil",
            href: "/dashboard/profile",
            icon: <User size={24} />,
          },
        ];
      default:
        return base;
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
                    <Plus className="h-6 w-6" />
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

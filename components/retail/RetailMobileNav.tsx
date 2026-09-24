"use client";

import { useRouter, usePathname } from "next/navigation";
import { ShoppingCart, Package, PackageOpen, ShoppingBag, Wallet, BarChart2, User, Home, Plus, Store, Utensils, BookOpen, CalendarCheck, Clock, AlertCircle, ShoppingBag as ShoppingBagIcon } from "lucide-react";
import { getRetailNavItems, RETAIL_PRIMARY_ACTION } from "@/lib/retail/navigation";

interface RetailMobileNavProps {
  user: { role: "MANAGER" | "STAFF" } | null;
}

const ICONS: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart size={24} />,
  Package: <Package size={24} />,
  PackageOpen: <PackageOpen size={24} />,
  Plus: <Plus size={24} />,
  ShoppingBag: <ShoppingBagIcon size={24} />,
  Wallet: <Wallet size={24} />,
  BarChart2: <BarChart2 size={24} />,
  User: <User size={24} />,
  Home: <Home size={24} />,
  Store: <Store size={24} />,
  Utensils: <Utensils size={24} />,
  BookOpen: <BookOpen size={24} />,
  CalendarCheck: <CalendarCheck size={24} />,
  Clock: <Clock size={24} />,
  AlertCircle: <AlertCircle size={24} />,
};

function getIcon(name: string) {
  return ICONS[name] || <ShoppingCart size={24} />;
}

interface RetailMobileNavProps {
  user: { role: "MANAGER" | "STAFF" } | null;
}

export function RetailMobileNav({ user }: RetailMobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  if (!user) return null;

  const role = user.role as "MANAGER" | "STAFF";
  const { primary, secondary, tertiary } = getRetailNavItems(role);
  const primaryActionKey = RETAIL_PRIMARY_ACTION[role];
  const primaryItem = primary[0];

  // Mobile items: 4 secondary items + FAB for primary
  const mobileItems = secondary.slice(0, 4).map(item => ({
    key: item.key,
    label: item.label,
    href: item.href,
    icon: item.iconName,
  }));

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      {/* FAB - Primary Action (POS) */}
      <button
        onClick={() => router.push("/dashboard/retail/pos")}
        className="relative -mt-6 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-[0_8px_24px_rgba(249,115,22,0.4)] transition-transform hover:scale-105"
        aria-label="POS"
      >
        <ShoppingCart size={24} />
      </button>

      {/* Bottom Bar - 4 items */}
      <div className="flex h-16 items-end justify-around px-2 border-t border-border bg-white/95 backdrop-blur-xl shadow-[0_-6px_20px_rgba(0,0,0,0.05)] dark:bg-gray-900/95">
        {[
          { key: "pos", label: "POS", href: "/dashboard/retail/pos", iconName: "ShoppingCart" },
          { key: "inventory", label: "Stok", href: "/dashboard/retail/inventory", iconName: "Package" },
          { key: "belanja", label: "Belanja", href: "/dashboard/retail/belanja", iconName: "ShoppingBag" },
          { key: "laporan", label: "Laporan", href: "/dashboard/reports", iconName: "BarChart2" },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center justify-center flex-1 transition-colors ${
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label={item.label}
          >
            <div className={`transition-transform ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? "scale-110" : ""}`}>
              <div className="flex h-6 w-6 items-center justify-center">
                {ICONS[item.iconName]}
              </div>
            </div>
            <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
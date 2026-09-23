"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown, Store, ShoppingCart, ShoppingBag, Wallet, BarChart2, User, Package, PackageOpen, Plus, BookOpen, Utensils, Clock, AlertCircle } from "lucide-react";
import { 
  RETAIL_NAV_GROUPS, 
  RETAIL_PRIMARY_ACTION, 
  getRetailNavItems 
} from "@/lib/retail/navigation";

const ICONS: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart size={20} />,
  Package: <Package size={20} />,
  PackageOpen: <PackageOpen size={20} />,
  Plus: <Plus size={16} />,
  ShoppingBag: <ShoppingBag size={20} />,
  Wallet: <Wallet size={20} />,
  BarChart2: <BarChart2 size={20} />,
  User: <User size={20} />,
  BookOpen: <BookOpen size={16} />,
  Utensils: <Utensils size={16} />,
  Store: <Store size={16} />,
  Clock: <Clock size={20} />,
  AlertCircle: <AlertCircle size={20} />,
};

function getIcon(name: string, size = 20) {
  return ICONS[name] || <Store size={size} />;
}

interface RetailSidebarProps {
  user: { role: "MANAGER" | "STAFF"; unitId: string; unitName: string } | null;
  expanded: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function RetailSidebar({ user, expanded, onToggle, mobileOpen, onCloseMobile }: RetailSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  if (!user) return null;

  const isActive = (href: string) => 
    pathname === href || pathname.startsWith(`${href}/`);

  const renderItem = (item: any, depth = 0) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = hasChildren && (active || item.children?.some((c: any) => isActive(c.href)));

    if (hasChildren) {
      return (
        <div key={item.key} className={depth > 0 ? "ml-4" : ""}>
          <button
            onClick={() => {}}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
              active 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <div className="flex-shrink-0 w-5 h-5">{getIcon(item.iconName, 20)}</div>
            {expanded && <span className="flex-1 truncate">{item.label}</span>}
            {expanded && <ChevronDown className={`${isOpen ? "rotate-180" : ""} transition-transform text-xs`} />}
          </button>
          {expanded && isOpen && (
            <div className="mt-1 space-y-1">
              {item.children!.map((child: any) => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.key}
        onClick={() => { router.push(item.href); onCloseMobile?.(); }}
        className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
          item.primary 
            ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
            : active 
              ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/10"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        title={expanded ? undefined : item.label}
      >
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{getIcon(item.iconName, 20)}</div>
        {expanded && <span className="flex-1 truncate font-medium">{item.label}</span>}
        {item.primary && expanded && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            UTAMA
          </span>
        )}
      </button>
    );
  };

  const role = user.role as "MANAGER" | "STAFF";
  const { primary, secondary, tertiary } = getRetailNavItems(role);
  const primaryItem = primary[0];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card/95 backdrop-blur-xl transition-transform duration-300 ${
      mobileOpen ? "translate-x-0" : "-translate-x-full"
    } ${expanded ? "w-64" : "w-20"} md:relative md:translate-x-0 md:w-auto`}>
      {/* Logo & Toggle */}
      <div className="flex items-center justify-between h-16 px-3 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          {expanded && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-semibold">Retail Dashboard</h1>
              <p className="text-[10px] text-muted-foreground">{user.unitName}</p>
            </div>
          )}
        </div>
        <button onClick={() => mobileOpen ? onCloseMobile?.() : onToggle()} className="md:hidden p-2 rounded-xl hover:bg-muted">
          <ChevronLeft size={20} />
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {/* PRIMARY ACTION - Always visible at top */}
        {primary[0] && (
          <button
            onClick={() => { router.push(primary[0].href); onCloseMobile?.(); }}
            className="w-full flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-3 text-white font-semibold shadow-lg hover:from-amber-600 hover:to-orange-700 transition-all"
          >
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-white/20 rounded-lg">{getIcon(primary[0].iconName, 24)}</div>
            {expanded && <span className="font-semibold">{primary[0].label} <span className="text-[10px] opacity-80">UTAMA</span></span>}
          </button>
        )}

        <div className="my-3 border-t" />
        {expanded && <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">MENU UTAMA</p>}

        {/* SECONDARY */}
        {secondary.map(item => (
          <div key={item.key}>{renderItem(item)}</div>
        ))}

        <div className="my-3 border-t" />
        {expanded && <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">LAINNYA</p>}

        {/* TERTIARY */}
        {tertiary.map(item => (
          <button
            key={item.key}
            onClick={() => { router.push(item.href); onCloseMobile?.(); }}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
              isActive(item.href) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <div className="flex-shrink-0 w-5 h-5">{getIcon(item.iconName, 20)}</div>
            {expanded && <span className="truncate">{item.label}</span>}
          </button>
        ))}

        {/* Unit Switcher */}
        {expanded && (
          <div className="mt-auto p-3 border-t">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2">UNIT AKTIF</p>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium truncate">{user.unitName}</span>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}

interface RetailSidebarProps {
  user: { role: "MANAGER" | "STAFF"; unitId: string; unitName: string } | null;
  expanded: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}
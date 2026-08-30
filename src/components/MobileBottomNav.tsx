'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  FileText,
  Package,
  ShoppingCart,
  ClipboardList,
  BarChart3,
  Bot,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useUnitInfo } from '@/lib/useUnitInfo';

interface MobileBottomNavProps {
  role?: string;
  unitId?: string | null;
}

/**
 * Mobile bottom navigation with exactly 5 visible icons (no overlay).
 * The center icon (index 2) is a "hero" button — larger, circular, elevated.
 * All 5 items are direct links to pages. Items not featured here
 * (e.g. Audit Log) are available as Quick Menu grid on the dashboard page.
 *
 * Menu assignment by role:
 *   STAFF    → [Dashboard] [Transaksi] [POS Hero] [Inventaris] [AI Assistant]
 *   MANAGER  → [Dashboard] [Transaksi] [POS Hero] [Inventaris] [AI Assistant]
 *   PIMPINAN → [Dashboard] [Transaksi] [Approval] [Reports]  [AI Assistant]
 *   SUPERADMIN → not rendered (desktop-only)
 *
 * POS & Inventory only shown when unit.isRetail === true.
 * Menu not featured in the 5-icon nav (e.g. Audit Log) are accessible
 * via the Quick Menu grid on each dashboard page.
 */
export default function MobileBottomNav({ role, unitId }: MobileBottomNavProps) {
  const [pathname, setPathname] = useState('');
  const currentPath = usePathname();

  useEffect(() => {
    setPathname(currentPath);
  }, [currentPath]);

  // Fetch unit info to determine if POS/Inventory should show
  const isSuperAdmin = role === 'SUPERADMIN';
  const { unit: unitInfo, loading: unitLoading } = useUnitInfo(unitId);
  const isRetailUnit = unitInfo?.isRetail ?? false;
  const isPimpinan = role === 'PIMPINAN';
  const rolePrefix = role ? role.toLowerCase() : 'staff';

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const handleNavClick = (href: string) => {
    setPathname(href);
    window.location.href = href;
  };

  // For SuperAdmin override (desktop-only), this component returns null
  if (isSuperAdmin) {
    return null;
  }

  // Role-based 5-item layout (index 2 is always the "hero" button).
  //   Pimpinan      → Dashboard | Transaksi | Approval | Reports  | AI Assistant
  //   Staff/Manager → Dashboard | Transaksi | POS Hero | Inventaris | AI Assistant  (if retail unit)
  //   Staff/Manager (non-retail) → Dashboard | Transaksi | Rekonsiliasi | ... | AI Assistant
  let mainNav: { href: string; label: string; icon: React.ElementType; hero?: boolean }[];

  if (isPimpinan) {
    mainNav = [
      { href: '/dashboard', label: 'Dashboard', icon: Home },
      { href: `/dashboard/${rolePrefix}/transactions`, label: 'Transaksi', icon: FileText },
      { href: `/dashboard/${rolePrefix}/approvals`, label: 'Approval', icon: ClipboardList, hero: true },
      { href: `/dashboard/${rolePrefix}/financial-notes`, label: 'Keuangan', icon: FileText },
      { href: `/dashboard/${rolePrefix}/ai-assistant`, label: 'AI', icon: Bot },
    ];
  } else if (isRetailUnit) {
    // Retail unit — show POS & Inventory
    mainNav = [
      { href: '/dashboard', label: 'Dashboard', icon: Home },
      { href: `/dashboard/${rolePrefix}/transactions`, label: 'Transaksi', icon: FileText },
      { href: `/dashboard/${rolePrefix}/pos`, label: 'POS', icon: ShoppingCart, hero: true },
      { href: `/dashboard/${rolePrefix}/inventory`, label: 'Inventaris', icon: Package },
      { href: `/dashboard/${rolePrefix}/ai-assistant`, label: 'AI', icon: Bot },
    ];
  } else {
    // Non-retail unit — replace POS with Rekonsiliasi, Inventory stays accessible via dashboard quick menu
    mainNav = [
      { href: '/dashboard', label: 'Dashboard', icon: Home },
      { href: `/dashboard/${rolePrefix}/transactions`, label: 'Transaksi', icon: FileText },
      { href: `/dashboard/${rolePrefix}/rekonsiliasi`, label: 'Rekon', icon: FileText, hero: true },
      { href: `/dashboard/${rolePrefix}/ai-assistant`, label: 'AI', icon: Bot },
      { href: '/dashboard', label: 'Menu', icon: BarChart3 }, // placeholder quick menu
    ];
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-[100] bg-white border-t border-slate-200 shadow-lg"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
    >
      <div className="grid grid-cols-5 items-center h-16 px-2 max-w-screen-xl mx-auto relative">
        {mainNav.map((item, idx) => {
          const Icon = item.icon;
          const active = item.hero ? false : isActive(item.href);

          if (item.hero) {
            return (
              <button
                key={`hero-${idx}`}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  'flex flex-col items-center justify-center',
                  'w-16 h-16 rounded-full bg-brand-600 text-white',
                  'shadow-lg shadow-brand-600/30 hover:bg-brand-700',
                  'transition-all duration-200',
                  'col-span-1 place-self-center',
                )}
                aria-label={item.label}
              >
                <Icon size={28} strokeWidth={2.5} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={`${item.label}-${item.href}`}
              onClick={() => handleNavClick(item.href)}
              className={cn(
                'flex flex-col items-center justify-center py-2 rounded-lg transition-all duration-200',
                active
                  ? 'text-brand-600 bg-brand-50'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
              aria-label={item.label}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

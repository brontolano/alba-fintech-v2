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

interface MobileBottomNavProps {
  role?: string;
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
 *   PIMPINAN → [Dashboard] [Transaksi] [POS Hero] [Approval] [AI Assistant]
 *   SUPERADMIN → not rendered (desktop-only)
 *
 * Menu not featured in the 5-icon nav (e.g. Audit Log) are accessible
 * via the Quick Menu grid on each dashboard page.
 */
export default function MobileBottomNav({ role }: MobileBottomNavProps) {
  const [pathname, setPathname] = useState('');
  const currentPath = usePathname();

  useEffect(() => {
    setPathname(currentPath);
  }, [currentPath]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const handleNavClick = (href: string) => {
    setPathname(href);
    window.location.href = href;
  };

  // For SuperAdmin override (desktop-only), this component returns null
  if (role === 'SUPERADMIN') {
    return null;
  }

  const isPimpinan = role === 'PIMPINAN';
  const rolePrefix = role ? role.toLowerCase() : 'staff';

  // Role-based 5-item layout (index 2 is always the hero button)
  // Uses role-prefixed routes to match Sidebar navigation
  const mainNav: { href: string; label: string; icon: React.ElementType; hero?: boolean }[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: `/dashboard/${rolePrefix}/transactions`, label: 'Transaksi', icon: FileText },
    { href: `/dashboard/${rolePrefix}/pos`, label: 'POS', icon: ShoppingCart, hero: true },
    isPimpinan
      ? { href: `/dashboard/${rolePrefix}/approvals`, label: 'Approval', icon: ClipboardList }
      : { href: `/dashboard/${rolePrefix}/inventory`, label: 'Inventaris', icon: Package },
    { href: `/dashboard/${rolePrefix}/ai-assistant`, label: 'AI', icon: Bot },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[100] bg-white border-t border-slate-200 shadow-lg">
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

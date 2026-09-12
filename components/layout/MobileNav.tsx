'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Receipt,
  Package,
  ShoppingCart,
  BarChart3,
  ClipboardList,
  FileText,
  Settings,
  Users,
  LayoutGrid,
  MoreVertical,
  LogOut,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface MobileNavProps {
  user: {
    role?: string;
  } | null;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
};

export function MobileNav({ user }: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const role = user?.role || 'STAFF';
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard size={20} />,
      roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'],
    },
    {
      label: 'Transaksi',
      href: '/dashboard/transactions',
      icon: <Receipt size={20} />,
      roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'],
    },
    {
      label: 'Nota',
      href: '/dashboard/financial-notes',
      icon: <FileText size={20} />,
      roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'],
    },
    {
      label: 'Persetujuan',
      href: '/dashboard/approvals',
      icon: <ClipboardList size={20} />,
      roles: ['SUPERADMIN', 'PIMPINAN'],
    },
    {
      label: 'Inventori',
      href: '/dashboard/inventory',
      icon: <Package size={20} />,
      roles: ['SUPERADMIN', 'MANAGER', 'STAFF'],
    },
    {
      label: 'POS',
      href: '/dashboard/pos',
      icon: <ShoppingCart size={20} />,
      roles: ['SUPERADMIN', 'MANAGER', 'STAFF'],
    },
    {
      label: 'Laporan',
      href: '/dashboard/reports',
      icon: <BarChart3 size={20} />,
      roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'],
    },
    {
      label: 'Unit',
      href: '/dashboard/units',
      icon: <LayoutGrid size={20} />,
      roles: ['SUPERADMIN'],
    },
    {
      label: 'Pengguna',
      href: '/dashboard/users',
      icon: <Users size={20} />,
      roles: ['SUPERADMIN'],
    },
    {
      label: 'Pengaturan',
      href: '/dashboard/settings',
      icon: <Settings size={20} />,
      roles: ['SUPERADMIN'],
    },
    {
      label: 'Keluar',
      href: '#logout',
      icon: <LogOut size={20} />,
      roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'],
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  // Logout is always separate
  const logoutItem = visibleNavItems.find((item) => item.href === '#logout');
  const navItemsExcludingLogout = visibleNavItems.filter((item) => item.href !== '#logout');

  // Limit to 5 main items, rest go to "more" menu
  const mainItems = navItemsExcludingLogout.slice(0, 5);
  const moreItems = navItemsExcludingLogout.slice(5);

  const handleLogout = () => {
    setMoreOpen(false);
    signOut();
  };

  const handleMoreClick = (href: string) => {
    setMoreOpen(false);
    router.push(href);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around py-2">
          {mainItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                  isActive
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}
          {moreItems.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                  moreOpen
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MoreVertical size={20} />
                <span className="text-xs mt-1 font-medium">Lainnya</span>
              </button>
              {moreOpen && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-lg p-1 min-w-[160px] z-50">
                  {moreItems.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleMoreClick(item.href)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-slate-50 text-slate-600"
                    >
                      {item.icon}
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  ))}
                  {logoutItem && (
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-red-50 text-red-600"
                    >
                      {logoutItem.icon}
                      <span className="whitespace-nowrap">{logoutItem.label}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {logoutItem && moreItems.length === 0 && (
            <button
              onClick={handleLogout}
              className="flex flex-col items-center py-2 px-3 rounded-lg transition-colors text-red-600 hover:bg-red-50"
            >
              <LogOut size={20} />
              <span className="text-xs mt-1 font-medium">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

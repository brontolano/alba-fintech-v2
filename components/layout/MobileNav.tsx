'use client';

import {
  LayoutDashboard,
  Receipt,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from 'next-auth';

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
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-50">
      <div className="flex justify-around py-2">
        {visibleNavItems.map((item) => {
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
      </div>
    </div>
  );
}

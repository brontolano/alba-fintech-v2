'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  FileText as FileTextIcon,
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Package,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Clock,
} from 'lucide-react';

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    unitId?: string | null;
    lembagaId?: string | null;
  } | null;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  divider?: boolean;
};

export function Sidebar({ user }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const role = user?.role || 'STAFF';

  // Navigation items by role
  const allNavItems: NavItem[] = [
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
      label: 'Catatan Keuangan',
      href: '/dashboard/financial-notes',
      icon: <FileTextIcon size={20} />,
      roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'],
    },
    {
      label: 'Persetujuan',
      href: '/dashboard/approvals',
      icon: <ClipboardList size={20} />,
      roles: ['SUPERADMIN', 'PIMPINAN'],
    },
    {
      divider: true,
      label: 'Manajemen Unit',
      href: '/dashboard/units',
      icon: <LayoutGrid size={20} />,
      roles: ['SUPERADMIN'],
    },
    {
      label: 'Manajemen Pengguna',
      href: '/dashboard/users',
      icon: <Users size={20} />,
      roles: ['SUPERADMIN'],
    },
    {
      divider: true,
      label: 'Inventori',
      href: '/dashboard/inventory',
      icon: <Package size={20} />,
      roles: ['SUPERADMIN', 'MANAGER', 'STAFF'],
    },
    {
      label: 'Point of Sale',
      href: '/dashboard/pos',
      icon: <ShoppingCart size={20} />,
      roles: ['SUPERADMIN', 'MANAGER', 'STAFF'],
    },
    {
      divider: true,
      label: 'Laporan',
      href: '/dashboard/reports',
      icon: <BarChart3 size={20} />,
      roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'],
    },
    {
      label: 'Rekonsiliasi',
      href: '/dashboard/reconciliation',
      icon: <Clock size={20} />,
      roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'],
    },
    {
      divider: true,
      label: 'Pengaturan',
      href: '/dashboard/settings',
      icon: <Settings size={20} />,
      roles: ['SUPERADMIN'],
    },
  ];

  const visibleNavItems = allNavItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:bg-white md:border-r md:border-slate-200 md:overflow-y-auto md:min-h-screen">
      <nav className="py-4">
        {visibleNavItems.map((item, index) => {
          const isDivider = !item.roles && item.divider;
          const isActive = pathname === item.href;
          const showDivider = index > 0 && (isDivider || visibleNavItems[index - 1]?.divider);

          return (
            <div key={item.href}>
              {showDivider && (
                <div className="h-px bg-slate-200 my-2 mx-4"></div>
              )}
              <button
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600 border-r-2 border-emerald-600'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }}`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto py-4 border-t border-slate-200">
        <button
          onClick={() => router.push('/login')}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Keluar</span>
        </button>
      </div>
    </aside>
  );
}

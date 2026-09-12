'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Receipt,
  FileText as FileTextIcon,
  ClipboardList,
  LayoutGrid,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  Clock,
  Settings,
  User,
  LogOut,
  ChevronLeft,
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
};

// Navigation items with role-based visibility
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'] },
  { label: 'Transaksi', href: '/dashboard/transactions', icon: <Receipt size={20} />, roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'] },
  { label: 'Catatan Keuangan', href: '/dashboard/financial-notes', icon: <FileTextIcon size={20} />, roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'] },
  { label: 'Persetujuan', href: '/dashboard/approvals', icon: <ClipboardList size={20} />, roles: ['SUPERADMIN', 'PIMPINAN'] },
  { label: 'Unit', href: '/dashboard/units', icon: <LayoutGrid size={20} />, roles: ['SUPERADMIN'] },
  { label: 'Pengguna', href: '/dashboard/users', icon: <Users size={20} />, roles: ['SUPERADMIN'] },
  { label: 'Inventori', href: '/dashboard/inventory', icon: <Package size={20} />, roles: ['SUPERADMIN', 'MANAGER', 'STAFF'] },
  { label: 'POS', href: '/dashboard/pos', icon: <ShoppingCart size={20} />, roles: ['SUPERADMIN', 'MANAGER', 'STAFF'] },
  { label: 'Laporan', href: '/dashboard/reports', icon: <BarChart3 size={20} />, roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'] },
  { label: 'Rekonsiliasi', href: '/dashboard/reconciliation', icon: <Clock size={20} />, roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'] },
  { label: 'Pengaturan', href: '/dashboard/settings', icon: <Settings size={20} />, roles: ['SUPERADMIN'] },
  { label: 'Profil', href: '/dashboard/profile', icon: <User size={20} />, roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'] },
  { label: 'Keluar', href: '#', icon: <LogOut size={20} />, roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'] },
];

export function Sidebar({ user }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const role = user?.role || 'STAFF';
  const [expanded, setExpanded] = useState(true);

  // Persist expanded state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar:expanded');
    if (saved !== null) setExpanded(saved === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar:expanded', String(expanded));
  }, [expanded]);

  // Filter items by role
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
  const isActive = (href: string) => pathname === href;

  return (
    <aside className="hidden md:flex md:flex-col md:bg-white md:border-r md:border-slate-200 md:overflow-y-auto md:min-h-screen transition-all duration-300 relative" style={{ width: expanded ? '180px' : '56px', minWidth: '56px', maxWidth: '180px' }}>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute -right-3 top-8 bg-white border border-slate-200 rounded-full p-1.5 shadow-md hover:bg-slate-50 transition-all z-50 flex items-center justify-center"
        title={expanded ? 'Seminat' : 'Perbanyak'}
      >
        <ChevronLeft size={16} className={`text-slate-600 transition-transform duration-300 ${!expanded ? 'rotate-180' : ''}`} />
      </button>

      <nav className="py-4 flex flex-col gap-0.5 mt-2">
        {items.map((item) => {
          const isActiveItem = isActive(item.href);
          
          return (
            <button
              key={item.href}
              onClick={() => {
                if (item.href === '#') {
                  signOut();
                } else {
                  if (!expanded) setExpanded(true);
                  router.push(item.href);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                isActiveItem ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                {item.icon}
                <span className={`font-medium text-sm whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0'} truncate`}>{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

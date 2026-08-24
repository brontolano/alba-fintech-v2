'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Wallet,
  CheckSquare,
  Package,
  Bot,
  ScrollText,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import type { Role } from '@prisma/client';
import type { LucideIcon } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Badge } from '@/components/ui';

type IconType = LucideIcon;

type NavItem = {
  label: string;
  href: string;
  icon: IconType;
  roles: Role[];
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
};

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'] },
  { label: 'Manajemen User', href: '/dashboard/superadmin/users', icon: Users, roles: ['SUPERADMIN'], badge: 'Admin', badgeVariant: 'info' },
  { label: 'Manajemen Unit', href: '/dashboard/superadmin/units', icon: Building2, roles: ['SUPERADMIN'], badge: 'Admin', badgeVariant: 'info' },
  { label: 'Transaksi', href: '/dashboard/transactions', icon: Wallet, roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'], badge: 'Core', badgeVariant: 'success' },
  { label: 'Approval', href: '/dashboard/approvals', icon: CheckSquare, roles: ['SUPERADMIN', 'PIMPINAN'], badge: 'Pending', badgeVariant: 'warning' },
  { label: 'Inventory / POS', href: '/dashboard/inventory', icon: Package, roles: ['SUPERADMIN', 'MANAGER', 'STAFF'] },
  { label: 'AI Assistant', href: '/dashboard/ai', icon: Bot, roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'], badge: 'Beta', badgeVariant: 'info' },
  { label: 'Audit Log', href: '/dashboard/audit', icon: ScrollText, roles: ['SUPERADMIN'] },
];

const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: 'Super Admin',
  PIMPINAN: 'Pimpinan',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

export default function Sidebar({ role, name }: { role: Role; name?: string | null }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(role));
  const roleLabel = ROLE_LABEL[role];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 hidden lg:flex">
      <div className="px-6 py-5 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-brand-700">ALBA Finance</span>
        </Link>
        <p className="text-xs text-slate-500 mt-2">{roleLabel}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-brand-600' : 'text-slate-400'} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <Badge variant={item.badgeVariant || 'default'} className="shrink-0">
                  {item.badge}
                </Badge>
              )}
              {!isActive && <ChevronRight size={16} className="text-slate-300" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-200">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-slate-800 truncate">{name ?? 'User'}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={18} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}

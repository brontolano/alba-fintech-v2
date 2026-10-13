// components/santri/Nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from './Badge';

interface NavProps {
  role?: string;
}

export function Nav({ role = 'SUPERADMIN' }: NavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/santris', label: 'Data Santri', icon: 'users' },
    { href: '/tabungans', label: 'Tabungan', icon: 'wallet' },
    { href: '/tagihans', label: 'Tagihan', icon: 'file-text' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-gray-800">ALBA Finance</span>
              <span className="text-xs text-gray-500 font-medium">| KPAK</span>
            </Link>
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge status="ACTIVE" />
            <span className="text-sm text-gray-600 hidden sm:inline">
              Role: <span className="font-semibold text-gray-800">{role}</span>
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

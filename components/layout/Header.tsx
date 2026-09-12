'use client';

import { useState } from 'react';
import { Search, UserCircle } from 'lucide-react';
import Image from 'next/image';

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const [searchValue, setSearchValue] = useState('');
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    if (searchDebounce) clearTimeout(searchDebounce);

    const timeout = setTimeout(() => {
      if (value.length >= 2) {
        window.location.href = `/dashboard/transactions?search=${encodeURIComponent(value)}`;
      }
    }, 300);
    setSearchDebounce(timeout);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-between shadow-sm">
      {/* Logo & Title */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200">
          <Image
            src="/logo-baru.png"
            alt="Logo Al-Basyariyah"
            width={36}
            height={36}
            className="object-contain"
          />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-base font-semibold text-slate-800 leading-tight">
            AL-Basyariyah Finance
          </h1>
          <p className="text-xs text-slate-500 leading-none">
            Pondok Pesantren
          </p>
        </div>
      </div>

      {/* User Profile - Clickable avatar */}
      <a href="/dashboard/profile" className="flex items-center gap-1 hover:opacity-80 transition-opacity active:scale-95">
        {user?.image ? (
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center overflow-hidden border-2 border-slate-100 shadow-inner">
            <Image
              src={user.image}
              alt={user.name || 'User'}
              fill
              className="object-cover rounded-full"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center border-2 border-slate-100 shadow-inner">
            <span className="text-base font-bold text-white">
              {user?.name?.[0] || 'U'}
            </span>
          </div>
        )}
      </a>
    </header>
  );
}
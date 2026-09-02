'use client';

import { Bell, Search, UserCircle } from 'lucide-react';
import Image from 'next/image';

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    unitId?: string | null;
    lembagaId?: string | null;
  } | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      {/* Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
          <Image
            src="/logo-baru.png"
            alt="Logo Al-Basyariyah"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold text-slate-800">
            AL-Basyariyah Finance
          </h1>
          <p className="text-xs text-slate-500">
            Pondok Pesantren Al-Basyariyah
          </p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search */}
        <div className="hidden md:block relative">
          <input
            type="text"
            placeholder="Cari..."
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          {user?.image ? (
            <div className="relative w-9 h-9 rounded-full overflow-hidden">
              <Image
                src={user.image}
                alt={user.name || 'User'}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
              <UserCircle size={24} className="text-slate-500" />
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-800">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {user?.role || 'Staff'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Search, UserCircle, User, Settings, LogOut, Calendar } from 'lucide-react';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

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

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  createdAt: string;
}

export function Header({ user }: HeaderProps) {
  const [searchValue, setSearchValue] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch('/api/notifications?unreadOnly=false&limit=5');
      if (!res.ok) throw new Error('Gagal memuat notifikasi');
      const data = await res.json();
      setNotifications(data.data ?? []);
      setUnreadCount(data.summary?.unreadCount ?? 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Search handler with debounce
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    // Debounce: clear existing timeout
    if (searchDebounce) clearTimeout(searchDebounce);

    // Set new timeout - perform search after 300ms of no typing
    const timeout = setTimeout(() => {
      if (value.length >= 2) {
        // Redirect to transactions search or perform search
        // For now, show a toast - in a full implementation this would route to search
        toast.info(`Cari: "${value}"`);
      }
    }, 300);
    setSearchDebounce(timeout);
  };

  // Mark notification as read
  const markNotificationRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  // Mark all as read
  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  // Get notification type color
  const getNotifColor = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'bg-green-500';
      case 'WARNING':
        return 'bg-yellow-500';
      case 'ERROR':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

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
        <div className="hidden md:block relative w-64">
          <input
            type="text"
            placeholder="Cari..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) {
                fetchNotifications();
              }
            }}
            className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <h3 className="font-semibold text-slate-800">Notifikasi</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Tandai Semua Dibaca
                  </button>
                )}
              </div>
              {loadingNotifications ? (
                <div className="px-4 py-3 text-sm text-slate-500">
                  Memuat notifikasi...
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 text-center">
                  Tidak ada notifikasi
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        !notif.isRead ? 'bg-emerald-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        if (!notif.isRead) markNotificationRead(notif.id);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getNotifColor(notif.type)}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {format(new Date(notif.createdAt), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3 relative" ref={userRef}>
          {user?.image ? (
            <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-slate-200">
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
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  (user?.role as string) === 'SUPERADMIN'
                    ? 'bg-purple-100 text-purple-700'
                    : (user?.role as string) === 'PIMPINAN'
                    ? 'bg-emerald-100 text-emerald-700'
                    : (user?.role as string) === 'MANAGER'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {(user?.role as string) === 'SUPERADMIN'
                  ? '👑'
                  : (user?.role as string) === 'PIMPINAN'
                  ? '🏢'
                  : (user?.role as string) === 'MANAGER'
                  ? '🧑‍💼'
                  : '👤'}
              </span>
              <span className="text-xs text-slate-500 capitalize">
                {user?.role || 'Staff'}
              </span>
              {user?.unitId && (
                <span className="text-xs text-slate-400">
                  ({user?.unitId})
                </span>
              )}
            </div>
          </div>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
              <button className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                <User size={14} />
                <span>Profil Saya</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                <Settings size={14} />
                <span>Pengaturan</span>
              </button>
              <div className="border-t border-slate-200 my-1"></div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={14} />
                <span>Keluar</span>
              </button>
            </div>
          )}

          {/* Toggle arrow for user menu */}
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="ml-1 p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition"
          >
            <Calendar size={12} />
          </button>
        </div>
      </div>
    </header>
  );
}
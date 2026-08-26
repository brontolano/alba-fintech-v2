'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui';

interface Notification {
  id: string;
  userId?: string | null;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  createdAt: string;
}

const POLL_INTERVAL = 15000;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        if (res.status !== 401) {
          console.error('Error fetching notifications:', res.statusText);
        }
        return;
      }
      const data = await res.json();
      setNotifications(data.data ?? []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications?action=markRead&id=${id}`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      toast.error('Gagal menandai notifikasi sebagai dibaca');
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications?action=markAllRead', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      toast.error('Gagal menandai semua notifikasi sebagai dibaca');
    }
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const typeColor = (type: string) => {
    switch (type) {
      case 'SUCCESS': return 'text-green-600';
      case 'WARNING': return 'text-amber-600';
      case 'ERROR': return 'text-red-600';
      default: return 'text-sky-600';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition">
        <Bell size={20} />
        {unreadCount > 0 && (
          <Badge variant="danger" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0.5 text-xs">
            {unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifikasi</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Tandai semua dibaca
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="p-4 text-center text-sm text-slate-500">Memuat...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            Tidak ada notifikasi
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="border-b border-slate-50 last:border-0">
              <div
                className="px-3 py-2 flex items-start justify-between gap-2 cursor-pointer hover:bg-slate-50"
                onClick={() => {
                  if (!n.isRead) markRead(n.id);
                  toast.info(n.title, { description: n.message });
                }}
              >
                <div className="flex-1">
                  <p className={`font-medium text-sm ${typeColor(n.type)}`}>{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.isRead && <div className="w-2 h-2 bg-brand-600 rounded-full shrink-0 mt-0.5" />}
              </div>
              <button
                onClick={() => dismiss(n.id)}
                className="ml-2 mb-1 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

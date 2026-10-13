// components/santri/NotificationBell.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from './Button';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { Notification } from '../../types/santri';

interface NotificationBellProps {
  userId: string;
  className?: string;
}

export function NotificationBell({ userId, className = '' }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [markLoading, setMarkLoading] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/notifications?userId=${userId}&limit=20`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat notifikasi');
      const data = await res.json();
      setNotifications(data.data || []);
      setUnreadCount((data.data || []).filter((n: Notification) => !n.isRead).length);
    } catch (err: any) {
      console.error('Fetch notifications error:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkRead = async (notification: Notification) => {
    if (notification.isRead) return;
    setMarkLoading(notification.id);
    try {
      const res = await fetch(`/api/notifications/${notification.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      if (!res.ok) throw new Error('Gagal menandai dibaca');
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Mark read error:', err);
    } finally {
      setMarkLoading(null);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    try {
      await Promise.all(unreadIds.map(id => 
        fetch(`/api/notifications/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        })
      ));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Mark all read error:', err);
    }
  };

  const openDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setDetailOpen(true);
    if (!notification.isRead) {
      handleMarkRead(notification);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins}m yang lalu`;
    if (diffHours < 24) return `${diffHours}j yang lalu`;
    if (diffDays < 7) return `${diffDays}h yang lalu`;
    return date.toLocaleDateString('id-ID');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LOW_BALANCE':
        return (
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'PAYMENT_DUE':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'APPROVAL_REQUEST':
        return (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'LOW_BALANCE': return 'Saldo Menipis';
      case 'PAYMENT_DUE': return 'Jatuh Tempo';
      case 'APPROVAL_REQUEST': return 'Persetujuan';
      default: return 'Info';
    }
  };

  const getTypeColor = (type: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (type) {
      case 'LOW_BALANCE': return 'warning';
      case 'PAYMENT_DUE': return 'info';
      case 'APPROVAL_REQUEST': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative p-2"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {dropdownOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setDropdownOpen(false)} 
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Notifikasi</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button variant="link" size="sm" onClick={handleMarkAllRead}>
                    Tandai semua dibaca
                  </Button>
                )}
                <Button variant="link" size="sm" onClick={() => setDropdownOpen(false)}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="spinner mx-auto"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Tidak ada notifikasi
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map(notification => (
                    <button
                      key={notification.id}
                      onClick={() => openDetail(notification)}
                      className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`font-medium text-sm ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={getTypeColor(notification.type)} className="text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200">
              <Link 
                href="/notifications" 
                className="block text-center text-sm text-blue-600 hover:underline"
                onClick={() => setDropdownOpen(false)}
              >
                Lihat semua notifikasi
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedNotification(null); }}
        title={selectedNotification?.title || 'Detail Notifikasi'}
        description={selectedNotification ? formatTime(selectedNotification.createdAt) : ''}
        actionLabel="Tutup"
        onAction={() => { setDetailOpen(false); setSelectedNotification(null); }}
        variant="primary"
        customContent={
          selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {getTypeIcon(selectedNotification.type)}
                <div>
                  <p className="font-medium">{getTypeLabel(selectedNotification.type)}</p>
                  <p className="text-sm text-gray-500">{formatTime(selectedNotification.createdAt)}</p>
                </div>
              </div>
              <div className="prose prose-sm max-w-none">
                <p>{selectedNotification.message}</p>
              </div>
              {selectedNotification.referenceId && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p className="font-medium">Referensi:</p>
                  <p className="font-mono text-gray-600">{selectedNotification.referenceType}: {selectedNotification.referenceId}</p>
                </div>
              )}
            </div>
          )
        }
      />
    </div>
  );
}
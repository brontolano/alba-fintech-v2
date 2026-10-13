// app/notifications/NotificationsClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '../../components/santri/Button';
import { Badge } from '../../components/santri/Badge';
import { Input } from '../../components/santri/Input';
import { Select } from '../../components/santri/Select';
import { Notification } from '../../types/santri';

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [markLoading, setMarkLoading] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filterType && { type: filterType }),
        ...(filterRead !== 'all' && { isRead: filterRead === 'read' ? 'true' : 'false' }),
      });
      // Note: In real app, userId would come from auth context
      params.append('userId', 'current-user'); // placeholder
      
      const res = await fetch(`/api/notifications?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat notifikasi');
      const data = await res.json();
      setNotifications(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterRead]);

  useEffect(() => {
    fetchNotifications();
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
    } catch (err: any) {
      console.error('Mark all read error:', err);
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button className="ml-4 underline" onClick={() => window.location.reload()}>Coba lagi</button>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifikasi</h1>
          <p className="text-sm text-gray-500">
            {unreadCount > 0 && <span className="text-amber-600 font-medium">{unreadCount} belum dibaca</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            Tandai Semua Dibaca
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4">
        <Select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          options={[
            { value: '', label: 'Semua Tipe' },
            { value: 'LOW_BALANCE', label: 'Saldo Menipis' },
            { value: 'PAYMENT_DUE', label: 'Jatuh Tempo' },
            { value: 'APPROVAL_REQUEST', label: 'Persetujuan' },
            { value: 'INFO', label: 'Info' },
          ]}
          className="w-48"
        />
        <Select
          value={filterRead}
          onChange={(e) => { setFilterRead(e.target.value as any); setPage(1); }}
          options={[
            { value: 'all', label: 'Semua Status' },
            { value: 'unread', label: 'Belum Dibaca' },
            { value: 'read', label: 'Sudah Dibaca' },
          ]}
          className="w-40"
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Tidak ada notifikasi</h3>
            <p className="mt-1 text-gray-500">Semua sudah dibaca atau tidak ada notifikasi baru.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors flex items-start gap-4 ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        <Badge variant={getTypeColor(notification.type)} className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                      {notification.referenceId && (
                        <p className="text-xs text-gray-400 mt-2 font-mono">
                          Ref: {notification.referenceType} - {notification.referenceId}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-xs text-gray-400">{formatTime(notification.createdAt)}</span>
                      {!notification.isRead && markLoading !== notification.id && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => handleMarkRead(notification)}
                          className="p-1 text-xs"
                        >
                          Tandai dibaca
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Menampilkan {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} dari {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Sebelumnya
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Button
                  key={p}
                  variant={p === page ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setPage(p)}
                  disabled={loading}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
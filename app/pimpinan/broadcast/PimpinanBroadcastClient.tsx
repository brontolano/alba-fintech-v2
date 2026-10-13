// app/pimpinan/broadcast/PimpinanBroadcastClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/santri/Button';
import { Input } from '../../../components/santri/Input';
import { Badge } from '../../../components/santri/Badge';

interface Notice {
  id: string;
  unitId: string;
  title: string;
  message: string;
  targetRoles: string;
  createdById: string;
  createdBy?: { name: string };
  isRead: boolean;
  createdAt: string;
}

interface NoticeRead {
  noticeId: string;
  userId: string;
  readAt: string;
}

interface PimpinanBroadcastResponse {
  data: Notice[];
  reads: NoticeRead[];
}

export function PimpinanBroadcastClient() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState('STAFF,KASI');
  const [unitId, setUnitId] = useState('');
  const [createdNotice, setCreatedNotice] = useState<Notice | null>(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await fetch('/api/pimpinan/broadcast', { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat berita');
      const json = await res.json();
      setNotices(json || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/pimpinan/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId, title, message, targetRoles, createdById: 'system' }),
      });
      if (!res.ok) throw new Error('Gagal mengirim broadcast');
      const json = await res.json();
      setCreatedNotice(json);
      setTitle('');
      setMessage('');
      setTargetRoles('STAFF,KASI');
      setUnitId('');
      fetchNotices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Broadcast</h1>
          <p className="text-sm text-gray-500">
            Kirim informasi ke seluruh staff atau per unit
          </p>
        </div>
      </div>

      {/* Create Broadcast */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Kirim Broadcast Baru</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masukkan judul broadcast"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Pesan</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[120px]"
                placeholder="Isi pesan broadcast..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Unit</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Pilih unit (opsional)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Roles</label>
              <Input
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                placeholder="CONTOH: STAFF,KASI"
                defaultValue="STAFF,KASI"
              />
              <p className="text-xs text-gray-400 mt-1">Pisahkan dengan koma. Kosongkan = semua roles.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={creating} className="flex-1">
              {creating ? 'Mengirim...' : 'Kirim Broadcast'}
            </Button>
            {createdNotice && (
              <Badge variant="success">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Broadcast terkirim!
              </Badge>
            )}
          </div>
        </form>
      </div>

      {/* Broadcast List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Riwayat Broadcast</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {notices.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Belum ada broadcast
            </div>
          ) : (
            notices.map((notice) => (
              <div key={notice.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-gray-800">{notice.title}</div>
                  <div className="text-sm text-gray-500">{notice.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Dikirim: {formatDate(notice.createdAt)} oleh {notice.createdBy?.name || 'system'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="info">
                    {notice.isRead ? 'Dibaca' : 'Belum dibaca'}
                  </Badge>
                  <span className="text-sm text-gray-500">Roles: {notice.targetRoles}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
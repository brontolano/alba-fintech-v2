'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Send, Save, Trash2, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface Lembaga { id: string; name: string }

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isDraft: boolean;
  isSent: boolean;
  sentAt: string | null;
  deliveredTo: number;
  createdAt: string;
  updatedAt: string;
  sender: { id: string; name: string; email: string; role: string };
}

const typeColors = {
  INFO: 'bg-blue-100 text-blue-700',
  SUCCESS: 'bg-green-100 text-green-700',
  WARNING: 'bg-amber-100 text-amber-700',
  ERROR: 'bg-red-100 text-red-700',
};

export default function BroadcastsPage() {
  const { data: session, status: sessionStatus } = useSession({ required: true });
  const role = session?.user?.role as string | undefined;
  const isSuperadmin = role === 'SUPERADMIN';

  const [lembagas, setLembagas] = useState<Lembaga[]>([]);
  const [lembagaFilter, setLembagaFilter] = useState('');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal open state
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'INFO' as const,
    priority: 'NORMAL' as const,
    lembagaId: '',
  });

  const fetchLembagas = async () => {
    try {
      const res = await fetch('/api/lembaga');
      const data = await res.json();
      setLembagas(data.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (lembagaFilter) params.set('lembagaId', lembagaFilter);
      const res = await fetch(`/api/broadcasts?${params.toString()}`);
      const data = await res.json();
      setBroadcasts(data.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat broadcast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (isSuperadmin) fetchLembagas();
    fetchBroadcasts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, isSuperadmin, lembagaFilter]);

  const handleCreateDraft = async () => {
    try {
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Gagal membuat draft');
      toast.success('Draft broadcast berhasil dibuat');
      setFormOpen(false);
      setFormData({ title: '', message: '', type: 'INFO', priority: 'NORMAL', lembagaId: '' });
      fetchBroadcasts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat draft');
    }
  };

  const handleSend = async (id: string) => {
    try {
      const res = await fetch(`/api/broadcasts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send' }),
      });
      if (!res.ok) throw new Error('Gagal mengirim');
      toast.success('Broadcast berhasil dikirim');
      fetchBroadcasts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus broadcast ini?')) return;
    try {
      const res = await fetch(`/api/broadcasts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      toast.success('Broadcast dihapus');
      fetchBroadcasts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  if (sessionStatus === 'loading') {
    return <div className="p-6">Memuat...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Megaphone size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Broadcast</h1>
            <p className="text-sm text-slate-500">Buat dan kelola pesan broadcast ke seluruh pengguna</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBroadcasts}
            className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex items-center gap-1 text-sm"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setFormOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 text-sm"
          >
            <Save size={14} /> Buat Draft
          </button>
        </div>
      </div>

      {/* Filter */}
      {isSuperadmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lembaga</label>
            <select
              value={lembagaFilter}
              onChange={(e) => setLembagaFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            >
              <option value="">Semua Lembaga</option>
              {lembagas.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Draft Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Buat Draft Broadcast</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  placeholder="Judul broadcast"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pesan</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  rows={3}
                  placeholder="Isi pesan..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  >
                    <option value="INFO">INFO</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="WARNING">WARNING</option>
                    <option value="ERROR">ERROR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioritas</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as typeof formData.priority })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>
              {isSuperadmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lembaga (opsional)</label>
                  <select
                    value={formData.lembagaId}
                    onChange={(e) => setFormData({ ...formData, lembagaId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  >
                    <option value="">Semua Lembaga</option>
                    {lembagas.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleCreateDraft}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                Simpan Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <Megaphone size={48} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-900 mb-2">Belum Ada Broadcast</h3>
          <p className="text-sm text-slate-500">Klik {"Buat Draft"} untuk memulai.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs">Judul</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs">Tipe</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs">Status</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 uppercase text-xs">Prioritas</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 uppercase text-xs">Dikirim Ke</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 uppercase text-xs">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">{b.title}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${typeColors[b.type]}`}>
                      {b.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {b.isDraft ? 'Draft' : 'Terkirim'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">
                      {b.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-600">
                    {b.deliveredTo ?? '-'}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    {b.isDraft && (
                      <button
                        onClick={() => handleSend(b.id)}
                        className="text-indigo-600 hover:text-indigo-800 p-1"
                        title="Kirim broadcast"
                      >
                        <Send size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Hapus broadcast"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

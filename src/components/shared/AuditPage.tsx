'use client';

import { useEffect, useState, useMemo } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

type SortKey = 'action' | 'entity' | 'createdAt';
type SortDir = 'asc' | 'desc';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/audit-logs', { headers: { 'Content-Type': 'application/json' } });
        const data = await res.json();
        setLogs(data.data ?? []);
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let data = logs;
    if (search) {
      data = data.filter((l) =>
        (l.action ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.entity ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (l.details ?? '').toLowerCase().includes(search.toLowerCase())
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      if (sortKey === 'action') return dir * a.action.localeCompare(b.action);
      if (sortKey === 'entity') return dir * a.entity.localeCompare(b.entity);
      return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
  }, [logs, search, sortKey, sortDir]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Log</h1>
          <p className="text-slate-500 text-sm mt-1">Riwayat aktivitas sistem</p>
        </div>
      </div>

      <div className="relative max-w-md mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari aktivitas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ScrollText size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Belum ada log audit</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Riwayat ({filteredAndSorted.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('action')}>
                    Aksi {sortKey === 'action' && (sortDir === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('entity')}>
                    Entitas {sortKey === 'entity' && (sortDir === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Detail</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('createdAt')}>
                    Tanggal {sortKey === 'createdAt' && (sortDir === 'desc' ? '↓' : '↑')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50">
                    <td className="py-3 px-4"><Badge variant="info">{log.action}</Badge></td>
                    <td className="py-3 px-4 text-sm text-slate-600">{log.entity}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{log.details ?? '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

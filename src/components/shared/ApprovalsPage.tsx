'use client';

import { useEffect, useState, useMemo } from 'react';
import { CheckSquare, RefreshCw, AlertCircle, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Modal, Button } from '@/components/ui';
import { format } from 'date-fns';

type SortKey = 'createdAt' | 'amount' | 'status';
type SortDir = 'asc' | 'desc';

interface Approval {
  id: string;
  transaction: {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    status: string;
    unit: { name: string; code: string };
    createdBy: { name?: string; email: string };
  };
  approverId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  
  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const res = await fetch('/api/approvals', {
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        setApprovals(data.data ?? []);
      } catch (err) {
        console.error('Error fetching approvals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApprovals();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedApprovals = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...approvals].sort((a, b) => {
      if (sortKey === 'amount') return dir * (a.transaction.amount - b.transaction.amount);
      if (sortKey === 'status') return dir * a.status.localeCompare(b.status);
      return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
  }, [approvals, sortKey, sortDir]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id, action }),
      });
      const result = await res.json();
      
      // Update state dengan data dari API response
      setApprovals((prev) =>
        prev.map(a => a.id === id ? { ...a, status: result.data?.status ?? (action === 'approve' ? 'APPROVED' : 'REJECTED') } : a)
      );
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk action handlers
  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedApprovals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedApprovals.map((a) => a.id));
    }
  };

  const executeBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.length === 0) return;
    
    try {
      // Call API for each selected item
      const results = await Promise.all(
        selectedIds.map(async (id) => {
          const res = await fetch('/api/approvals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: id, action }),
          });
          const result = await res.json();
          return { id, status: result.data?.status ?? (action === 'approve' ? 'APPROVED' : 'REJECTED') };
        })
      );
      
      // Update state untuk semua item yang sudah diproses
      setApprovals((prev) =>
        prev.map(a => {
          const updated = results.find(r => r.id === a.id);
          return updated ? { ...a, status: updated.status } : a;
        })
      );
      
      // Hapus semua item yang sudah diproses dari list
      setSelectedIds([]);
    } catch (err) {
      console.error('Bulk action error:', err);
    } finally {
      setShowBulkConfirm(false);
      setPendingBulkAction(null);
    }
  };

  const confirmBulkAction = (action: 'approve' | 'reject') => {
    setPendingBulkAction(action);
    setShowBulkConfirm(true);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Persetujuan Transaksi</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola permintaan persetujuan transaksi</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sortedApprovals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Tidak ada permintaan persetujuan</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Permintaan Persetujuan ({sortedApprovals.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                <span className="text-sm text-slate-600">
                  {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} dipilih
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => confirmBulkAction('reject')}
                  >
                    Tolak Semua
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => confirmBulkAction('approve')}
                  >
                    Setujui Semua
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-xs text-slate-500 text-center">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-1 hover:text-slate-700"
                      >
                        {selectedIds.length === sortedApprovals.length ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-2 text-xs text-slate-500">Deskripsi</th>
                    <th className="px-4 py-2 text-xs text-slate-500 text-right">Jumlah</th>
                    <th className="px-4 py-2 text-xs text-slate-500">Unit</th>
                    <th className="px-4 py-2 text-xs text-slate-500">Tanggal</th>
                    <th className="px-4 py-2 text-xs text-slate-500 text-center">Status</th>
                    <th className="px-4 py-2 text-xs text-slate-500">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedApprovals.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(app.id)}
                          onChange={() => toggleSelectItem(app.id)}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-2">{app.transaction.description}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatCurrency(app.transaction.amount)}</td>
                      <td className="px-4 py-2">{app.transaction.unit?.code ?? '-'}</td>
                      <td className="px-4 py-2">{new Date(app.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant="warning">{app.status}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        {actionLoading === app.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(app.id, 'reject')}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Tolak
                            </button>
                            <button
                              onClick={() => handleAction(app.id, 'approve')}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Setujui
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          
          {/* Bulk Action Confirmation Modal */}
          <Modal
            open={showBulkConfirm}
            onClose={() => setShowBulkConfirm(false)}
            title="Konfirmasi Bulk Action"
            description={pendingBulkAction ? `Anda yakin ingin ${pendingBulkAction === 'reject' ? 'menolak' : 'mengsetujui'} ${selectedIds.length} transaksi yang dipilih?` : ''}
          >
            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={() => setShowBulkConfirm(false)}>
                Batal
              </Button>
              {pendingBulkAction && (
                <Button
                  variant={pendingBulkAction === 'reject' ? 'default' : 'default'}
                  onClick={() => executeBulkAction(pendingBulkAction)}
                >
                  {pendingBulkAction === 'reject' ? 'Tolak Semua' : 'Setujui Semua'}
                </Button>
              )}
            </div>
          </Modal>
        </Card>
      )}
    </div>
  );
}
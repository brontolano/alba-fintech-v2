'use client';

import { useEffect, useState } from 'react';
import { CheckSquare, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';

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

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id, action }),
      });
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : a
        )
      );
    } finally {
      setActionLoading(null);
    }
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
      ) : approvals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Tidak ada permintaan persetujuan</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Permintaan Persetujuan ({approvals.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {approvals.map((app) => (
                <div key={app.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="warning">{app.status}</Badge>
                      <span className="font-medium text-slate-800">{app.transaction.description}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm text-slate-600">
                      <div><span className="text-slate-400">Jumlah:</span> {formatCurrency(app.transaction.amount)}</div>
                      <div><span className="text-slate-400">Unit:</span> {app.transaction.unit?.code ?? '-'}</div>
                      <div><span className="text-slate-400">Oleh:</span> {app.transaction.createdBy?.name ?? app.transaction.createdBy?.email ?? '-'}</div>
                      <div><span className="text-slate-400">Tanggal:</span> {new Date(app.createdAt).toLocaleDateString('id-ID')}</div>
                    </div>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <button
                      onClick={() => handleAction(app.id, 'reject')}
                      disabled={actionLoading === app.id}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                    >
                      Tolak
                    </button>
                    <button
                      onClick={() => handleAction(app.id, 'approve')}
                      disabled={actionLoading === app.id}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                    >
                      Setujui
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

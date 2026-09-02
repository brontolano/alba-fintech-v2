'use client';

import { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

interface ApprovalRequest {
  id: string;
  transactionId: string;
  unit: {
    name: string;
    code: string;
  };
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  reference?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approver: {
    name?: string;
    email: string;
  };
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/approvals', {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setApprovals(data.data ?? []);
    } catch (err) {
      console.error('Error fetching approvals:', err);
      toast.error('Gagal memuat persetujuan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (id: string, transactionId: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyetujui');
      }

      toast.success('Transaksi disetujui');
      setApprovals(approvals.filter((a) => a.id !== id));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyetujui');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menolak');
      }

      toast.success('Transaksi ditolak');
      setApprovals(approvals.filter((a) => a.id !== id));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menolak');
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Persetujuan Transaksi</h1>
        <p className="text-slate-600 mt-1">
          Kelola permintaan persetujuan transaksi keuangan
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button className="px-4 py-2 text-sm font-medium text-emerald-600 border-b-2 border-emerald-600">
          Pending ({approvals.length})
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-600 border-b-2 border-transparent hover:text-slate-800">
          Approved
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-600 border-b-2 border-transparent hover:text-slate-800">
          Rejected
        </button>
      </div>

      {/* Approvals List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Tidak ada permintaan persetujuan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-slate-500">
                      {format(new Date(approval.createdAt), 'dd MMM yyyy', { locale: id })}
                    </span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      {approval.unit.name} ({approval.unit.code})
                    </span>
                    {approval.type === 'INCOME' ? (
                      <TrendingUp size={16} className="text-green-500" />
                    ) : (
                      <TrendingDown size={16} className="text-red-500" />
                    )}
                  </div>

                  <p className="font-medium text-slate-800 mb-1">
                    {approval.description}
                  </p>
                  {approval.reference && (
                    <p className="text-sm text-slate-500">
                      Referensi: {approval.reference}
                    </p>
                  )}

                  <div className="mt-2 mb-2">
                    <span className="text-lg font-bold text-slate-800">
                      {formatCurrency(approval.amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Diajukan oleh:</span>
                    <span className="font-medium">
                      {approval.approver.name || approval.approver.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleApprove(approval.id, approval.transactionId)}
                    disabled={processingId === approval.id}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    <span>Setujui</span>
                  </button>
                  <button
                    onClick={() => handleReject(approval.id)}
                    disabled={processingId === approval.id}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    <span>Tolak</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

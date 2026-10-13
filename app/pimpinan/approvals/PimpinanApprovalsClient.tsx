// app/pimpinan/approvals/PimpinanApprovalsClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/santri/Button';
import { Badge } from '../../../components/santri/Badge';

interface Approval {
  id: string;
  type: string;
  unitId: string;
  unit?: { name: string };
  requestedById: string;
  requestedBy?: { name: string };
  approvedById?: string;
  approvedBy?: { name: string };
  referenceId: string;
  referenceType: string;
  data: string;
  keterangan?: string;
  status: string;
  approvedAt?: string;
  createdAt: string;
}

export function PimpinanApprovalsClient() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/pimpinan/approve', { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat approvals');
      const json = await res.json();
      setApprovals(json || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    if (!confirm(`Apakah Anda yakin ingin ${newStatus === 'APPROVED' ? 'mengetahui' : 'menolak'} approval ini?`)) {
      return;
    }
    setApproving(id);
    try {
      const res = await fetch('/api/pimpinan/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, keterangan: '', approvedById: 'system' }),
      });
      if (!res.ok) throw new Error('Gagal mengupdate approval');
      fetchApprovals();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApproving(null);
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
          <h1 className="text-2xl font-bold text-gray-800">Approval & Review</h1>
          <p className="text-sm text-gray-500">
            Review dan setujui laporan, pembayaran, dan tagihan
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button className="ml-4 underline" onClick={() => fetchApprovals()}>Coba lagi</button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Pending Approval</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {approvals.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Tidak ada approval yang menunggu
            </div>
          ) : (
            approvals.map((approval) => (
              <div key={approval.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800">
                    {approval.type === 'LAPORAN_HARIAN' && 'Laporan Harian'}
                    {approval.type === 'PEMBAYARAN' && 'Pembayaran'}
                    {approval.type === 'TAGIHAN' && 'Tagihan'}
                    {approval.type === 'SHIFT' && 'Shift'}
                    {approval.type === 'UNKNOWN' && 'Approval'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Unit: {approval.unit?.name || approval.unitId}
                  </div>
                  <div className="text-sm text-gray-500">
                    Diminta: {approval.requestedBy?.name || approval.requestedById} - {formatDate(approval.createdAt)}
                  </div>
                  {approval.keterangan && (
                    <div className="text-sm text-gray-400 mt-1">{approval.keterangan}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Reference: {approval.referenceType} #{approval.referenceId.slice(0, 12)}...
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={approval.status === 'APPROVED' ? 'success' : approval.status === 'REJECTED' ? 'error' : 'warning'}>
                    {approval.status}
                  </Badge>
                  <div className="flex gap-2">
                    {approval.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          disabled={approving === approval.id}
                          onClick={() => handleAction(approval.id, 'APPROVED')}
                        >
                          {approving === approval.id ? 'Memproses...' : 'Setujui'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={approving === approval.id}
                          onClick={() => handleAction(approval.id, 'REJECTED')}
                        >
                          Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
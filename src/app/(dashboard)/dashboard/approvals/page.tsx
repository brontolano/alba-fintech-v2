'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  CheckSquare,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  MessageSquare,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';

interface Approval {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  transaction: {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    status: string;
    unit: { name: string; code: string };
    createdBy: { name?: string | null; email: string };
  };
  approver: { name?: string | null; email: string; role: string };
}

const STATUS_LABELS = {
  PENDING: { label: 'Pending', color: 'warning' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'destructive' },
} as const;

const TYPE_COLORS = {
  INCOME: 'text-green-600',
  EXPENSE: 'text-red-600',
} as const;

export default function ApprovalsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(
    null
  );
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const role = session?.user?.role as string | undefined;
  const canApprove = role === 'SUPERADMIN' || role === 'PIMPINAN';

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/approvals');
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.data || []);
      }
    } catch {
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const filtered = approvals.filter((a) => {
    const lower = searchTerm.toLowerCase();
    const matchSearch =
      a.transaction.description?.toLowerCase().includes(lower) ||
      a.transaction.createdBy?.name?.toLowerCase().includes(lower) ||
      a.transaction.unit?.name?.toLowerCase().includes(lower) ||
      a.transaction.unit?.code?.toLowerCase().includes(lower);

    const matchStatus = statusFilter === 'all' || a.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const openDialog = (approval: Approval, type: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setActionType(type);
    setComment('');
    setSubmitError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedApproval) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: selectedApproval.transaction.id,
          action: actionType,
          ...(comment.trim() && { comment: comment.trim() }),
        }),
      });

      if (res.ok) {
        setIsDialogOpen(false);
        setSelectedApproval(null);
        setComment('');
        fetchApprovals();
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || data.message || 'Gagal memproses');
      }
    } catch {
      setSubmitError('Gagal memproses — cek koneksi');
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-4"></div>
          <div className="h-10 bg-slate-200 rounded mb-4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!session || !canApprove) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-500">
          <CheckSquare size={48} className="mx-auto mb-4 text-slate-300" />
          <h2 className="font-medium mb-2">Akses Dibatasi</h2>
          <p>
            Halaman ini hanya bisa diakses oleh role Superadmin dan Pimpinan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare size={24} />
            Approval Workflow
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola persetujuan transaksi
          </p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm text-slate-600">Status:</span>
        </div>
        <div className="flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', 'all'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all'
                ? 'Semua'
                : s === 'PENDING'
                ? 'Pending'
                : s === 'APPROVED'
                ? 'Disetujui'
                : 'Ditolak'}
            </Button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <Input
          type="text"
          placeholder="Cari approval..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaksi</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Dibuat Oleh</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-slate-500 py-8"
                >
                  Tidak ada approval ditemukan
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => {
                const tx = a.transaction;
                const statusInfo = STATUS_LABELS[a.status];

                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`font-bold ${TYPE_COLORS[tx.type]}`}
                        >
                          {tx.type === 'INCOME' ? '+' : '-'}
                        </div>
                        <div>
                          <div className="font-medium">
                            Rp {tx.amount.toLocaleString('id-ID')}
                          </div>
                          <div className="text-sm text-slate-500 max-w-xs truncate">
                            {tx.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {tx.unit?.code}
                      </code>
                      <div className="text-xs text-slate-500">
                        {tx.unit?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {tx.createdBy?.name || tx.createdBy?.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {a.status === 'PENDING' && (
                          <Clock size={14} className="text-amber-500" />
                        )}
                        {a.status === 'APPROVED' && (
                          <CheckCircle size={14} className="text-green-500" />
                        )}
                        {a.status === 'REJECTED' && (
                          <XCircle size={14} className="text-red-500" />
                        )}
                        <Badge variant={statusInfo.color as any}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-500">
                        {new Date(a.createdAt).toLocaleDateString('id-ID')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {a.status === 'PENDING' && (
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDialog(a, 'approve')}
                          >
                            Setujui
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDialog(a, 'reject')}
                            className="text-red-600 hover:text-red-700"
                          >
                            Tolak
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve'
                ? 'Setujui Transaksi'
                : 'Tolak Transaksi'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedApproval && (
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="font-medium">
                  Rp {selectedApproval.transaction.amount.toLocaleString('id-ID')}
                </div>
                <div className="text-sm text-slate-600">
                  {selectedApproval.transaction.description}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Unit: {selectedApproval.transaction.unit?.code} —{' '}
                  {selectedApproval.transaction.unit?.name}
                </div>
              </div>
            )}

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                {submitError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comment">
                {actionType === 'approve'
                  ? 'Catatan persetujuan (opsional)'
                  : 'Alasan penolakan (opsional)'}
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  actionType === 'approve'
                    ? 'Konfirmasi persetujuan...'
                    : 'Alasan ditolak...'
                }
                maxLength={200}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className={`flex-1 ${
                actionType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submitting
                ? 'Memproses...'
                : actionType === 'approve'
                ? 'Setujui'
                : 'Tolak'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

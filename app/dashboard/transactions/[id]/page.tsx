'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Wallet,
  Receipt,
  CheckCircle,
  XCircle,
  User,
  Tag,
  FileText,
} from 'lucide-react';

interface TransactionDetail {
  id: string;
  date: string;
  unitId: string | null;
  unitName?: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  description: string;
  amount: number;
  categoryName?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  reference?: string;
  photoUrl?: string;
  createdAt: string;
  createdByName?: string;
  createdByEmail?: string;
  bank_accounts?: {
    id: string;
    name: string;
    code: string;
    type: string;
  } | null;
  financial_categories?: {
    id: string;
    name: string;
    code: string;
  } | null;
  order_items?: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    itemId?: string;
    inventory_items?: {
      id: string;
      name: string;
      sku: string;
    } | null;
  }>;
  approvals?: Array<{
    id: string;
    status: string;
    comment?: string;
    createdAt: string;
    users?: {
      name?: string;
      email?: string;
    };
  }>;
}

interface CommentForm {
  comment: string;
}

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [commentForm, setCommentForm] = useState<CommentForm>({ comment: '' });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Extract id from params Promise (Next.js App Router)
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    const extractId = async () => {
      const resolvedParams = await params;
      setTransactionId(resolvedParams.id);
    };
    extractId();
  }, [params]);

  // Fetch transaction once we have the id
  useEffect(() => {
    if (!transactionId) return;
    fetchTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  const role = session?.user?.role as string;

  // Check if user can approve (SUPERADMIN, PIMPINAN, MANAGER)
  const canApprove = ['SUPERADMIN', 'PIMPINAN', 'MANAGER'].includes(role);
  // Check if user can edit (not if already approved)
  const canEdit = !transaction?.approvals?.some(a => a.status === 'APPROVED' || a.status === 'PENDING');

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'Pemasukan';
      case 'EXPENSE':
        return 'Pengeluaran';
      case 'TRANSFER':
        return 'Transfer';
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Disetujui';
      case 'PENDING':
        return 'Pending';
      case 'REJECTED':
        return 'Ditolak';
      case 'DRAFT':
        return 'Draft';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-600';
      case 'EXPENSE':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const fetchTransaction = async () => {
    if (!transactionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal memuat transaksi');
      }
      const result = await res.json();
      setTransaction(result.data);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat transaksi');
      router.push('/dashboard/transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Yakin hapus transaksi ini? Tindakan ini tidak dapat dibatalkan.')) return;
    if (!transactionId) return;
    
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus transaksi');
      }
      toast.success('Transaksi berhasil dihapus');
      router.push('/dashboard/transactions');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus transaksi');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApprove = async () => {
    const pendingApproval = transaction?.approvals?.find(a => a.status === 'PENDING');
    if (!pendingApproval) {
      toast.error('Tidak ada permintaan persetujuan yang pending');
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/approvals/${pendingApproval.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          comment: commentForm.comment,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyetujui transaksi');
      }
      toast.success('Transaksi berhasil disetujui');
      setShowApproveModal(false);
      setCommentForm({ comment: '' });
      await fetchTransaction();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyetujui transaksi');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    const pendingApproval = transaction?.approvals?.find(a => a.status === 'PENDING');
    if (!pendingApproval) {
      toast.error('Tidak ada permintaan persetujuan yang pending');
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/approvals/${pendingApproval.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          comment: commentForm.comment,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menolak transaksi');
      }
      toast.success('Transaksi berhasil ditolak');
      setShowRejectModal(false);
      setCommentForm({ comment: '' });
      fetchTransaction();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menolak transaksi');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded-lg mb-4 w-1/3"></div>
          <div className="h-64 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Transaksi tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Detail Transaksi</h1>
            <p className="text-slate-600 mt-1">ID: {transaction.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {role === 'SUPERADMIN' && transactionId ? (
            <button
              onClick={() => router.push(`/dashboard/transactions/${transactionId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              <Edit size={18} />
              <span>Edit</span>
            </button>
          ) : null}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={!canEdit}
          >
            <Trash2 size={18} />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
          {getStatusLabel(transaction.status)}
        </span>
      </div>

      {/* Transaction Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Type & Amount */}
          <div className="border-r border-slate-200 pr-6">
            <div className="flex items-center gap-2 mb-2">
              <Receipt size={20} className="text-slate-500" />
              <span className="text-sm text-slate-500">Tipe</span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-lg font-medium ${getTypeColor(transaction.type)}`}>
                {getTypeLabel(transaction.type)}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={20} className="text-slate-500" />
              <span className="text-sm text-slate-500">Tanggal</span>
            </div>
            <p className="font-medium text-slate-800">
              {new Date(transaction.date).toLocaleDateString('id-ID')}
            </p>
          </div>

          {/* Amount */}
          <div className="border-r border-slate-200 pr-6">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={20} className="text-slate-500" />
              <span className="text-sm text-slate-500">Jumlah</span>
            </div>
            <p className={`text-2xl font-bold ${getTypeColor(transaction.type)}`}>
              {formatCurrency(transaction.amount)}
            </p>
          </div>

          {/* Unit & Category */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag size={20} className="text-slate-500" />
              <span className="text-sm text-slate-500">Unit</span>
            </div>
            <p className="font-medium text-slate-800">
              {transaction.unitName || transaction.unitId || '-'}
            </p>
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={20} className="text-slate-500" />
                <span className="text-sm text-slate-500">Kategori</span>
              </div>
              <p className="font-medium text-slate-800">
                {transaction.categoryName || (
                  <span className="text-slate-400">—</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Detail Transaksi</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Deskripsi</p>
            <p className="font-medium text-slate-800">{transaction.description}</p>
          </div>
          
          {transaction.reference && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Referensi</p>
              <p className="font-medium text-slate-800">{transaction.reference}</p>
            </div>
          )}
          
          {transaction.bank_accounts && (
            <div>
              <p className="text-sm text-slate-500 mb-1">Akun Bank</p>
              <p className="font-medium text-slate-800">
                {transaction.bank_accounts.name} ({transaction.bank_accounts.code})
              </p>
            </div>
          )}
          
          <div>
            <p className="text-sm text-slate-500 mb-1">Dibuat oleh</p>
            <p className="font-medium text-slate-800">
              {transaction.createdByName || transaction.createdByEmail || '-'}
            </p>
          </div>
        </div>

        {/* Order Items (POS) */}
        {transaction.order_items && transaction.order_items.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Item Pesanan</h3>
            <div className="bg-slate-50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Item</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Qty</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Harga</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.order_items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200 last:border-0">
                      <td className="py-3 px-4 text-sm text-slate-800">
                        {item.itemName}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-slate-800">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Photo */}
        {transaction.photoUrl && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Bukti Foto</h3>
            <img
              src={`/${transaction.photoUrl}`}
              alt="Transaction receipt"
              className="max-w-xs rounded-lg border border-slate-200"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Approvals History */}
      {transaction.approvals && transaction.approvals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">History Persetujuan</h2>
          <div className="space-y-3">
            {transaction.approvals.map((approval) => (
              <div key={approval.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        approval.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : approval.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : approval.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {getStatusLabel(approval.status)}
                    </span>
                    <p className="text-sm text-slate-600 mt-1">
                      oleh {approval.users?.name || approval.users?.email || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(approval.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
                {approval.comment && (
                  <p className="mt-2 text-sm text-slate-700 bg-white p-2 rounded border border-slate-200">
                    {approval.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {canApprove && transaction.status === 'PENDING' && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowApproveModal(true)}
            disabled={isActionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            <CheckCircle size={18} />
            <span>Setujui</span>
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isActionLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            <XCircle size={18} />
            <span>Tolak</span>
          </button>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Setujui Transaksi</h3>
            <textarea
              value={commentForm.comment}
              onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
              placeholder="Tambahkan komentar (opsional)..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                disabled={isActionLoading}
              >
                Batal
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                disabled={isActionLoading}
              >
                {isActionLoading ? 'Memproses...' : 'Setujui'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Tolak Transaksi</h3>
            <textarea
              value={commentForm.comment}
              onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
              placeholder="Tambahkan komentar (opsional)..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                disabled={isActionLoading}
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                disabled={isActionLoading}
              >
                {isActionLoading ? 'Memproses...' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Hapus Transaksi</h3>
            <p className="text-slate-600 mb-4">
              Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                disabled={isActionLoading}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                disabled={isActionLoading}
              >
                {isActionLoading ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
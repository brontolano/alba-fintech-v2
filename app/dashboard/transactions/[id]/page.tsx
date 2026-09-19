"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
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
  Clock,
} from "lucide-react";

interface TransactionDetail {
  id: string;
  date: string;
  unitId: string | null;
  unitName?: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description: string;
  amount: number;
  categoryName?: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  reference?: string;
  photoUrl?: string;
  createdAt: string;
  createdById?: string;
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

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [commentForm, setCommentForm] = useState<CommentForm>({ comment: "" });
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
  const canApprove = ["SUPERADMIN", "PIMPINAN", "MANAGER"].includes(role);
  // Check if user can edit (not if already approved)
  const canEdit = !transaction?.approvals?.some(
    (a) => a.status === "APPROVED" || a.status === "PENDING",
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "INCOME":
        return "Pemasukan";
      case "EXPENSE":
        return "Pengeluaran";
      case "TRANSFER":
        return "Transfer";
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "Disetujui";
      case "PENDING":
        return "Pending";
      case "REJECTED":
        return "Ditolak";
      case "DRAFT":
        return "Draft";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "INCOME":
        return "text-green-600";
      case "EXPENSE":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  const fetchTransaction = async () => {
    if (!transactionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memuat transaksi");
      }
      const result = await res.json();
      setTransaction(result.data);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat transaksi");
      router.push("/dashboard/transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Yakin hapus transaksi ini? Tindakan ini tidak dapat dibatalkan.",
      )
    )
      return;
    if (!transactionId) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus transaksi");
      }
      toast.success("Transaksi berhasil dihapus");
      router.push("/dashboard/transactions");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus transaksi");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!transactionId) return;
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengajukan persetujuan");
      }
      const result = await res.json();
      toast.success(
        `Pengajuan dikirim ke ${result.data?.users?.name || "penyetuju"}`,
      );
      await fetchTransaction();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengajukan persetujuan");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApprove = async () => {
    const pendingApproval = transaction?.approvals?.find(
      (a) => a.status === "PENDING",
    );
    if (!pendingApproval) {
      toast.error("Tidak ada permintaan persetujuan yang pending");
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/approvals/${pendingApproval.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          comment: commentForm.comment,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyetujui transaksi");
      }
      toast.success("Transaksi berhasil disetujui");
      setShowApproveModal(false);
      setCommentForm({ comment: "" });
      await fetchTransaction();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyetujui transaksi");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    const pendingApproval = transaction?.approvals?.find(
      (a) => a.status === "PENDING",
    );
    if (!pendingApproval) {
      toast.error("Tidak ada permintaan persetujuan yang pending");
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/approvals/${pendingApproval.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          comment: commentForm.comment,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menolak transaksi");
      }
      toast.success("Transaksi berhasil ditolak");
      setShowRejectModal(false);
      setCommentForm({ comment: "" });
      fetchTransaction();
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak transaksi");
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
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Transaksi
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Detail Transaksi
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && transactionId ? (
            <button
              onClick={() =>
                router.push(`/dashboard/transactions/${transactionId}/edit`)
              }
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <Edit size={16} />
              <span>Edit</span>
            </button>
          ) : null}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEdit}
          >
            <Trash2 size={16} />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(transaction.status)}`}
          >
            {getStatusLabel(transaction.status)}
          </span>
          <span className="text-xs text-muted-foreground">
            ID: {transaction.id}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              <Receipt size={18} />
              <span className="text-sm font-medium">Tipe</span>
            </div>
            <p
              className={`text-lg font-semibold ${getTypeColor(transaction.type)}`}
            >
              {getTypeLabel(transaction.type)}
            </p>
            <div className="mt-5 flex items-center gap-2 text-muted-foreground">
              <Calendar size={18} />
              <span className="text-sm font-medium">Tanggal</span>
            </div>
            <p className="mt-2 text-base font-medium text-foreground">
              {new Date(transaction.date).toLocaleDateString("id-ID")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              <Wallet size={18} />
              <span className="text-sm font-medium">Jumlah</span>
            </div>
            <p
              className={`text-2xl font-bold ${getTypeColor(transaction.type)}`}
            >
              {formatCurrency(transaction.amount)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              <Tag size={18} />
              <span className="text-sm font-medium">Unit</span>
            </div>
            <p className="text-base font-semibold text-foreground">
              {transaction.unitName || transaction.unitId || "-"}
            </p>
            <div className="mt-5 flex items-center gap-2 text-muted-foreground">
              <FileText size={18} />
              <span className="text-sm font-medium">Kategori</span>
            </div>
            <p className="mt-2 text-base font-medium text-foreground">
              {transaction.categoryName || (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Detail Transaksi
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Deskripsi</p>
            <p className="font-medium text-foreground">
              {transaction.description}
            </p>
          </div>

          {transaction.reference && (
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Referensi</p>
              <p className="font-medium text-foreground">
                {transaction.reference}
              </p>
            </div>
          )}

          {transaction.bank_accounts && (
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Akun Bank</p>
              <p className="font-medium text-foreground">
                {transaction.bank_accounts.name} (
                {transaction.bank_accounts.code})
              </p>
            </div>
          )}

          <div>
            <p className="mb-1 text-sm text-muted-foreground">Dibuat oleh</p>
            <p className="font-medium text-foreground">
              {transaction.createdByName || transaction.createdByEmail || "-"}
            </p>
          </div>
        </div>

        {transaction.order_items && transaction.order_items.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Item Pesanan
            </h3>
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <table className="rtable w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Item
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Harga
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.order_items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-border last:border-0"
                    >
                      <td
                        className="px-4 py-3 text-sm text-foreground"
                        data-label="Item"
                      >
                        {item.itemName}
                      </td>
                      <td
                        className="px-4 py-3 text-right text-sm text-muted-foreground"
                        data-label="Qty"
                      >
                        {item.quantity}
                      </td>
                      <td
                        className="px-4 py-3 text-right text-sm text-muted-foreground"
                        data-label="Harga"
                      >
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td
                        className="px-4 py-3 text-right text-sm font-semibold text-foreground"
                        data-label="Total"
                      >
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {transaction.photoUrl && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Bukti Foto
            </h3>
            <img
              src={`/${transaction.photoUrl}`}
              alt="Transaction receipt"
              className="max-w-xs rounded-xl border border-border bg-background object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      {transaction.approvals && transaction.approvals.length > 0 && (
        <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            History Persetujuan
          </h2>
          <div className="space-y-3">
            {transaction.approvals.map((approval) => (
              <div
                key={approval.id}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        approval.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-700"
                          : approval.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : approval.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {getStatusLabel(approval.status)}
                    </span>
                    <p className="mt-2 text-sm text-muted-foreground">
                      oleh{" "}
                      {approval.users?.name ||
                        approval.users?.email ||
                        "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      {new Date(approval.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
                {approval.comment && (
                  <p className="mt-3 rounded-xl border border-border bg-card p-3 text-sm text-foreground">
                    {approval.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {transaction.status === "PENDING" &&
        !transaction.approvals?.some((a) => a.status === "PENDING") &&
        transaction.createdById !== session?.user?.id && (
          <div>
            <button
              onClick={handleSubmitForApproval}
              disabled={isActionLoading}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:opacity-50"
            >
              <Clock size={16} />
              <span>Ajukan Persetujuan</span>
            </button>
          </div>
        )}

      {canApprove && transaction.status === "PENDING" && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowApproveModal(true)}
            disabled={isActionLoading}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            <CheckCircle size={16} />
            <span>Setujui</span>
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isActionLoading}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            <XCircle size={16} />
            <span>Tolak</span>
          </button>
        </div>
      )}

      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[24px] border border-border bg-card p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Setujui Transaksi
            </h3>
            <textarea
              value={commentForm.comment}
              onChange={(e) =>
                setCommentForm({ ...commentForm, comment: e.target.value })
              }
              placeholder="Tambahkan komentar (opsional)..."
              className="mb-4 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowApproveModal(false)}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                disabled={isActionLoading}
              >
                Batal
              </button>
              <button
                onClick={handleApprove}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                disabled={isActionLoading}
              >
                {isActionLoading ? "Memproses..." : "Setujui"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[24px] border border-border bg-card p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Tolak Transaksi
            </h3>
            <textarea
              value={commentForm.comment}
              onChange={(e) =>
                setCommentForm({ ...commentForm, comment: e.target.value })
              }
              placeholder="Tambahkan komentar (opsional)..."
              className="mb-4 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                disabled={isActionLoading}
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                disabled={isActionLoading}
              >
                {isActionLoading ? "Memproses..." : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[24px] border border-border bg-card p-6 shadow-2xl">
            <h3 className="mb-3 text-lg font-semibold text-foreground">
              Hapus Transaksi
            </h3>
            <p className="mb-5 text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini
              tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                disabled={isActionLoading}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                disabled={isActionLoading}
              >
                {isActionLoading ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

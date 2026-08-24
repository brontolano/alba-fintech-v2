'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Wallet,
  Calendar,
  User,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface Unit {
  id: string;
  name: string;
  code: string;
}

interface Transaction {
  id: string;
  unitId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  reference: string | null;
  createdBy: { name?: string | null; email: string; role: string };
  unit: { name: string; code: string };
  approvedBy?: { name?: string | null; email: string } | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS = {
  DRAFT: { label: 'Draft', color: 'outline' },
  PENDING: { label: 'Pending', color: 'warning' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'danger' },
} as const;

const TYPE_ICONS = {
  INCOME: { icon: Wallet, color: 'text-green-600' },
  EXPENSE: { icon: Receipt, color: 'text-red-600' },
} as const;

export default function TransactionsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [formUnitId, setFormUnitId] = useState('');
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formReference, setFormReference] = useState('');

  const role = session?.user?.role as string | undefined;
  const canCreate = ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'].includes(role ?? '');

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data || []);
      }
    } catch {
      setTransactions([]);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      if (res.ok) {
        const data = await res.json();
        setUnits(data.data || []);
      }
    } catch {
      setUnits([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchTransactions(), fetchUnits()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filters
  const filtered = transactions.filter((tx) => {
    const search = searchTerm.toLowerCase();
    const matchSearch =
      tx.description?.toLowerCase().includes(search) ||
      tx.reference?.toLowerCase().includes(search) ||
      tx.createdBy?.name?.toLowerCase().includes(search) ||
      tx.unit?.name?.toLowerCase().includes(search);

    const matchStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchType = typeFilter === 'all' || tx.type === typeFilter;

    return matchSearch && matchStatus && matchType;
  });

  // Form
  const resetForm = () => {
    setEditingTx(null);
    setFormUnitId('');
    setFormType('EXPENSE');
    setFormAmount('');
    setFormDescription('');
    setFormReference('');
    setSubmitError('');
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormUnitId(tx.unitId);
    setFormType(tx.type);
    setFormAmount(tx.amount.toString());
    setFormDescription(tx.description);
    setFormReference(tx.reference ?? '');
    setSubmitError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formUnitId || !formAmount || !formDescription.trim()) {
      setSubmitError('Unit, amount, dan deskripsi wajib diisi');
      return;
    }

    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Amount harus angka positif');
      return;
    }

    if (formDescription.trim().length < 3) {
      setSubmitError('Deskripsi minimal 3 karakter');
      return;
    }

    const payload = {
      unitId: formUnitId,
      type: formType,
      amount,
      description: formDescription.trim(),
      ...(formReference.trim() && { reference: formReference.trim() }),
    };

    try {
      const url = editingTx
        ? `/api/transactions/${editingTx.id}`
        : '/api/transactions';
      const method = editingTx ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsDialogOpen(false);
        resetForm();
        fetchTransactions();
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || data.message || 'Gagal menyimpan');
      }
    } catch {
      setSubmitError('Gagal menyimpan — cek koneksi');
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

  if (!session) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt size={24} />
            Transaksi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola transaksi keuangan (pendapatan / pengeluaran)
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Transaksi Baru
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            type="text"
            placeholder="Cari transaksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter size={16} className="mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <Wallet size={16} className="mr-2" />
            <SelectValue placeholder="Tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="INCOME">Pemasukan</SelectItem>
            <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipe</TableHead>
              <TableHead>Nominal</TableHead>
              <TableHead>Deskripsi</TableHead>
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
                  colSpan={8}
                  className="text-center text-slate-500 py-8"
                >
                  Tidak ada transaksi ditemukan
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tx) => {
                const typeInfo = TYPE_ICONS[tx.type];
                const statusInfo = STATUS_LABELS[tx.status];
                const TypeIcon = typeInfo.icon;

                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TypeIcon size={16} className={typeInfo.color} />
                        <span className="capitalize text-sm font-medium">
                          {tx.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`font-medium ${
                          tx.type === 'INCOME'
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'} Rp{' '}
                        {tx.amount.toLocaleString('id-ID')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {tx.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs font-mono"
                      >
                        {tx.unit?.code}
                      </Badge>
                      <div className="text-xs text-slate-500">
                        {tx.unit?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <span className="text-sm">
                          {tx.createdBy?.name || tx.createdBy?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {tx.status === 'PENDING' && (
                          <Clock size={14} className="text-amber-500" />
                        )}
                        {tx.status === 'APPROVED' && (
                          <CheckCircle size={14} className="text-green-500" />
                        )}
                        {tx.status === 'REJECTED' && (
                          <XCircle size={14} className="text-red-500" />
                        )}
                        <Badge variant={statusInfo.color as any}>
                          {statusInfo.label}
                        </Badge>
                        {tx.approvedAt && (
                          <div className="text-xs text-slate-400">
                            (di-{tx.status === 'APPROVED' ? 'setujui' : 'tolak'})
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-500">
                        {new Date(tx.createdAt).toLocaleDateString('id-ID')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {canCreate && tx.status === 'DRAFT' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(tx)}
                        >
                          <FileText size={14} className="mr-1" />
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info untuk approver */}
      {['SUPERADMIN', 'PIMPINAN'].includes(role ?? '') && (
        <div className="text-sm text-slate-500">
          <Calendar size={16} className="inline mr-1" />
          Lihat semua transaksi untuk approval di:{' '}
          <a
            href="/dashboard/approvals"
            className="text-brand-600 hover:underline"
          >
            halaman approval
          </a>
        </div>
      )}

      {/* Dialog Form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTx ? 'Edit Transaksi' : 'Transaksi Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                {submitError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Select value={formUnitId} onValueChange={setFormUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      <div className="flex items-center justify-between">
                        <span>{unit.name}</span>
                        <code className="text-xs bg-slate-100 px-1 rounded">
                          {unit.code}
                        </code>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipe *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="INCOME"
                    checked={formType === 'INCOME'}
                    onChange={() => setFormType('INCOME')}
                  />
                  <span className="text-green-600">Pemasukan</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="EXPENSE"
                    checked={formType === 'EXPENSE'}
                    onChange={() => setFormType('EXPENSE')}
                  />
                  <span className="text-red-600">Pengeluaran</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Nominal (Rp) *</Label>
              <Input
                id="amount"
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0"
                min="1"
                step="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi *</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Deskripsi transaksi..."
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Referensi (opsional)</Label>
              <Input
                id="reference"
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
                placeholder="No. faktur, kuitansi, dll."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-brand-600 hover:bg-brand-700"
            >
              {editingTx ? 'Update' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

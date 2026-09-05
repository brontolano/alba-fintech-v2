'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle,
  Clock,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

interface FinancialNote {
  id: string;
  title: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  date: string;
  unitId: string | null;
  unit: { id: string; name: string } | null;
  isReconciled: boolean;
  reconciledAt: string | null;
}

interface Unit {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  status: string;
  unitId: string | null;
}

export default function ReconciliationPage() {
  const [financialNotes, setFinancialNotes] = useState<FinancialNote[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchFinancialNotes = async () => {
    try {
      const params = new URLSearchParams();
      params.set('status', 'APPROVED');

      const res = await fetch(`/api/financial-notes?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat catatan keuangan');
      const data = await res.json();
      setFinancialNotes(data.data ?? []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data rekonsiliasi');
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      if (!res.ok) throw new Error('Gagal memuat unit');
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) throw new Error('Gagal memuat transaksi');
      const data = await res.json();
      setTransactions(data.data ?? []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchFinancialNotes(), fetchUnits(), fetchTransactions()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECONCILED':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            Selesai
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
            Pending
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
            Draft
          </span>
        );
    }
  };

  // Build reconciliation tasks from financial notes + transaction balance
  const reconciliationTasks = Array.from(new Set(financialNotes.map((n) => n.unitId))).map((unitId) => {
    const notesForUnit = financialNotes.filter((n) => n.unitId === unitId);
    const unit = units.find((u) => u.id === unitId);

    const income = notesForUnit
      .filter((n) => n.type === 'INCOME' && n.isReconciled)
      .reduce((sum, n) => sum + Number(n.amount), 0);

    const expense = notesForUnit
      .filter((n) => n.type === 'EXPENSE' && n.isReconciled)
      .reduce((sum, n) => sum + Number(n.amount), 0);

    const totalTxAmount = transactions
      .filter((t) => t.unitId === unitId && t.status === 'APPROVED')
      .reduce((sum, t) => {
        if (t.type === 'INCOME') return sum + Number(t.amount);
        if (t.type === 'EXPENSE') return sum - Number(t.amount);
        return sum;
      }, 0);

    const reconciledCount = notesForUnit.filter((n) => n.isReconciled).length;
    const status = reconciledCount === notesForUnit.length ? 'RECONCILED' : 'PENDING';

    return {
      id: unitId || 'unknown',
      date: notesForUnit[0]?.date || new Date().toISOString(),
      unit: unit?.name || 'Unit Tidak Dikenal',
      manager: 'Sistem',
      staff: `${notesForUnit.length} catatan`,
      income,
      expense,
      cashOnHand: 0, // This would require additional data from cash count forms
      systemBalance: totalTxAmount,
      variance: 0, // Cash on hand would be entered manually
      status,
      notes: notesForUnit,
    };
  });

  // Filter tasks
  const filteredTasks = reconciliationTasks.filter((task) => {
    const matchSearch = task.unit.toLowerCase().includes(filters.search.toLowerCase());
    const matchStatus = filters.status ? task.status === filters.status.toUpperCase() : true;
    const matchDate = filters.date ? task.date.startsWith(filters.date) : true;
    return matchSearch && matchStatus && matchDate;
  });

  const totalIncome = filteredTasks.reduce((sum, task) => sum + task.income, 0);
  const totalExpense = filteredTasks.reduce((sum, task) => sum + task.expense, 0);
  const totalVariance = filteredTasks.reduce((sum, task) => sum + task.variance, 0);
  const reconciledCount = filteredTasks.filter((t) => t.status === 'RECONCILED').length;
  const pendingCount = filteredTasks.filter((t) => t.status === 'PENDING').length;

  const handleReconcile = async (taskId: string) => {
    try {
      // Bulk update financial notes for this unit as reconciled
      const notesToReconcile = financialNotes.filter((n) => n.unitId === taskId && !n.isReconciled);

      for (const note of notesToReconcile) {
        await fetch(`/api/financial-notes/${note.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isReconciled: true,
            reconciledAt: new Date().toISOString(),
            status: 'APPROVED',
          }),
        });
      }

      toast.success(`Rekonsiliasi unit berhasil diselesaikan`);

      // Refresh data
      fetchFinancialNotes();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyelesaikan rekonsiliasi');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Rekonsiliasi Keuangan
          </h1>
          <p className="text-slate-600 mt-1">
            Rekonsiliasi harian per unit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm"
          >
            <Download size={16} />
            <span>Export Laporan</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari unit..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
          >
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="reconciled">Selesai</option>
          </select>

          <div className="flex items-center gap-2">
            <Clock size={18} className="text-slate-500" />
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">
          Memuat data rekonsiliasi...
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-600 font-medium mb-1">
                Total Unit
              </p>
              <p className="text-2xl font-bold text-slate-800">{filteredTasks.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-600 font-medium mb-1">
                Selesai
              </p>
              <p className="text-2xl font-bold text-green-600">
                {reconciledCount}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-600 font-medium mb-1">
                Perlu Rekonsiliasi
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {pendingCount}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-600 font-medium mb-1">
                Total Selisih
              </p>
              <p
                className={`text-2xl font-bold ${
                  totalVariance >= 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {formatCurrency(Math.abs(totalVariance))}
              </p>
            </div>
          </div>

          {/* Reconciliation Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Tanggal</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Unit</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Pemasukan</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Pengeluaran</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Sistem</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Selisih</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Tidak ada data rekonsiliasi ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {format(new Date(task.date), 'dd MMM yyyy', { locale: id })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-emerald-600">
                            {task.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-green-600">
                          {formatCurrency(task.income)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-red-600">
                          {formatCurrency(task.expense)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-slate-600">
                          {formatCurrency(task.systemBalance)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`text-sm font-medium ${
                              task.variance === 0
                                ? 'text-slate-800'
                                : task.variance > 0
                                ? 'text-red-600'
                                : 'text-green-600'
                            }`}
                          >
                            {task.variance !== 0 && (task.variance > 0 ? '+ ' : '- ')}
                            {formatCurrency(Math.abs(task.variance))}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(task.status)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {task.status === 'PENDING' && (
                            <button
                              onClick={() => handleReconcile(task.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-50"
                              title="Selesaikan Rekonsiliasi"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
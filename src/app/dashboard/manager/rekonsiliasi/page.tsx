'use client';

import { useEffect, useState } from 'react';
import { Loader2, FileDown, Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, SelectContent,SelectItem, SelectTrigger,SelectValue } from '@/components/ui';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  unit: { name: string; code: string };
  createdBy: { name?: string; email: string; };
}

interface ReconciliationData {
  summary: {
    totalCount: number;
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    pendingCount: number;
    approvedCount: number;
  };
  transactions: Transaction[];
  date: string;
}

export default function RekonsiliasiPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchReconciliation = async (date: Date) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/unit-reconciliation?date=${date.toISOString().split('T')[0]}`);
      const result = await res.json();
      setData(result.data);
    } catch (err) {
      console.error('Error fetching reconciliation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation(selectedDate);
  }, [selectedDate]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const summary = data?.summary || {
    totalCount: 0,
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    pendingCount: 0,
    approvedCount: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rekonsiliasi Kasir</h1>
          <p className="text-slate-500 text-sm mt-1">
            Tanggal: {formatDate(selectedDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateChange(-1)}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
          >
            Hari Ini
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateChange(1)}
          >
            Besok
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Transaksi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-800">{summary.totalCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 bg-green-50">
                <CardTitle className="text-sm font-medium text-green-600">Pemasukan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalIncome)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 bg-red-50">
                <CardTitle className="text-sm font-medium text-red-600">Pengeluaran</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.totalExpense)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 bg-blue-50">
                <CardTitle className="text-sm font-medium text-blue-600">Saldo Bersih</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(summary.netBalance)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Menunggu Persetujuan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-amber-600">{summary.pendingCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Sudah Disetujui</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-emerald-600">{summary.approvedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Tanggal Cetak</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-slate-700">
                  {format(new Date(), 'dd MMM yyyy')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Transaksi ({data?.transactions.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.transactions.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Tidak ada transaksi untuk hari ini</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs text-slate-500">No</th>
                        <th className="px-4 py-2 text-left text-xs text-slate-500">Keterangan</th>
                        <th className="px-4 py-2 text-right text-xs text-slate-500">Jumlah</th>
                        <th className="px-4 py-2 text-center text-xs text-slate-500">Status</th>
                        <th className="px-4 py-2 text-center text-xs text-slate-500">Dibuat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.transactions || []).map((tx, idx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm text-slate-600">{idx + 1}</td>
                          <td className="px-4 py-2 text-sm">
                            <div className="font-medium">{tx.description}</div>
                            <div className="text-xs text-slate-500">
                              Unit: {tx.unit?.code} | {tx.unit?.name}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-medium">
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Badge variant={tx.type === 'INCOME' ? 'default' : 'danger'}>
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-sm text-center text-slate-500">
                            {format(new Date(tx.createdAt), 'HH:mm')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { Loader2, FileDown, Calendar, Filter, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select, SelectContent,SelectItem, SelectTrigger,SelectValue } from '@/components/ui';
import { format } from 'date-fns';

interface UnitSummary {
  unitId: string;
  unitName: string;
  unitCode: string;
  isRetail: boolean;
  hasInventory: boolean;
  total: number;
  income: number;
  expense: number;
  transactionCount: number;
  approvedCount: number;
  pendingCount: number;
}

interface LembagaReport {
  summary: {
    period: { startDate: string; endDate: string };
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    totalTransactions: number;
    approvedTransactions: number;
    pendingTransactions: number;
    byUnit: UnitSummary[];
    byType: { INCOME: number; EXPENSE: number };
  };
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<LembagaReport | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(i, 1);
    return {
      value: i,
      label: date.toLocaleString('id-ID', { month: 'long' }),
    };
  });

  const fetchReport = async (date: Date) => {
    setLoading(true);
    try {
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const res = await fetch(
        `/api/reports/lembaga?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const result = await res.json();
      setReport(result.data);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedMonth);
  }, [selectedMonth]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const currentMonth = selectedMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  const summary = report?.summary || {
    period: { startDate: '', endDate: '' },
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    totalTransactions: 0,
    approvedTransactions: 0,
    pendingTransactions: 0,
    byUnit: [],
    byType: { INCOME: 0, EXPENSE: 0 },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Laporan Keuangan Lembaga</h1>
          <p className="text-slate-500 text-sm mt-1">
            Bulan: {currentMonth}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchReport(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))}>
            <Calendar size={16} className="mr-2" />
            Bulan Lalu
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchReport(new Date())}>
            <Calendar size={16} className="mr-2" />
            Ini Bulan
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2 bg-green-50">
                <CardTitle className="text-sm font-medium text-green-600">Total Pemasukan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 bg-red-50">
                <CardTitle className="text-sm font-medium text-red-600">Total Pengeluaran</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(summary.totalExpense)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 bg-blue-50">
                <CardTitle className="text-sm font-medium text-blue-600">Saldo Bersih</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(summary.netBalance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 bg-slate-50">
                <CardTitle className="text-sm font-medium text-slate-600">Transaksi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-800">
                  {summary.totalTransactions}
                </p>
                <p className="text-xs text-slate-500">
                  {summary.approvedTransactions} disetujui
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 size={20} className="text-slate-600" />
                  Pemasukan vs Pengeluaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-600">Pemasukan</span>
                      <span className="font-medium">{formatCurrency(summary.byType.INCOME)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${summary.totalIncome > 0 ? (summary.byType.INCOME / (summary.byType.INCOME + summary.byType.EXPENSE)) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-600">Pengeluaran</span>
                      <span className="font-medium">{formatCurrency(summary.byType.EXPENSE)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${summary.byType.EXPENSE > 0 ? (summary.byType.EXPENSE / (summary.byType.INCOME + summary.byType.EXPENSE)) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Transaksi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Menunggu Persetujuan</span>
                    <Badge variant="outline">{summary.pendingTransactions}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Sudah Disetujui</span>
                    <Badge variant="default">{summary.approvedTransactions}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Total Transaksi</span>
                    <Badge variant="warning">{summary.totalTransactions}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Units Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Pembayaran per Unit ({summary.byUnit.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.byUnit.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Tidak ada data unit</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs text-slate-500">Unit</th>
                        <th className="px-4 py-2 text-center text-xs text-slate-500">Retail</th>
                        <th className="px-4 py-2 text-right text-xs text-slate-500">Pemasukan</th>
                        <th className="px-4 py-2 text-right text-xs text-slate-500">Pengeluaran</th>
                        <th className="px-4 py-2 text-right text-xs text-slate-500">Saldo</th>
                        <th className="px-4 py-2 text-center text-xs text-slate-500">Transaksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.byUnit.map((unit) => (
                        <tr key={unit.unitId} className="hover:bg-slate-50">
                          <td className="px-4 py-2">
                            <div className="font-medium">{unit.unitName}</div>
                            <div className="text-xs text-slate-500">{unit.unitCode}</div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {unit.isRetail ? 'Ya' : 'Tidak'}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-green-600">
                            {formatCurrency(unit.income)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-red-600">
                            {formatCurrency(unit.expense)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatCurrency(unit.income - unit.expense)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Badge variant="info">{unit.transactionCount}</Badge>
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
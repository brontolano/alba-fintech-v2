'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend as LegendJS,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, LegendJS);

interface UnitInfo {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface ReportData {
  monthlyData: { month: string; income: number; expense: number }[];
  statCards: { income: number; expense: number; netProfit: number; profitRatio: number };
  summary: { totalTransactions: number; totalUnits: number; period: string };
}

interface Transaction {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  description: string;
  category: { name: string; code: string } | null;
  status: string;
}

export default function UnitReportPage({ params }: { params: Promise<{ unitId: string }> }) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ unitId: string } | null>(null);
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const unitId = resolvedParams?.unitId;

  useEffect(() => {
    if (!unitId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch report aggregations
        const res = await fetch(`/api/reports/aggregations?unitId=${unitId}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Gagal memuat laporan');
        const reportData = await res.json();
        setReport({
          monthlyData: reportData.monthlyData || [],
          statCards: reportData.statCards,
          summary: reportData.summary,
        });

        // Fetch unit info (fetch all units, filter client-side)
        const unitRes = await fetch('/api/units', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (unitRes.ok) {
          const unitData = await unitRes.json();
          const found = unitData.data?.find((u: any) => u.id === unitId);
          if (found) {
            setUnit({
              id: found.id,
              name: found.name,
              code: found.code,
              type: found.type || 'UMUM',
            });
          }
        }

        // Fetch recent transactions for this unit
        const txRes = await fetch(
          `/api/transactions?unitId=${unitId}&limit=50`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (txRes.ok) {
          const txData = await txRes.json();
          const txs = txData.data?.map((t: any) => ({
            id: t.id,
            date: t.date,
            type: t.type,
            amount: Number(t.amount),
            description: t.description,
            category: t.category || null,
            status: t.status,
          })) || [];
          setTransactions(txs);
        }
      } catch (err: any) {
        toast.error(err.message || 'Gagal memuat laporan');
        router.push('/dashboard/reports');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [unitId, router]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

  const exportCSV = () => {
    if (!report || !unit) return;
    const rows = [
      ['Laporan Unit', unit.name],
      ['Total Transaksi', report.summary.totalTransactions.toString()],
      ['Total Pemasukan', formatCurrency(report.statCards.income)],
      ['Total Pengeluaran', formatCurrency(report.statCards.expense)],
      ['Net Profit', formatCurrency(report.statCards.netProfit)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${unit.code}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !resolvedParams) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">Memuat laporan...</div>
      </div>
    );
  }

  if (!report || !unit) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">Laporan tidak ditemukan</div>
      </div>
    );
  }

  const netColor = report.statCards.netProfit >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/reports')}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Laporan {unit.name}
            </h1>
            <p className="text-slate-600 mt-1">
              Unit: {unit.code} ({unit.type})
            </p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Download size={16} />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Transaksi</p>
          <p className="text-2xl font-bold text-slate-800">{report.summary.totalTransactions}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Pemasukan</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(report.statCards.income)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Pengeluaran</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(report.statCards.expense)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Net Profit</p>
          <p className={`text-2xl font-bold ${netColor}`}>
            {formatCurrency(report.statCards.netProfit)}
          </p>
          <p className="text-xs text-slate-500">
            Margin: {report.statCards.profitRatio}%
          </p>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Tren Bulanan</h2>
        <Bar
          data={{
            labels: report.monthlyData.map((m) => m.month),
            datasets: [
              { label: 'Pemasukan', data: report.monthlyData.map((m) => m.income), backgroundColor: '#10b984' },
              { label: 'Pengeluaran', data: report.monthlyData.map((m) => m.expense), backgroundColor: '#ef4444' },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { position: 'top' }, title: { display: false } },
          }}
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-800 p-6 pb-0">Transaksi Terkait</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Tanggal</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Deskripsi</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Kategori</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Jumlah</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {new Date(tx.date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-800">{tx.description}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{tx.category?.name || '-'}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-medium ${
                      tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      tx.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : tx.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : tx.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              Tidak ada transaksi
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

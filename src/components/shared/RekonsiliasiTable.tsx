'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Tag } from 'lucide-react';
import { Badge } from '@/components/ui';

interface Transaction {
  id: string;
  unitId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  status: string;
  reference?: string;
  accountId?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  account?: { id: string; name: string; code: string; type: string } | null;
  unit?: { name: string; code: string };
  createdBy?: { name?: string | null; email: string };
  approvedBy?: { name?: string | null; email: string } | null;
}

interface Props {
  apiParams: string;
}

export default function RekonsiliasiTable({ apiParams }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 25;

  const baseUrl = `/api/reconciliation?${apiParams}`;

  useEffect(() => {
    const fetchTx = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${baseUrl}&page=${page}&perPage=${perPage}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setTransactions(data.data?.transactions ?? []);
      } catch (err) {
        console.error(err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTx();
  }, [baseUrl, page]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const classForType = (type: string) =>
    type === 'INCOME'
      ? 'bg-green-50 text-green-700'
      : 'bg-red-50 text-red-700';

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 border border-slate-200 rounded-xl">
        <Calendar size={48} className="mx-auto mb-3" />
        <p>Tidak ada transaksi ditemukan untuk filter ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
        <Tag size={18} /> Detail Transaksi (Disetujui)
      </h2>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm text-left min-w-[800px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-xs text-slate-500">Tanggal</th>
              <th className="px-4 py-2 text-xs text-slate-500">Deskripsi</th>
              <th className="px-4 py-2 text-xs text-slate-500">Unit</th>
              <th className="px-4 py-2 text-xs text-slate-500">Akun</th>
              <th className="px-4 py-2 text-xs text-slate-500 text-right">Jumlah</th>
              <th className="px-4 py-2 text-xs text-slate-500 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-xs text-slate-600 font-mono">
                  {new Date(tx.createdAt).toLocaleDateString('id-ID')}
                </td>
                <td className="px-4 py-2">
                  <div className="font-medium text-slate-800">{tx.description}</div>
                  {tx.reference && (
                    <div className="text-xs text-slate-400 mt-0.5">Ref: {tx.reference}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-slate-600">
                  {tx.unit?.code ?? '-'}
                </td>
                <td className="px-4 py-2 text-xs text-slate-600">
                  {tx.account?.code ?? '-'} — {tx.account?.name ?? '-'}
                </td>
                <td className={`px-4 py-2 text-sm font-mono text-right ${tx.type === 'INCOME' ? 'text-green-700' : 'text-red-700'}`}>
                  {tx.type === 'EXPENSE' ? '-' : '+'} {formatCurrency(tx.amount)}
                </td>
                <td className="px-4 py-2 text-center">
                  <Badge className={classForType(tx.type)} variant="default">
                    {tx.type}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination sederhana */}
      {transactions.length >= perPage && (
        <div className="flex justify-between items-center pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm disabled:opacity-50"
          >
            <ChevronLeft size={14} className="inline mr-1" />
            Sebelumnya
          </button>
          <span className="text-sm text-slate-500">Halaman {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={transactions.length < perPage}
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm disabled:opacity-50"
          >
            Berikutnya
            <ChevronRight size={14} className="inline ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}

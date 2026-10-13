// app/pimpinan/PimpinanDashboardClient.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '../../components/santri/Button';
import { Badge } from '../../components/santri/Badge';

interface PimpinanStats {
  totalSantri: number;
  totalTagihan: number;
  totalPembayaranBulanIni: number;
  pendingApprovals: number;
  cashflowBulanIni: { incoming: number; outgoing: number; net: number };
  totalOutstanding: number;
}

interface DailyCashflowItem {
  date: string;
  incoming: number;
  outgoing: number;
  net: number;
}

interface TopOutstandingItem {
  santri: string;
  santriId: string;
  outstanding: number;
  tagihanId: string;
}

interface PimpinanDashboardResponse {
  stats: PimpinanStats;
  dailyCashflow: DailyCashflowItem[];
  topOutstanding: TopOutstandingItem[];
}

export function PimpinanDashboardClient() {
  const [data, setData] = useState<PimpinanDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/pimpinan/dashboard', { cache: 'no-store' });
        if (!res.ok) throw new Error('Gagal memuat dashboard');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        {error}
        <button className="ml-4 underline" onClick={() => window.location.reload()}>Coba lagi</button>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-500">Tidak ada data dashboard</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Pimpinan</h1>
          <p className="text-sm text-gray-500">
            Ringkasan operasional & pelaporan unit KPAK
          </p>
        </div>
        <Link href="/pimpinan/broadcast" className="btn btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Broadcast
        </Link>
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Santri</p>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-800 mt-2">{data.stats.totalSantri}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Tagihan</p>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-800 mt-2">{data.stats.totalTagihan}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Pembayaran Bulan Ini</p>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-green-600 mt-2">{formatRupiah(data.stats.totalPembayaranBulanIni)}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Pending Approval</p>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{data.stats.pendingApprovals}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashflow & Outstanding */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Cashflow Bulan Ini</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Pemasukan</p>
                <p className="text-xl font-bold text-green-600">{formatRupiah(data.stats.cashflowBulanIni.incoming)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pengeluaran</p>
                <p className="text-xl font-bold text-red-600">{formatRupiah(data.stats.cashflowBulanIni.outgoing)}</p>
              </div>
            </div>
            <div className="mt-3 border-t border-gray-200 pt-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Net Cashflow</span>
                <span className={`font-bold ${data.stats.cashflowBulanIni.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatRupiah(data.stats.cashflowBulanIni.net)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Outstanding Tagihan</h3>
            <div className="text-2xl font-bold text-amber-600">{formatRupiah(data.stats.totalOutstanding)}</div>
            <p className="text-sm text-gray-500 mt-1">Total tagihan belum lunas: {data.stats.totalOutstanding.toLocaleString('id-ID')} dokumen</p>
          </div>
        </div>

        {/* Daily Cashflow */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Cashflow 7 Hari Terakhir</h3>
          <div className="space-y-2">
            {data.dailyCashflow.map((item) => (
              <div key={item.date} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{formatDate(item.date)}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">Masuk: {formatRupiah(item.incoming)}</span>
                  <span className={`font-medium ${item.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.net >= 0 ? '+' : ''}{formatRupiah(item.net)}
                  </span>
                  <span className="text-gray-500">Keluar: {formatRupiah(item.outgoing)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Outstanding Santri */}
      {data.topOutstanding.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Santri dengan Outstanding Terbesar</h3>
          <div className="space-y-2">
            {data.topOutstanding.map((item, idx) => (
              <div key={item.santriId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">{idx + 1}</span>
                  <div>
                    <p className="font-medium">{item.santri}</p>
                    <p className="text-xs text-gray-400">Tagihan #{item.tagihanId.slice(0, 8)}...</p>
                  </div>
                </div>
                <span className="font-bold text-amber-600">{formatRupiah(item.outstanding)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href="/pimpinan/approvals" className="btn btn-outline flex-1">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Approvals
        </Link>
        <Link href="/pimpinan/broadcast" className="btn btn-outline flex-1">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Broadcast
        </Link>
      </div>
    </div>
  );
}
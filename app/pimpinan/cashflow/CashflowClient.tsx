// app/pimpinan/cashflow/CashflowClient.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/santri/Button';
import { Input } from '../../../components/santri/Input';
import { Badge } from '../../../components/santri/Badge';

interface DailyCashflow {
  date: string;
  incoming: number;
  outgoing: number;
  net: number;
  count: number;
}

interface UnitCashflow {
  unitId: string;
  unitName: string;
  incoming: number;
  outgoing: number;
  total: number;
  net: number;
  daily: DailyCashflow[];
}

interface CashflowData {
  startDate: string;
  endDate: string;
  units: UnitCashflow[];
  global: {
    incoming: number;
    outgoing: number;
    net: number;
  };
}

export function CashflowClient() {
  const [data, setData] = useState<CashflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchCashflow = useCallback(async () => {
    try {
      const res = await fetch(`/api/pimpinan/cashflow?startDate=${startDate}&endDate=${endDate}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat cashflow');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchCashflow();
  }, [fetchCashflow]);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cashflow Per Unit</h1>
          <p className="text-sm text-gray-500">
            Ringkasan kas masuk/keluar tiap unit KPAK
          </p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button
            variant="primary"
            onClick={fetchCashflow}
            className="flex-1"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Masuk</p>
          <p className="text-2xl font-bold text-green-600">{formatRupiah(data?.global.incoming || 0)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Keluar</p>
          <p className="text-2xl font-bold text-red-600">{formatRupiah(data?.global.outgoing || 0)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Net Cashflow</p>
          <p className={`text-2xl font-bold ${data?.global.net && data.global.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatRupiah(data?.global.net || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Unit</p>
          <p className="text-2xl font-bold text-gray-800">{data?.units.length || 0}</p>
        </div>
      </div>

      {/* Unit Cashflow */}
      {data?.units.map((unit) => (
        <div key={unit.unitId} className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">{unit.unitName}</h3>
              <Badge variant="info">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8-8 8m8-16h8" />
                </svg>
                Net: {formatRupiah(unit.net)}
              </Badge>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Masuk</p>
                <p className="text-xl font-bold text-green-600">{formatRupiah(unit.incoming)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Keluar</p>
                <p className="text-xl font-bold text-red-600">{formatRupiah(unit.outgoing)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-800">{formatRupiah(unit.total)}</p>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div className="space-y-2">
              {unit.daily.map((day) => (
                <div key={day.date} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{formatDate(day.date)}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500">Masuk: {formatRupiah(day.incoming)}</span>
                    <span className={`font-medium ${day.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {day.net >= 0 ? '+' : ''}{formatRupiah(day.net)}
                    </span>
                    <span className="text-gray-500">Keluar: {formatRupiah(day.outgoing)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
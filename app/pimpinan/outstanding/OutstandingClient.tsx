// app/pimpinan/outstanding/OutstandingClient.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/santri/Button';
import { Badge } from '../../../components/santri/Badge';

interface OutstandingItem {
  santriId: string;
  santriName: string;
  tagihanId: string;
  tagihanName: string;
  total: number;
  paid: number;
  outstanding: number;
}

interface UnitOutstanding {
  unitId: string;
  unitName: string;
  totalTagihan: number;
  totalOutstanding: number;
  pendingCount: number;
  items: OutstandingItem[];
}

interface OutstandingData {
  data: UnitOutstanding[];
  global: {
    totalTagihan: number;
    totalOutstanding: number;
    pendingCount: number;
  };
}

export function OutstandingClient() {
  const [data, setData] = useState<OutstandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUnit, setFilterUnit] = useState('');

  const fetchOutstanding = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterUnit) params.append('unitId', filterUnit);
      params.append('status', 'UNPAID');
      const res = await fetch(`/api/pimpinan/outstanding?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat outstanding');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterUnit]);

  useEffect(() => {
    fetchOutstanding();
  }, [fetchOutstanding]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
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
          <h1 className="text-2xl font-bold text-gray-800">Outstanding Tagihan</h1>
          <p className="text-sm text-gray-500">
            Daftar tagihan belum lunas per unit dan per santri
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">Semua Unit</option>
          </select>
          <Button variant="outline" onClick={fetchOutstanding} className="flex-1">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
            </svg>
            Filter
          </Button>
        </div>
      </div>

      {/* Global Summary */}
      {data?.global && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Tagihan</p>
            <p className="text-2xl font-bold text-gray-800">{data.global.totalTagihan}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Outstanding</p>
            <p className="text-2xl font-bold text-amber-600">{formatRupiah(data.global.totalOutstanding)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Pending Count</p>
            <p className="text-2xl font-bold text-gray-800">{data.global.pendingCount}</p>
          </div>
        </div>
      )}

      {/* Unit Outstanding */}
      {data?.data.map((unit) => (
        <div key={unit.unitId} className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">{unit.unitName}</h3>
              <Badge variant="warning">Pending: {unit.pendingCount}</Badge>
            </div>
          </div>
          <div className="p-6">
            <div className="text-2xl font-bold text-amber-600 mb-4">{formatRupiah(unit.totalOutstanding)}</div>
            <div className="space-y-3">
              {unit.items.map((item) => (
                <div key={item.tagihanId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.santriName}</p>
                      <p className="text-xs text-gray-400">{item.tagihanName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-600">{formatRupiah(item.outstanding)}</p>
                      <p className="text-xs text-gray-400">Total: {formatRupiah(item.total)}</p>
                    </div>
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
// app/retail/RetailDashboardClient.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '../../components/santri/Button';
import { Badge } from '../../components/santri/Badge';
import { RetailUnit } from '../../types/santri';

export function RetailDashboardClient() {
  const [retailUnits, setRetailUnits] = useState<RetailUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRetailUnits = async () => {
    try {
      const res = await fetch('/api/retail-units', { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat unit retail');
      const data = await res.json();
      setRetailUnits(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailUnits();
  }, []);

  const typeLabels: Record<string, string> = {
    KOPERASI: 'Koperasi',
    KANTIN: 'Kantin',
  };
  const typeColors: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    KOPERASI: 'info',
    KANTIN: 'success',
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Retail (Koperasi & Kantin)</h1>
          <p className="text-sm text-gray-500">Kelola unit retail, produk, dan transaksi POS</p>
        </div>
        <Link href="/retail/new" className="btn btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Unit Retail
        </Link>
      </div>

      {retailUnits.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Belum ada unit retail</h3>
          <p className="mt-1 text-gray-500">Mulai dengan menambah unit Koperasi atau Kantin pertama.</p>
          <Link href="/retail/new" className="mt-6 inline-block btn btn-primary">
            Tambah Unit Retail
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {retailUnits.map(unit => (
            <Link key={unit.id} href={`/retail/${unit.id}`} className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{unit.name}</h3>
                  <p className="text-sm text-gray-500">Kode: {unit.code}</p>
                </div>
                <Badge variant={typeColors[unit.type] || 'default'}>
                  {typeLabels[unit.type] || unit.type}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                {unit.description && <p>{unit.description}</p>}
                <p>Unit: {unit.unitId}</p>
                <p className="flex items-center gap-1">
                  <span className={unit.isActive ? 'text-green-600' : 'text-red-600'}>
                    {unit.isActive ? '● Aktif' : '● Nonaktif'}
                  </span>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <Link href={`/retail/${unit.id}`} className="btn btn-secondary flex-1 text-center py-2 px-3">
                  <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  POS
                </Link>
                <Link href={`/retail/${unit.id}/products`} className="btn btn-outline flex-1 text-center py-2 px-3">
                  Produk
                </Link>
                <Link href={`/retail/${unit.id}/transactions`} className="btn btn-outline flex-1 text-center py-2 px-3">
                  Transaksi
                </Link>
                <Link href={`/retail/${unit.id}/inventory`} className="btn btn-outline flex-1 text-center py-2 px-3">
                  Inventory
                </Link>
                <Link href={`/retail/${unit.id}/edit`} className="btn btn-ghost flex-1 text-center py-2 px-3" title="Edit Unit">
                  <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Link>
                <button
                  onClick={async () => {
                    if (confirm('Hapus unit retail ini? Data produk dan transaksi akan ikut terhapus.')) {
                      try {
                        const res = await fetch(`/api/retail-units/${unit.id}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error('Gagal menghapus');
                        fetchRetailUnits();
                      } catch (err: any) {
                        alert(err.message);
                      }
                    }
                  }}
                  className="btn btn-ghost text-red-600 hover:bg-red-50 flex-1 text-center py-2 px-3"
                  title="Hapus Unit"
                >
                  <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
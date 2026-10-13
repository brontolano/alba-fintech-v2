// app/pimpinan/laporan/LaporanClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/santri/Button';
import { Input } from '../../../components/santri/Input';
import { Badge } from '../../../components/santri/Badge';

interface Report {
  id: string;
  unitId: string;
  unit?: { name: string };
  type: string;
  data: string;
  notes?: string;
  createdById: string;
  createdBy?: { name: string };
  createdAt: string;
  isDeleted: boolean;
}

interface ReportData extends Report {
  totalValue: number;
}

const TYPE_LABELS: Record<string, string> = {
  LAPORAN_TABUNGAN: 'Laporan Tabungan',
  HER: 'HER',
  DAFTAR_ULANG: 'Daftar Ulang',
  DANA_KELUAR: 'Dana Keluar',
  LAPORAN_HARIAN: 'Laporan Harian',
};

const TYPE_COLORS: Record<string, 'success' | 'warning' | 'info' | 'error' | 'default'> = {
  LAPORAN_TABUNGAN: 'info',
  HER: 'warning',
  DAFTAR_ULANG: 'default',
  DANA_KELUAR: 'error',
  LAPORAN_HARIAN: 'default',
};

export function LaporanClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [unitId, setUnitId] = useState('');
  const [type, setType] = useState('');
  const [notes, setNotes] = useState('');
  const [data, setData] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/pimpinan/laporan', { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat laporan');
      const json = await res.json();
      // Parse data JSON string
      const parsed = (json.data || []).map((r: any) => ({
        ...r,
        data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
      }));
      setReports(parsed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId || !type) return;

    // Validate JSON data
    let parsedData: any = {};
    try {
      parsedData = data ? JSON.parse(data) : {};
    } catch {
      setError('Data harus berupa JSON valid');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/pimpinan/laporan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId, type, data: parsedData, notes, createdById: 'system' }),
      });
      if (!res.ok) throw new Error('Gagal membuat laporan');
      setShowForm(false);
      setUnitId('');
      setType('');
      setNotes('');
      setData('');
      setError(null);
      fetchReports();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
          <h1 className="text-2xl font-bold text-gray-800">Laporan Keuangan</h1>
          <p className="text-sm text-gray-500">
            Input & pemantauan laporan per unit (tabungan, HER, daftar ulang, dana keluar)
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showForm ? 'Batal' : 'Buat Laporan'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Input Laporan Baru</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Pilih unit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Laporan</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="LAPORAN_TABUNGAN">Laporan Tabungan</option>
                <option value="HER">HER</option>
                <option value="DAFTAR_ULANG">Daftar Ulang</option>
                <option value="DANA_KELUAR">Dana Keluar</option>
                <option value="LAPORAN_HARIAN">Laporan Harian</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data (JSON)</label>
              <textarea
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[100px]"
                placeholder='{"nominal": 500000, "santri_id": "s1", "tanggal": "2026-10-01"}'
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={creating} className="flex-1">
                {creating ? 'Menyimpan...' : 'Simpan Laporan'}
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Batal
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Riwayat Laporan</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {reports.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Belum ada laporan
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-gray-800">{TYPE_LABELS[report.type] || report.type}</div>
                  <div className="text-sm text-gray-500">Unit: {report.unit?.name || report.unitId}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Dibuat: {formatDate(report.createdAt)} oleh {report.createdBy?.name || 'system'}
                  </div>
                  {report.notes && <div className="text-xs text-gray-400">{report.notes}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={TYPE_COLORS[report.type] || 'default'}>
                    {TYPE_LABELS[report.type] || report.type}
                  </Badge>
                  <span className="text-sm text-gray-500">{report.createdAt}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
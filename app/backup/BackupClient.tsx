// app/backup/BackupClient.tsx
'use client';

import { useState } from 'react';
import { Button } from '../../components/santri/Button';

interface BackupResponse {
  metadata: {
    version: string;
    exportedAt: string;
    exportedBy: string;
    format: string;
  };
  data: Record<string, any[]>;
}

export function BackupClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [backupInfo, setBackupInfo] = useState<BackupResponse | null>(null);
  const [includeAudit, setIncludeAudit] = useState(true);
  const [includeNotifications, setIncludeNotifications] = useState(true);

  const handleBackup = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const params = new URLSearchParams({
        includeAudit: includeAudit.toString(),
        includeNotifications: includeNotifications.toString(),
      });
      const res = await fetch(`/api/backup?${params.toString()}`, {
        headers: {
          'x-user-role': 'SUPERADMIN', // In production, get from auth context
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membuat backup');
      }
      const data: BackupResponse = await res.json();
      setBackupInfo(data);
      setSuccess(true);

      // Auto-download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alba-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTableCounts = () => {
    if (!backupInfo) return [];
    return Object.entries(backupInfo.data)
      .map(([key, value]) => ({ table: key, count: value.length }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Backup Data</h1>
        <p className="text-sm text-gray-500">Ekspor semua data sistem ke file JSON untuk keperluan backup/restore</p>
      </div>

      {/* Backup Options */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Opsi Backup</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeAudit}
              onChange={(e) => setIncludeAudit(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm">Sertakan Audit Log</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeNotifications}
              onChange={(e) => setIncludeNotifications(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm">Sertakan Notifikasi</span>
          </label>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button
            variant="primary"
            isLoading={loading}
            onClick={handleBackup}
            className="w-full sm:w-auto"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Buat Backup & Download
          </Button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
          {error}
        </div>
      )}

      {success && backupInfo && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md" role="alert">
          <p className="font-medium">Backup berhasil dibuat!</p>
          <p className="text-sm">File telah didownload otomatis.</p>
          <div className="mt-2 text-sm">
            <p>Ekspor pada: {new Date(backupInfo.metadata.exportedAt).toLocaleString('id-ID')}</p>
            <p>Oleh: {backupInfo.metadata.exportedBy}</p>
          </div>
        </div>
      )}

      {/* Preview/Info */}
      {backupInfo && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Ringkasan Data Backup</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tabel</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah Record</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getTableCounts().map(({ table, count }) => (
                  <tr key={table}>
                    <td className="px-4 py-2 text-sm text-gray-900 font-mono">{table}</td>
                    <td className="px-4 py-2 text-right text-sm text-gray-900">{count.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-md text-sm">
            <p className="font-medium">Total tabel dengan data: {getTableCounts().length}</p>
            <p className="text-gray-600">File backup mengandung semua data master, transaksi, dan relasi sistem.</p>
            <p className="text-gray-600 mt-1">Password user di-redacted ([REDACTED]) untuk keamanan.</p>
          </div>
        </div>
      )}
    </div>
  );
}
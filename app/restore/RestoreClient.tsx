// app/restore/RestoreClient.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '../../components/santri/Button';
import { Input } from '../../components/santri/Input';
import { Badge } from '../../components/santri/Badge';

interface RestorePreview {
  metadata: {
    version: string;
    exportedAt: string;
    exportedBy: string;
    format: string;
  };
  data: Record<string, any[]>;
}

export function RestoreClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [confirmRestore, setConfirmRestore] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('File harus berformat .json');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPreview(null);
    setSuccess(false);

    // Preview the file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.metadata || !data.data) {
          throw new Error('Format backup tidak valid');
        }
        setPreview(data);
      } catch (err) {
        setError('File JSON tidak valid atau format backup salah');
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      setError('Pilih file backup terlebih dahulu');
      return;
    }

    if (!confirmRestore) {
      setConfirmRestore(true);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress('Mengirim file...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Use a custom fetch with progress simulation since we can't track upload progress easily
      const res = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      setProgress('Memproses restore...');
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal restore data');
      }

      setProgress('Restore selesai!');
      setSuccess(true);
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress('');
      setConfirmRestore(false);
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
    if (!preview) return [];
    return Object.entries(preview.data)
      .map(([key, value]) => ({ table: key, count: value.length }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Restore Data</h1>
        <p className="text-sm text-gray-500">Impor data sistem dari file backup JSON</p>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">⚠️ Peringatan: Restore akan menimpa data yang ada</p>
            <p className="text-sm mt-1">Operasi ini tidak bisa dibatalkan. Pastikan Anda memiliki backup terbaru sebelum melanjutkan. 
              Data yang akan di-restore: semua tabel master, transaksi, relasi, dan konfigurasi sistem.
              Password user tidak termasuk dalam backup (di-redacted).
            </p>
          </div>
        </div>
      </div>

      {/* File Selection */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Pilih File Backup</h2>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <input
              ref={fileInputRef}
              id="backup-file"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="sr-only"
              disabled={loading}
            />
            <label htmlFor="backup-file" className="cursor-pointer">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Klik atau drag & drop file <code className="bg-gray-100 px-1 rounded">.json</code> di sini
              </p>
              <p className="text-xs text-gray-400 mt-1">Maksimal 50MB</p>
            </label>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.534a1 1 0 00.706-.254l4-1.714a.999.999 0 01.355.257l6.516 2.94a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                </svg>
                <div>
                  <p className="font-medium text-blue-800">{selectedFile.name}</p>
                  <p className="text-sm text-blue-600">{formatBytes(selectedFile.size)}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                Hapus
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Pratinjau Backup</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Versi</p>
              <p className="font-mono">{preview.metadata.version}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Tanggal Ekspor</p>
              <p className="font-mono">{new Date(preview.metadata.exportedAt).toLocaleString('id-ID')}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Diekspor Oleh</p>
              <p className="font-mono">{preview.metadata.exportedBy}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Format</p>
              <p className="font-mono">{preview.metadata.format}</p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-64">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tabel</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Record</th>
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
            <p className="text-gray-600 mt-1">Klik "Restore Data" di bawah untuk memulai proses impor.</p>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md" role="alert">
          <p className="font-medium">Restore berhasil!</p>
          <p className="text-sm mt-1">Data sistem telah dipulihkan dari backup. Silakan refresh halaman untuk melihat perubahan.</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <Button
            variant="secondary"
            onClick={() => { setSelectedFile(null); setPreview(null); setError(null); setSuccess(false); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            isLoading={loading}
            onClick={handleRestore}
            disabled={!selectedFile || loading}
            className="sm:w-auto"
          >
            {confirmRestore && !loading ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Konfirmasi Restore
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
                </svg>
                Restore Data
              </>
            )}
          </Button>
        </div>
        {progress && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            {progress}
          </div>
        )}
      </div>
    </div>
  );
}
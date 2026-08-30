'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input,
} from '@/components/ui';
import { Trash2, Download, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!confirmReset) {
      toast.warning('Centang konfirmasi reset data');
      return;
    }
    if (!password) {
      toast.warning('Masukkan password superadmin');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal reset data');
      toast.success(data.message);
      setConfirmReset(false);
      setPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/export');
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal export');

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alba-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data berhasil diekspor');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.warning('Pilih file backup terlebih dahulu');
      return;
    }

    setLoading(true);
    try {
      const raw = await importFile.text();
      const parsed = JSON.parse(raw);

      const res = await fetch('/api/superadmin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsed }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal import');
      toast.success(data.message);
      setImportFile(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pengaturan Sistem</h1>
          <p className="text-slate-500 text-sm mt-1">Reset data, backup, dan import data aplikasi</p>
        </div>
      </div>

      {/* Reset Data Card */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={20} />
            Reset Data
          </CardTitle>
          <CardDescription>
            Hapus semua data kecuali pengguna SUPERADMIN. Data yang sudah dihapus tidak dapat dikembalikan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password superadmin"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="px-3 text-sm text-slate-600 hover:text-slate-800"
            >
              {showPassword ? 'Sembunyikan' : 'Lihat'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="confirmReset"
              checked={confirmReset}
              onChange={(e) => setConfirmReset(e.target.checked)}
            />
            <label htmlFor="confirmReset" className="text-sm text-slate-700">
              Saya yakin ingin menghapus semua data
            </label>
          </div>

          <Button
            variant="destructive"
            loading={loading}
            onClick={handleReset}
            className="gap-2"
          >
            <Trash2 size={16} /> Reset Data
          </Button>
        </CardContent>
      </Card>

      {/* Export Data Card */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Download size={20} />
            Ekspor Data
          </CardTitle>
          <CardDescription>
            Unduh semua data aplikasi dalam format JSON untuk keperluan backup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            loading={loading}
            onClick={handleExport}
            className="gap-2"
          >
            <Download size={16} /> Export Data
          </Button>
        </CardContent>
      </Card>

      {/* Import Data Card */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Upload size={20} />
            Impor Data
          </CardTitle>
          <CardDescription>
            Upload file backup JSON untuk mengembalikan data aplikasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept=".json,application/json"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />
          <Button
            variant="outline"
            loading={loading}
            onClick={handleImport}
            className="gap-2"
            disabled={!importFile}
          >
            <Upload size={16} /> Impor Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

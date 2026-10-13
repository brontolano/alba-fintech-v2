// app/tagihan/[id]/edit/TagihanEditClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../components/santri/Button';
import { Badge } from '../../../../components/santri/Badge';
import { Modal } from '../../../../components/santri/Modal';
import { Tagihan } from '../../../../types/santri';

export function TagihanEditClient() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const [tagihan, setTagihan] = useState<Tagihan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({ status: '' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tagihan/${id}`, { cache: 'no-store' });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Gagal mengambil data tagihan');
        }
        const data: Tagihan = await res.json();
        setTagihan(data);
        setFormData({ status: data.status });
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tagihan/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal memperbarui tagihan');
      }
      router.push(`/tagihan/${id}`);
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui tagihan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tagihan/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membatalkan tagihan');
      }
      router.push('/tagihan');
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan tagihan');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
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

  if (!tagihan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Data tagihan tidak ditemukan.</p>
        <Link href="/tagihan" className="mt-4 inline-block btn btn-primary">Kembali ke daftar</Link>
      </div>
    );
  }

  // Role gating (placeholder)
  const currentRole = 'SUPERADMIN';
  const canEdit = ['SUPERADMIN', 'MANAGER KPAK'].includes(currentRole);
  const canDelete = ['SUPERADMIN', 'MANAGER KPAK'].includes(currentRole);

  if (!canEdit) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Anda tidak memiliki izin untuk mengedit tagihan.</p>
      </div>
    );
  }

  const statusOptions = [
    { value: 'UNPAID', label: 'Belum Bayar' },
    { value: 'PARTIAL', label: 'Cicilan' },
    { value: 'PAID', label: 'Lunas' },
    { value: 'CANCELLED', label: 'Dibatalkan' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edit Tagihan</h1>
          <p className="text-sm text-gray-500">
            NIS: {tagihan.santri?.studentNumber} • Nama: {tagihan.santri?.name}
          </p>
        </div>
        <div>
          {canEdit && (
            <Button variant="secondary" onClick={() => router.push(`/tagihan/${id}`)}>
              Batalkan
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
            {error}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Informasi Tagihan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Template</p>
              <p className="font-medium">{tagihan.template?.name || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Tipe</p>
              <p className="text-gray-700">{tagihan.template?.type || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Tagihan</p>
              <p className="font-bold text-blue-700">Rp {tagihan.totalNilai.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-gray-500">Tanggal</p>
              <p className="text-gray-700">{new Date(tagihan.tanggal).toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Ubah Status</h2>
          <div className="form-group">
            <label htmlFor="status">Status <span className="text-error">*</span></label>
            <select
              id="status"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={() => router.push(`/tagihan/${id}`)}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Simpan Perubahan
          </Button>
        </div>
      </form>

      {/* Role gating for delete */}
      {canDelete && tagihan.status !== 'PAID' && (
        <div className="mt-4 flex justify-end">
          <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
            Batalkan Tagihan
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Konfirmasi Batalkan Tagihan"
        description="Apakah Anda yakin ingin membatalkan tagihan ini? Tagihan yang dibatalkan tidak bisa dibayar."
        actionLabel={deleting ? 'Membatalkan...' : 'Ya, Batalkan'}
        onAction={handleDelete}
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
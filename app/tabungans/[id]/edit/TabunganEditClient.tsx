// app/tabungans/[id]/edit/TabunganEditClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../components/santri/Button';
import { Badge } from '../../../../components/santri/Badge';
import { Modal } from '../../../../components/santri/Modal';
import { TabunganForm } from '../../../../components/santri/TabunganForm';
import { Tabungan } from '../../../../types/santri';

interface SantriOption {
  id: string;
  studentNumber: string;
  name: string;
}

export function TabunganEditClient() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const [tabungan, setTabungan] = useState<Tabungan | null>(null);
  const [santriOptions, setSantriOptions] = useState<SantriOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tabunganRes, santrisRes] = await Promise.all([
          fetch(`/api/tabungans/${id}`, { cache: 'no-store' }),
          fetch('/api/santris?limit=1000', { cache: 'no-store' }),
        ]);
        if (!tabunganRes.ok) {
          const data = await tabunganRes.json();
          throw new Error(data.error || 'Gagal mengambil data tabungan');
        }
        const tabunganData: Tabungan = await tabunganRes.json();
        setTabungan(tabunganData);
        if (santrisRes.ok) {
          const santrisData = await santrisRes.json();
          setSantriOptions(santrisData.data.map((s: any) => ({
            id: s.id,
            studentNumber: s.studentNumber,
            name: s.name,
          })));
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleUpdate = async (formData: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tabungans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal memperbarui tabungan');
      }
      router.push(`/tabungans/${id}`);
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui tabungan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tabungans/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus tabungan');
      }
      router.push('/tabungans');
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus tabungan');
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

  if (!tabungan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Data tabungan tidak ditemukan.</p>
        <Link href="/tabungans" className="mt-4 inline-block btn btn-primary">Kembali ke daftar</Link>
      </div>
    );
  }

  // Role gating (placeholder)
  const currentRole = 'SUPERADMIN';
  const canEdit = ['SUPERADMIN', 'MANAGER KPAK', 'MANAGER KOPERASI BUKU'].includes(currentRole);
  const canDelete = ['SUPERADMIN', 'MANAGER KPAK'].includes(currentRole);

  if (!canEdit) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Anda tidak memiliki izin untuk mengedit rekening tabungan.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edit Rekening Tabungan</h1>
          <p className="text-sm text-gray-500">
            NIS: {tabungan.santri?.studentNumber} • Nama: {tabungan.santri?.name}
          </p>
        </div>
        <div>
          {canEdit && (
            <Button variant="secondary" onClick={() => router.push(`/tabungans/${id}`)}>
              Batalkan
            </Button>
          )}
        </div>
      </div>

      <TabunganForm
        mode="edit"
        initialData={{
          id: tabungan.id,
          santriId: tabungan.santriId,
          accountNumber: tabungan.accountNumber,
          saldo: tabungan.saldo,
          minSaldo: tabungan.minSaldo,
        }}
        onSubmit={handleUpdate}
        loading={loading}
        error={error}
        santriOptions={santriOptions}
        role={currentRole}
      />

      {/* Role gating for delete */}
      {canDelete && (
        <div className="mt-4 flex justify-end">
          <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
            Hapus
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus rekening tabungan ini? Tindakan ini akan menandai data sebagai tidak aktif (soft delete)."
        actionLabel={deleting ? 'Menghapus...' : 'Ya, Hapus'}
        onAction={handleDelete}
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
// app/santris/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../components/santri/Button';
import { Badge } from '../../../../components/santri/Badge';
import { Modal } from '../../../../components/santri/Modal';
import { SantriForm } from '../../../../components/santri/SantriForm';
import { Santri } from '../../../../types/santri';

// Placeholder role for UI gating; replace with real auth context later.
const currentRole = 'SUPERADMIN'; // demo only

function canEditSantri(role: string): boolean {
  return role === 'SUPERADMIN' || role === 'MANAGER KPAK';
}

export default function SantriEditPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const [santri, setSantri] = useState<Santri | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/santris/${id}`, { cache: 'no-store' });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Gagal mengambil data santri');
        }
        const data: Santri = await res.json();
        setSantri(data);
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleUpdate = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/santris/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal memperbarui santri');
      }
      router.push(`/santris/${id}`);
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui santri');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/santris/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus santri');
      }
      router.push('/santris');
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus santri');
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
        <button
          className="ml-4 underline"
          onClick={() => window.location.reload()}
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!santri) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Data santri tidak ditemukan.</p>
        <Link
          href="/santris"
          className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  const isEditable = canEditSantri(currentRole);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edit Data Santri</h1>
          <p className="text-sm text-gray-500">
            NIS: {santri.studentNumber} • Nama: {santri.name}
          </p>
        </div>
        <div>
          {isEditable && (
            <Button
              variant="secondary"
              onClick={() => router.push(`/santris/${id}`)}
            >
              Batalkan
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <SantriForm
        mode="edit"
        initialData={santri}
        onSubmit={handleUpdate}
        loading={loading}
        error={error}
        role={currentRole}
      />

      {/* Role gating for delete */}
      {isEditable && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="danger"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Hapus
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus data santri ini? Tindakan ini akan menandai data sebagai tidak aktif."
        actionLabel={deleting ? 'Menghapus...' : 'Ya, Hapus'}
        onAction={handleDelete}
        isLoading={deleting}
      />
    </div>
  );
}

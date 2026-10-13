// app/santris/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../components/santri/Button';
import { Badge } from '../../../components/santri/Badge';
import { Modal } from '../../../components/santri/Modal';
import { Santri } from '../../../types/santri';

// Placeholder role for UI gating; replace with real auth context later.
const currentRole = 'SUPERADMIN'; // demo only

function canEditSantri(role: string): boolean {
  return role === 'SUPERADMIN' || role === 'MANAGER KPAK';
}

export default function SantriDetailPage() {
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
          <h1 className="text-2xl font-bold text-gray-800">Detail Santri</h1>
          <p className="text-sm text-gray-500">
            NIS: {santri.studentNumber} • Nama: {santri.name}
          </p>
        </div>
        <div>
          {isEditable && (
            <Button variant="primary" onClick={() => router.push(`/santris/${id}/edit`)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Detail Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">NIS / Nomor Induk</p>
            <p className="text-lg font-semibold text-gray-900">{santri.studentNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Nama</p>
            <p className="text-lg font-semibold text-gray-900">{santri.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Kelas</p>
            <p className="text-lg font-semibold text-gray-900">{santri.className || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <Badge status={santri.isActive ? 'ACTIVE' : 'INACTIVE'} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Unit</p>
            <p className="text-lg font-semibold text-gray-900">{santri.unitId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Wali</p>
            <p className="text-lg font-semibold text-gray-900">{santri.wali || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">No. Kontak</p>
            <p className="text-lg font-semibold text-gray-900">{santri.kontak || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Card UID (NFC)</p>
            <p className="text-lg font-semibold text-gray-900">{santri.cardUid || '-'}</p>
          </div>
        </div>
      </div>

      {/* Related Data (Tabungan & Tagihan placeholders) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Terkait</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tabungan</h4>
            {santri.tabungans && santri.tabungans.length > 0 ? (
              <ul className="space-y-2">
                {santri.tabungans.map((tb) => (
                  <li key={tb.id} className="text-sm text-gray-700">
                    Rekening: {tb.accountNumber} • Saldo: Rp {tb.saldo.toLocaleString()}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Belum ada data tabungan.</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tagihan</h4>
            {santri.tagihan && santri.tagihan.length > 0 ? (
              <ul className="space-y-2">
                {santri.tagihan.map((th) => (
                  <li key={th.id} className="text-sm text-gray-700">
                    {th.tanggal} • {th.totalNilai} • Status: {th.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Belum ada data tagihan.</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => router.push('/santris')}>
          Kembali
        </Button>
        {isEditable && (
          <>
            <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
              Hapus
            </Button>
          </>
        )}
      </div>

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

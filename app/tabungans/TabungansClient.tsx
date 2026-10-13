// app/tabungans/TabungansClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '../../components/santri/Button';
import { Input } from '../../components/santri/Input';
import { Badge } from '../../components/santri/Badge';
import { Modal } from '../../components/santri/Modal';
import { Tabungan } from '../../types/santri';

interface TabungansClientProps {
  unitId?: string;
}

export function TabungansClient({ unitId }: TabungansClientProps) {
  const [tabungans, setTabungans] = useState<Tabungan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTabungans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(unitId && { unitId }),
      });
      const res = await fetch(`/api/tabungans?${params}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengambil data tabungan');
      }
      const data = await res.json();
      setTabungans(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [page, search, unitId]);

  useEffect(() => {
    fetchTabungans();
  }, [fetchTabungans]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tabungans/${deletingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus tabungan');
      }
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      fetchTabungans();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus tabungan');
    } finally {
      setDeleting(false);
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
        <button className="ml-4 underline" onClick={fetchTabungans}>Coba lagi</button>
      </div>
    );
  }

  // Role gating (placeholder - replace with real auth)
  const currentRole = 'SUPERADMIN';
  const canAdd = ['SUPERADMIN', 'MANAGER KPAK', 'MANAGER KOPERASI BUKU'].includes(currentRole);
  const canDelete = ['SUPERADMIN', 'MANAGER KPAK'].includes(currentRole);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Rekening Tabungan</h1>
          <p className="text-sm text-gray-500">Kelola rekening tabungan santri</p>
        </div>
        <div className="flex gap-3">
          {canAdd && (
            <Link href="/tabungans/new" className="btn btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Rekening
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-4">
        <Input
          type="search"
          placeholder="Cari nomor rekening, nama, atau NIS santri..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-md"
        />
        <Button type="submit" variant="primary">Cari</Button>
        {search && (
          <Button type="button" variant="secondary" onClick={() => { setSearch(''); setPage(1); }}>
            Reset
          </Button>
        )}
      </form>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="santri-table">
          <thead>
            <tr>
              <th className="w-12">No</th>
              <th>Nomor Rekening</th>
              <th>NIS Santri</th>
              <th>Nama Santri</th>
              <th>Kelas</th>
              <th>Saldo</th>
              <th>Saldo Min</th>
              <th className="w-48">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tabungans.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <div className="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Tidak ada data tabungan</p>
                    {canAdd && (
                      <Link href="/tabungans/new" className="mt-4 inline-block btn btn-primary">
                        Buat Rekening Pertama
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              tabungans.map((t, idx) => (
                <tr key={t.id}>
                  <td className="text-sm text-gray-500">{(page - 1) * 10 + idx + 1}</td>
                  <td className="font-mono text-sm">{t.accountNumber}</td>
                  <td className="text-sm">{t.santri?.studentNumber || '-'}</td>
                  <td className="font-medium">{t.santri?.name || '-'}</td>
                  <td className="text-sm text-gray-500">{t.santri?.className || '-'}</td>
                  <td className="font-mono text-green-700">Rp {t.saldo.toLocaleString('id-ID')}</td>
                  <td className="text-sm text-gray-500">Rp {t.minSaldo.toLocaleString('id-ID')}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tabungans/${t.id}`}
                        className="btn btn-sm btn-outline"
                      >
                        Detail
                      </Link>
                      {canDelete && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => { setDeletingId(t.id); setDeleteConfirmOpen(true); }}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Sebelumnya
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Button
              key={p}
              variant={p === page ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPage(p)}
              className={p === page ? 'active' : ''}
            >
              {p}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Selanjutnya
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeletingId(null); }}
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
// app/tagihan/TagihanClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '../../components/santri/Button';
import { Input } from '../../components/santri/Input';
import { Select } from '../../components/santri/Select';
import { Badge } from '../../components/santri/Badge';
import { Modal } from '../../components/santri/Modal';
import { Tagihan } from '../../types/santri';

interface TagihanClientProps {
  unitId?: string;
}

export function TagihanClient({ unitId }: TagihanClientProps) {
  const [tagihans, setTagihans] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTagihans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(unitId && { unitId }),
      });
      const res = await fetch(`/api/tagihan?${params}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengambil data tagihan');
      }
      const data = await res.json();
      setTagihans(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, unitId]);

  useEffect(() => {
    fetchTagihans();
  }, [fetchTagihans]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tagihan/${deletingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membatalkan tagihan');
      }
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      fetchTagihans();
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan tagihan');
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
        <button className="ml-4 underline" onClick={fetchTagihans}>Coba lagi</button>
      </div>
    );
  }

  // Role gating (placeholder - replace with real auth)
  const currentRole = 'SUPERADMIN';
  const canGenerate = ['SUPERADMIN', 'MANAGER KPAK'].includes(currentRole);
  const canDelete = ['SUPERADMIN', 'MANAGER KPAK'].includes(currentRole);

  const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    UNPAID: 'error',
    PARTIAL: 'warning',
    PAID: 'success',
    CANCELLED: 'default',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Tagihan</h1>
          <p className="text-sm text-gray-500">Kelola tagihan santri</p>
        </div>
        <div className="flex gap-3">
          {canGenerate && (
            <Link href="/tagihan/new" className="btn btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Generate Tagihan
            </Link>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
        <Input
          type="search"
          placeholder="Cari nama santri, NIS, atau template..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'Semua Status' },
            { value: 'UNPAID', label: 'Belum Bayar' },
            { value: 'PARTIAL', label: 'Cicilan' },
            { value: 'PAID', label: 'Lunas' },
            { value: 'CANCELLED', label: 'Dibatalkan' },
          ]}
          className="w-40"
        />
        <Button type="submit" variant="primary">Filter</Button>
        {(search || statusFilter) && (
          <Button type="button" variant="secondary" onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}>
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
              <th>NIS Santri</th>
              <th>Nama Santri</th>
              <th>Template</th>
              <th>Periode</th>
              <th>Total</th>
              <th>Status</th>
              <th>Tanggal</th>
              <th className="w-48">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tagihans.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12">
                  <div className="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Tidak ada data tagihan</p>
                    {canGenerate && (
                      <Link href="/tagihan/new" className="mt-4 inline-block btn btn-primary">
                        Generate Tagihan Pertama
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              tagihans.map((t, idx) => (
                <tr key={t.id}>
                  <td className="text-sm text-gray-500">{(page - 1) * 10 + idx + 1}</td>
                  <td className="text-sm">{t.santri?.studentNumber || '-'}</td>
                  <td className="font-medium">{t.santri?.name || '-'}</td>
                  <td className="text-sm">{t.template?.name || '-'}</td>
                  <td className="text-sm">
                    {t.tagihanItem && t.tagihanItem.length > 0
                      ? t.tagihanItem[0].periode
                      : '-'}
                  </td>
                  <td className="font-mono text-blue-700">Rp {t.totalNilai.toLocaleString('id-ID')}</td>
                  <td>
                    <Badge variant={statusColors[t.status] || 'default'}>
                      {t.status === 'UNPAID' ? 'Belum Bayar' :
                       t.status === 'PARTIAL' ? 'Cicilan' :
                       t.status === 'PAID' ? 'Lunas' : 'Dibatalkan'}
                    </Badge>
                  </td>
                  <td className="text-sm text-gray-500">
                    {new Date(t.tanggal).toLocaleDateString('id-ID')}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tagihan/${t.id}`}
                        className="btn btn-sm btn-outline"
                      >
                        Detail
                      </Link>
                      {canDelete && t.status !== 'PAID' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => { setDeletingId(t.id); setDeleteConfirmOpen(true); }}
                        >
                          Batalkan
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
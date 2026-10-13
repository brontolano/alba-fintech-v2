// components/santri/SantriListClient.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { Santri } from '../../types/santri';
import { Badge } from './Badge';
import { Button } from './Button';
import { Input } from './Input';

interface SantriListClientProps {
  unitId?: string;
  role?: string;
}

export function SantriListClient({ unitId, role = 'SUPERADMIN' }: SantriListClientProps) {
  const canAddSantri = (role: string): boolean => {
    return role === 'SUPERADMIN' || role === 'MANAGER KPAK';
  };

  function canEditSantri(role: string): boolean {
    return role === 'SUPERADMIN' || role === 'MANAGER KPAK';
  }

  function canDeleteSantri(role: string): boolean {
    return role === 'SUPERADMIN' || role === 'MANAGER KPAK';
  }
  const [santris, setSantris] = useState<Santri[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ALL');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Default unitId fallback to kpa-unit if not provided
  const fetchUnitId = unitId || 'kpa-unit';

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    const fetchSantris = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter !== 'ALL') params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');
        if (fetchUnitId) params.append('unitId', fetchUnitId);

        const res = await fetch(`/api/santris?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Gagal mengambil data santri');
        }
        const data: Santri[] = await res.json();
        if (!ignore) setSantris(data);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Terjadi kesalahan');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchSantris();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [searchTerm, statusFilter, fetchUnitId]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    // searchTerm is already reactive; fetch happens via effect
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/santris/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus santri');
      }
      setSantris((prev) => prev.filter((s) => s.id !== deleteId));
      setDeleteId(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus santri');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmCancelDelete = () => {
    setDeleteId(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Santri</h1>
          <p className="text-sm text-gray-500">
            Kelola data santri di unit {fetchUnitId === 'kpa-unit' ? 'KPAK' : fetchUnitId}
          </p>
        </div>
        {canAddSantri(role) && (
          <Button
            onClick={() => (window.location.href = '/santris/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Tambah Santri
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Cari NIS / Nama
            </label>
            <Input
              id="search"
              type="text"
              placeholder="Contoh: 20250001 atau Budi"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Tidak Aktif</option>
            </select>
          </div>
        </form>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button
            className="ml-4 underline"
            onClick={() => window.location.reload()}
          >
            Coba lagi
          </button>
        </div>
      ) : santris.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Tidak ada data santri ditemukan.</p>
          <Button
            onClick={() => (window.location.href = '/santris/new')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Tambah Santri
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {santris.map((santri) => (
                <tr key={santri.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-nowrap">{santri.studentNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{santri.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{santri.className || '-'}</td>
                  <td className="px-6 py-4">
                    <Badge status={santri.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{santri.unitId}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => (window.location.href = `/santris/${santri.id}`)}
                      >
                        Lihat
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => (window.location.href = `/santris/${santri.id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick(santri.id)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-800">Konfirmasi Hapus</h3>
            <p className="text-sm text-gray-600 mt-2">
              Apakah Anda yakin ingin menghapus data santri ini? Tindakan ini akan menandai data sebagai tidak aktif.
            </p>
            <div className="flex justify-end space-x-3 mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={confirmCancelDelete}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

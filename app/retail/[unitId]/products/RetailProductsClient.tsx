// app/retail/[unitId]/products/RetailProductsClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../components/santri/Button';
import { Badge } from '../../../../components/santri/Badge';
import { Modal } from '../../../../components/santri/Modal';
import { Input } from '../../../../components/santri/Input';
import { Select } from '../../../../components/santri/Select';
import { RetailProduct, RetailUnit } from '../../../../types/santri';

export function RetailProductsClient() {
  const params = useParams();
  const router = useRouter();
  const { unitId } = params;
  
  const [retailUnit, setRetailUnit] = useState<RetailUnit | null>(null);
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Modal states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<RetailProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRetailUnit = useCallback(async () => {
    try {
      const res = await fetch(`/api/retail-units?unitId=${unitId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat unit retail');
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        setRetailUnit(data.data[0]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [unitId]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        retailUnitId: Array.isArray(unitId) ? unitId[0] : unitId,
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(isActiveFilter !== 'all' && { isActive: isActiveFilter === 'active' ? 'true' : 'false' }),
      });
      const res = await fetch(`/api/retail-products?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat produk');
      const data = await res.json();
      setProducts(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [unitId, page, search, isActiveFilter]);

  useEffect(() => {
    fetchRetailUnit();
    fetchProducts();
  }, [fetchRetailUnit, fetchProducts]);

  const handleDelete = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/retail-products/${productToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus produk');
      }
      setDeleteConfirmOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus produk');
    } finally {
      setDeleting(false);
      setProductToDelete(null);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
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

  if (!retailUnit) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unit retail tidak ditemukan.</p>
        <Link href="/retail" className="mt-4 inline-block btn btn-primary">Kembali</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href={`/retail/${unitId}`} className="text-sm text-blue-600 hover:underline mb-1 inline-block">
            ← Kembali ke POS
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Kelola Produk - {retailUnit.name}</h1>
          <p className="text-sm text-gray-500">Tipe: {retailUnit.type === 'KOPERASI' ? 'Koperasi' : 'Kantin'}</p>
        </div>
        <Link href={`/retail/${unitId}/products/new`} className="btn btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Produk
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4">
        <Input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Cari produk (nama/kode)..."
          className="flex-1 min-w-[250px]"
        />
        <Select
          value={isActiveFilter}
          onChange={(e) => { setIsActiveFilter(e.target.value as any); setPage(1); }}
          options={[
            { value: 'all', label: 'Semua Status' },
            { value: 'active', label: 'Aktif' },
            { value: 'inactive', label: 'Nonaktif' },
          ]}
          className="w-40"
        />
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {products.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Belum ada produk</h3>
            <p className="mt-1 text-gray-500">Mulai dengan menambah produk pertama.</p>
            <Link href={`/retail/${unitId}/products/new`} className="mt-6 inline-block btn btn-primary">
              Tambah Produk
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="santri-table w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12">No</th>
                    <th>Kode</th>
                    <th>Nama Produk</th>
                    <th>Harga</th>
                    <th>Stok</th>
                    <th>Min Stok</th>
                    <th>Status</th>
                    <th className="w-48">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product, idx) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * 20 + idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-sm">{product.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{product.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-green-700">{formatRupiah(product.price)}</td>
                      <td className="px-4 py-3">
                        <span className={product.stock <= product.minStock && product.stock > 0 ? 'text-orange-600 font-medium' : product.stock === 0 ? 'text-red-600 font-medium' : ''}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{product.minStock}</td>
                      <td className="px-4 py-3">
                        <Badge variant={product.isActive ? 'success' : 'default'}>
                          {product.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/retail/${unitId}/products/${product.id}/edit`} className="btn btn-secondary text-xs px-2 py-1">
                            Edit
                          </Link>
                          <Button
                            variant="danger"
                            size="sm"
                            className="px-2 py-1 text-xs"
                            onClick={() => { setProductToDelete(product); setDeleteConfirmOpen(true); }}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Menampilkan {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} dari {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    Sebelumnya
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <Button
                      key={p}
                      variant={p === page ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setPage(p)}
                      disabled={loading}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteConfirmOpen}
          onClose={() => { setDeleteConfirmOpen(false); setProductToDelete(null); }}
          title="Konfirmasi Hapus Produk"
          description={productToDelete ? `Apakah Anda yakin ingin menghapus produk "${productToDelete.name}" (${productToDelete.code})?` : ''}
          actionLabel={deleting ? 'Menghapus...' : 'Ya, Hapus'}
          onAction={handleDelete}
          isLoading={deleting}
          variant="danger"
        />
      </div>
    </div>
  );
}
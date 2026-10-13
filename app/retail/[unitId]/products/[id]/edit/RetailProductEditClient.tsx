// app/retail/[unitId]/products/[id]/edit/RetailProductEditClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../../../components/santri/Button';
import { Input } from '../../../../../../components/santri/Input';
import { Select } from '../../../../../../components/santri/Select';
import { RetailProduct, RetailUnit } from '../../../../../../types/santri';

interface FormData {
  name: string;
  code: string;
  description: string;
  price: number;
  minStock: number;
  isActive: boolean;
}

export function RetailProductEditClient() {
  const params = useParams();
  const router = useRouter();
  const { unitId, id } = params;
  
  const [retailUnit, setRetailUnit] = useState<RetailUnit | null>(null);
  const [product, setProduct] = useState<RetailProduct | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    description: '',
    price: 0,
    minStock: 5,
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/retail-products/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat produk');
      const data = await res.json();
      if (data) {
        setProduct(data);
        setFormData({
          name: data.name,
          code: data.code,
          description: data.description || '',
          price: data.price,
          minStock: data.minStock,
          isActive: data.isActive,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRetailUnit();
    fetchProduct();
  }, [fetchRetailUnit, fetchProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/retail-products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengupdate produk');
      }
      router.push(`/retail/${unitId}/products`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseFloat(value) || 0 : value,
    }));
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

  if (!retailUnit || !product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Produk tidak ditemukan.</p>
        <Link href="/retail" className="mt-4 inline-block btn btn-primary">Kembali</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href={`/retail/${unitId}/products`} className="text-sm text-blue-600 hover:underline mb-1 inline-block">
            ← Kembali ke Daftar Produk
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Edit Produk</h1>
          <p className="text-sm text-gray-500">Unit: {retailUnit.name} ({retailUnit.type === 'KOPERASI' ? 'Koperasi' : 'Kantin'})</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="form-group">
            <label htmlFor="name">Nama Produk <span className="text-red-500">*</span></label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Contoh: Buku Tulis 38 Lembar"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="code">Kode Produk <span className="text-red-500">*</span></label>
            <Input
              id="code"
              name="code"
              type="text"
              value={formData.code}
              onChange={handleChange}
              placeholder="Contoh: BT-38"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Kode unik untuk identifikasi produk</p>
          </div>

          <div className="form-group">
            <label htmlFor="description">Deskripsi</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Deskripsi singkat produk (opsional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="price">Harga <span className="text-red-500">*</span></label>
              <Input
                id="price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="100"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="minStock">Stok Minimum <span className="text-red-500">*</span></label>
              <Input
                id="minStock"
                name="minStock"
                type="number"
                value={formData.minStock}
                onChange={handleChange}
                placeholder="5"
                min="0"
                step="1"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Notifikasi stok rendah saat stok ≤ nilai ini</p>
            </div>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm">Produk Aktif (ditampilkan di POS)</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href={`/retail/${unitId}/products`} className="btn btn-secondary">
            Batal
          </Link>
          <Button type="submit" variant="primary" isLoading={submitting}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}
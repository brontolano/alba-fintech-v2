// app/retail/new/RetailUnitNewClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../components/santri/Button';
import { Input } from '../../../components/santri/Input';
import { Select } from '../../../components/santri/Select';
import { Unit } from '../../../types/santri';

interface FormData {
  name: string;
  code: string;
  type: 'KOPERASI' | 'KANTIN';
  description: string;
  unitId: string;
  isActive: boolean;
}

export function RetailUnitNewClient() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    type: 'KOPERASI',
    description: '',
    unitId: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch('/api/units', { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat unit');
      const data = await res.json();
      setUnits(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/retail-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membuat unit retail');
      }
      router.push('/retail');
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
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/retail" className="text-sm text-blue-600 hover:underline mb-1 inline-block">
            ← Kembali ke Dashboard Retail
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Tambah Unit Retail Baru</h1>
          <p className="text-sm text-gray-500">Koperasi atau Kantin</p>
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
            <label htmlFor="name">Nama Unit <span className="text-red-500">*</span></label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Contoh: Koperasi Santri Al-Ikhlas"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="code">Kode Unit <span className="text-red-500">*</span></label>
            <Input
              id="code"
              name="code"
              type="text"
              value={formData.code}
              onChange={handleChange}
              placeholder="Contoh: KOP-001"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Kode unik untuk identifikasi unit (huruf besar, angka, strip)</p>
          </div>

          <div className="form-group">
            <label htmlFor="type">Tipe Unit <span className="text-red-500">*</span></label>
            <select
              id="type"
              name="type"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="KOPERASI">Koperasi</option>
              <option value="KANTIN">Kantin</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="unitId">Unit Induk (Lembaga) <span className="text-red-500">*</span></label>
            <select
              id="unitId"
              name="unitId"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={formData.unitId}
              onChange={handleChange}
              required
            >
              <option value="">-- Pilih Unit Induk --</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Deskripsi</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Deskripsi singkat unit retail (opsional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
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
              <span className="text-sm">Aktif (ditampilkan di dashboard & POS)</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/retail" className="btn btn-secondary">
            Batal
          </Link>
          <Button type="submit" variant="primary" isLoading={submitting}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Simpan Unit Retail
          </Button>
        </div>
      </form>
    </div>
  );
}
// components/santri/SantriForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Button';
import { Badge } from './Badge';
import { Unit, Santri } from '../../types/santri';

export interface SantriFormData {
  studentNumber: string;
  name: string;
  className: string;
  cardUid: string;
  unitId: string;
  isActive: boolean;
  wali?: string;
  kontak?: string;
}

interface SantriFormProps {
  mode: 'create' | 'edit';
  initialData?: Santri;
  onSubmit: (data: SantriFormData) => Promise<void>;
  loading?: boolean;
  error?: string;
  role?: string;
  classNameOptions?: string[];
}

export function SantriForm({ mode, initialData, onSubmit, loading = false, error, role, classNameOptions = ['I','II','III','IV','V','VI','VII','VIII','IX','X'] }: SantriFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<SantriFormData>({
    studentNumber: initialData?.studentNumber || '',
    name: initialData?.name || '',
    className: initialData?.className || '',
    cardUid: initialData?.cardUid || '',
    unitId: initialData?.unitId || 'kpa-unit',
    isActive: initialData?.isActive ?? true,
    wali: initialData?.wali || '',
    kontak: initialData?.kontak || '',
  });

  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/units')
      .then((res) => res.json())
      .then((data: Unit[]) => setUnits(data))
      .catch(() => {})
      .finally(() => setUnitsLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFields((prev) => ({ ...prev, [name]: checked ?? value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      await onSubmit(fields);
      router.push('/santris');
    } catch (err: any) {
      setSubmitError(err.message || 'Gagal menyimpan data santri');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {mode === 'create' ? 'Tambah Santri Baru' : 'Edit Data Santri'}
      </h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{error}</div>}
      {submitError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{submitError}</div>}

      <form className="space-y-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="NIS (Student Number)"
              name="studentNumber"
              value={fields.studentNumber}
              onChange={handleChange}
              placeholder="Contoh: 20250001"
              required
            />
          </div>
          <div>
            <Input
              label="Nama Lengkap"
              name="name"
              value={fields.name}
              onChange={handleChange}
              placeholder="Nama lengkap santri"
              required
            />
          </div>
          <div>
            <Select
              label="Kelas"
              name="className"
              value={fields.className}
              onChange={handleChange}
              options={classNameOptions.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <Input
              label="Card UID (NFC)"
              name="cardUid"
              value={fields.cardUid}
              onChange={handleChange}
              placeholder="Masukkan UID NFC jika ada"
            />
          </div>
          <div>
            <Select
              label="Unit"
              name="unitId"
              value={fields.unitId}
              onChange={handleChange}
              options={[
                { value: 'kpa-unit', label: 'KPAK' },
              ]}
            />
          </div>
          <div>
            <Input
              label="Nama Wali"
              name="wali"
              value={fields.wali}
              onChange={handleChange}
              placeholder="Nama wali santri"
            />
          </div>
          <div>
            <Input
              label="No. Kontak"
              name="kontak"
              value={fields.kontak}
              onChange={handleChange}
              placeholder="Nomor telepon wali"
            />
          </div>
          <div className="col-span-2 flex items-center">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                name="isActive"
                checked={fields.isActive}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Status Aktif
            </label>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => router.push('/santris')}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
          >
            {mode === 'create' ? 'Simpan' : 'Perbarui'}
          </Button>
        </div>
      </form>
    </div>
  );
}

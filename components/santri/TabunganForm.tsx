// components/santri/TabunganForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';

interface TabunganFormProps {
  mode: 'create' | 'edit';
  initialData?: {
    id?: string;
    santriId: string;
    accountNumber: string;
    saldo?: number;
    minSaldo?: number;
  };
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  santriOptions?: Array<{ id: string; studentNumber: string; name: string }>;
  role?: string;
}

export function TabunganForm({ mode, initialData, onSubmit, loading, error, santriOptions = [], role = 'SUPERADMIN' }: TabunganFormProps) {
  const [formData, setFormData] = useState({
    santriId: initialData?.santriId || '',
    studentNumber: initialData?.santriId ? '' : '', // for NIS input
    accountNumber: initialData?.accountNumber || '',
    saldo: initialData?.saldo || 0,
    minSaldo: initialData?.minSaldo || 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [santriLookup, setSantriLookup] = useState<{ id: string; studentNumber: string; name: string } | null>(null);

  const canEditSantri = (role: string) => role === 'SUPERADMIN' || role === 'MANAGER KPAK' || role === 'MANAGER KOPERASI BUKU';

  // Auto-generate account number from NIS when santri is selected
  useEffect(() => {
    if (formData.santriId && mode === 'create') {
      const selected = santriOptions.find(s => s.id === formData.santriId);
      if (selected && !formData.accountNumber) {
        setFormData(prev => ({ ...prev, accountNumber: `TBG-${selected.studentNumber}` }));
      }
    }
  }, [formData.santriId, formData.accountNumber, santriOptions, mode]);

  // Auto-generate account number from NIS input
  useEffect(() => {
    if (formData.studentNumber && mode === 'create' && !formData.santriId) {
      setFormData(prev => ({ ...prev, accountNumber: `TBG-${prev.studentNumber}` }));
    }
  }, [formData.studentNumber, formData.santriId, mode]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.santriId && !formData.studentNumber) newErrors.santriId = 'Santri wajib dipilih atau NIS diisi';
    if (!formData.accountNumber) newErrors.accountNumber = 'Nomor rekening wajib diisi';
    if (formData.saldo < 0) newErrors.saldo = 'Saldo tidak boleh negatif';
    if (formData.minSaldo < 0) newErrors.minSaldo = 'Saldo minimum tidak boleh negatif';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSelectChange = (field: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    handleChange(field, e.target.value);
  };

  const handleInputChange = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    handleChange(field, value);
  };

  const handleSantriSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const santriId = e.target.value;
    handleSelectChange('santriId', e);
    if (santriId) {
      const selected = santriOptions.find(s => s.id === santriId);
      if (selected) {
        setSantriLookup(selected);
        setFormData(prev => ({ ...prev, studentNumber: selected.studentNumber, accountNumber: `TBG-${selected.studentNumber}` }));
      }
    } else {
      setSantriLookup(null);
    }
  };

  const handleStudentNumberBlur = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const studentNumber = e.target.value.trim();
    handleInputChange('studentNumber', e);
    if (studentNumber) {
      try {
        const res = await fetch(`/api/santris?search=${encodeURIComponent(studentNumber)}&limit=1`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const found = data.data[0];
            setSantriLookup({ id: found.id, studentNumber: found.studentNumber, name: found.name });
            setFormData(prev => ({ ...prev, santriId: found.id, accountNumber: `TBG-${found.studentNumber}` }));
          } else {
            setSantriLookup(null);
            setFormData(prev => ({ ...prev, santriId: '' }));
          }
        }
      } catch (err) {
        console.error('Santri lookup failed:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // Submit with santriId or studentNumber
    const submitData = { ...formData };
    await onSubmit(submitData);
  };

  const isEditable = mode === 'create' || canEditSantri(role);

  return (
    <form onSubmit={handleSubmit} className="santri-form space-y-6">
      {error && (
        <div className="error-alert" role="alert">
          {error}
        </div>
      )}

      {/* Santri Selection - Dropdown or NIS Input */}
      <div className="form-group">
        <label htmlFor="santriId">Santri <span className="text-error">*</span></label>
        <div className="space-y-2">
          <Select
            id="santriId"
            name="santriId"
            value={formData.santriId}
            onChange={handleSantriSelect}
            options={[
              { value: '', label: 'Pilih santri dari daftar...' },
              ...santriOptions.map(s => ({ value: s.id, label: `${s.studentNumber} - ${s.name}` })),
            ]}
            disabled={!isEditable || mode === 'edit'}
            error={errors.santriId}
          />
          <p className="text-xs text-gray-500">Atau cari via NIS:</p>
          <Input
            id="studentNumber"
            name="studentNumber"
            type="text"
            value={formData.studentNumber}
            onChange={(e) => handleInputChange('studentNumber', e)}
            onBlur={handleStudentNumberBlur}
            placeholder="Masukkan NIS (contoh: 20251001) - akan auto-cari santri"
            disabled={!isEditable || mode === 'edit' || !!formData.santriId}
            error={!formData.santriId && !formData.studentNumber ? errors.santriId : undefined}
          />
          {santriLookup && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-sm">
              Ditemukan: <strong>{santriLookup.studentNumber}</strong> - {santriLookup.name}
            </div>
          )}
        </div>
      </div>

      {/* Account Number - Auto-generated from NIS */}
      <div className="form-group">
        <label htmlFor="accountNumber">Nomor Rekening <span className="text-error">*</span></label>
        <Input
          id="accountNumber"
          name="accountNumber"
          type="text"
          value={formData.accountNumber}
          onChange={(e) => handleInputChange('accountNumber', e)}
          placeholder={formData.studentNumber || formData.santriId ? `Auto: TBG-${formData.studentNumber || ''}` : 'Contoh: TBG-20251001'}
          disabled={!isEditable || mode === 'edit'}
          error={errors.accountNumber}
        />
        <p className="mt-1 text-xs text-gray-500">Format: TBG-&#123;NIS&#125; (otomatis dari NIS santri)</p>
      </div>

      {mode === 'create' && (
        <div className="form-group">
          <label htmlFor="saldo">Saldo Awal</label>
          <Input
            id="saldo"
            name="saldo"
            type="number"
            value={formData.saldo}
            onChange={(e) => handleInputChange('saldo', e)}
            placeholder="0"
            min="0"
            step="1000"
            disabled={!isEditable}
            error={errors.saldo}
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor="minSaldo">Saldo Minimum</label>
        <Input
          id="minSaldo"
          name="minSaldo"
          type="number"
          value={formData.minSaldo}
          onChange={(e) => handleInputChange('minSaldo', e)}
          placeholder="0"
          min="0"
          step="1000"
          disabled={!isEditable}
          error={errors.minSaldo}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={() => window.history.back()} isLoading={loading}>
          Batal
        </Button>
        <Button type="submit" variant="primary" isLoading={loading}>
          {mode === 'create' ? 'Buat Rekening' : 'Simpan Perubahan'}
        </Button>
      </div>
    </form>
  );
}
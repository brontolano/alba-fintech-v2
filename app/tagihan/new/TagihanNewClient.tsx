// app/tagihan/new/TagihanNewClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/santri/Button';
import { Input } from '../../../components/santri/Input';
import { Select } from '../../../components/santri/Select';
import { Badge } from '../../../components/santri/Badge';

interface TemplateOption {
  id: string;
  name: string;
  type?: string | null;
  totalPerItem?: number;
}

interface SantriOption {
  id: string;
  studentNumber: string;
  name: string;
  className?: string | null;
}

export function TagihanNewClient() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [santris, setSantris] = useState<SantriOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingSantris, setLoadingSantris] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    templateId: '',
    santriIds: [] as string[],
    tanggal: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/tagihan-templates?limit=1000', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            type: t.type,
            totalPerItem: t.items?.reduce((sum: number, it: any) => sum + it.nominal, 0) || 0,
          })));
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    const fetchSantris = async () => {
      try {
        const res = await fetch('/api/santris?limit=1000', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setSantris(data.data.map((s: any) => ({
            id: s.id,
            studentNumber: s.studentNumber,
            name: s.name,
            className: s.className,
          })));
        }
      } catch (err) {
        console.error('Failed to fetch santris:', err);
      } finally {
        setLoadingSantris(false);
      }
    };
    fetchSantris();
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, templateId: e.target.value }));
  };

  const handleSantriToggle = (santriId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      santriIds: checked
        ? [...prev.santriIds, santriId]
        : prev.santriIds.filter(id => id !== santriId),
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, tanggal: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.templateId) {
      setError('Template wajib dipilih');
      return;
    }
    if (formData.santriIds.length === 0) {
      setError('Minimal satu santri harus dipilih');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/tagihan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal generate tagihan');
      }
      router.push('/tagihan');
    } catch (err: any) {
      setError(err.message || 'Gagal generate tagihan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTemplates || loadingSantris) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  // Role gating (placeholder)
  const currentRole = 'SUPERADMIN';
  const canGenerate = ['SUPERADMIN', 'MANAGER KPAK'].includes(currentRole);

  if (!canGenerate) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Anda tidak memiliki izin untuk generate tagihan.</p>
      </div>
    );
  }

  const selectedTemplate = templates.find(t => t.id === formData.templateId);
  const totalPerSantri = selectedTemplate?.totalPerItem || 0;
  const totalAmount = totalPerSantri * formData.santriIds.length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Generate Tagihan Baru</h1>
        <p className="text-sm text-gray-500">Pilih template dan santri untuk membuat tagihan</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
          {error}
        </div>
      )}

      {/* Template Selection */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">1. Pilih Template Tagihan</h2>
        <Select
          value={formData.templateId}
          onChange={handleTemplateChange}
          options={[
            { value: '', label: 'Pilih template tagihan' },
            ...templates.map(t => ({
              value: t.id,
              label: `${t.name} ${t.type ? `(${t.type})` : ''} - Rp ${(t.totalPerItem || 0).toLocaleString('id-ID')}/santri`,
            })),
          ]}
          error={!formData.templateId && submitting ? 'Template wajib dipilih' : undefined}
        />
      </div>

      {/* Date */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">2. Tanggal Tagihan</h2>
        <Input
          type="date"
          value={formData.tanggal}
          onChange={handleDateChange}
          max={new Date().toISOString().split('T')[0]}
        />
      </div>

      {/* Santri Selection */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">3. Pilih Santri (bisa multiple)</h2>
        <p className="text-sm text-gray-500 mb-4">Total santri dipilih: <strong>{formData.santriIds.length}</strong></p>
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
          {santris.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Tidak ada data santri</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {santris.map(s => (
                <li key={s.id} className="px-4 py-3 hover:bg-gray-50 flex items-center">
                  <input
                    type="checkbox"
                    id={`santri-${s.id}`}
                    checked={formData.santriIds.includes(s.id)}
                    onChange={(e) => handleSantriToggle(s.id, e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                  />
                  <label htmlFor={`santri-${s.id}`} className="flex-1 cursor-pointer">
                    <p className="font-medium">{s.studentNumber} - {s.name}</p>
                    <p className="text-sm text-gray-500">{s.className || 'Tanpa kelas'}</p>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">Ringkasan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-blue-700">Total per Santri</p>
            <p className="font-bold text-blue-900">Rp {totalPerSantri.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-blue-700">Jumlah Santri</p>
            <p className="font-bold text-blue-900">{formData.santriIds.length} orang</p>
          </div>
          <div>
            <p className="text-blue-700">Total Tagihan</p>
            <p className="font-bold text-blue-900">Rp {totalAmount.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={() => router.push('/tagihan')} isLoading={submitting}>
          Batal
        </Button>
        <Button type="submit" variant="primary" isLoading={submitting} form="generate-form">
          Generate Tagihan
        </Button>
      </div>

      <form id="generate-form" onSubmit={handleSubmit} hidden />
    </div>
  );
}
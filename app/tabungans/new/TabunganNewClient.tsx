// app/tabungans/new/TabunganNewClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/santri/Button';
import { Input } from '../../../components/santri/Input';
import { Select } from '../../../components/santri/Select';
import { TabunganForm } from '../../../components/santri/TabunganForm';

interface SantriOption {
  id: string;
  studentNumber: string;
  name: string;
}

export function TabunganNewClient() {
  const router = useRouter();
  const [santriOptions, setSantriOptions] = useState<SantriOption[]>([]);
  const [loadingSantris, setLoadingSantris] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSantris = async () => {
      try {
        const res = await fetch('/api/santris?limit=1000', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setSantriOptions(data.data.map((s: any) => ({
            id: s.id,
            studentNumber: s.studentNumber,
            name: s.name,
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

  const handleSubmit = async (formData: any) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/tabungans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membuat rekening tabungan');
      }
      router.push('/tabungans');
    } catch (err: any) {
      setError(err.message || 'Gagal membuat rekening tabungan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSantris) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  // Role gating (placeholder)
  const currentRole = 'SUPERADMIN';
  const canCreate = ['SUPERADMIN', 'MANAGER KPAK', 'MANAGER KOPERASI BUKU'].includes(currentRole);

  if (!canCreate) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Anda tidak memiliki izin untuk membuat rekening tabungan.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Buat Rekening Tabungan Baru</h1>
        <p className="text-sm text-gray-500">Isi form di bawah untuk membuat rekening tabungan santri</p>
      </div>

      <TabunganForm
        mode="create"
        onSubmit={handleSubmit}
        loading={submitting}
        error={error}
        santriOptions={santriOptions}
        role={currentRole}
      />
    </div>
  );
}
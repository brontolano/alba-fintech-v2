// app/santris/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/santri/Button';
import { Input } from '../../../components/santri/Input';
import { Select } from '../../../components/santri/Select';
import { Badge } from '../../../components/santri/Badge';
import { SantriForm } from '../../../components/santri/SantriForm';

// Demo role; in production this should come from auth context or session.
const currentRole = 'SUPERADMIN'; // placeholder

function canAddSantri(role: string): boolean {
  return role === 'SUPERADMIN' || role === 'MANAGER KPAK';
}

export default function NewSantriPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/santris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal menambahSantri');
      }
      // Redirect after success
      router.push('/santris');
    } catch (err: any) {
      setError(err.message || 'Gagal menambahSantri');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Tambah Data Santri</h1>
          <div>
            <Button
              variant="secondary"
              onClick={() => router.push('/santris')}
            >
              &larr; Kembali
            </Button>
          </div>
        </div>

        {/* Role gating */}
        {currentRole === 'SUPERADMIN' || currentRole === 'MANAGER KPAK' ? (
          <SantriForm
            mode="create"
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
            <p className="text-sm">Anda tidak memiliki izin untuk menambah data santri.</p>
          </div>
        )}
      </div>
    </main>
  );
}

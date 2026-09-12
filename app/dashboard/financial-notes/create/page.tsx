'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

interface Unit {
  id: string;
  name: string;
  code: string;
}

export default function CreateFinancialNotePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;
  const userUnitId = session?.user?.unitId as string | undefined;

  const [units, setUnits] = useState<Unit[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    type: 'INCOME' as 'INCOME' | 'EXPENSE' | 'TRANSFER',
    date: new Date().toISOString().split('T')[0],
    unitId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units', {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setUnits(data.data ?? []);
      // Auto-select unit for MANAGER/STAFF (single-unit users)
      if (role && (role === 'MANAGER' || role === 'STAFF') && userUnitId) {
        setForm((prevForm) => ({ ...prevForm, unitId: userUnitId }));
      }
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.title || !form.unitId) {
      toast.error('Harap isi semua field yang wajib');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/financial-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          amount: parseFloat(form.amount),
          type: form.type,
          date: form.date,
          unitId: form.unitId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat catatan');
      }

      const result = await res.json();
      toast.success('Catatan keuangan berhasil dibuat');
      router.push('/dashboard/financial-notes');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat catatan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Buat Catatan Keuangan
            </h1>
            <p className="text-slate-600 mt-1">
              Catat pemasukan atau pengeluaran langsung pimpinan
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Financial Note Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Jenis Catatan
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="INCOME"
                  checked={form.type === 'INCOME'}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as 'INCOME' | 'EXPENSE' | 'TRANSFER' })
                  }
                  className="text-emerald-600"
                />
                <span className="text-green-600 font-medium">
                  Pemasukan
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="EXPENSE"
                  checked={form.type === 'EXPENSE'}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as 'INCOME' | 'EXPENSE' | 'TRANSFER' })
                  }
                  className="text-emerald-600"
                />
                <span className="text-red-600 font-medium">
                  Pengeluaran
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="TRANSFER"
                  checked={form.type === 'TRANSFER'}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as 'INCOME' | 'EXPENSE' | 'TRANSFER' })
                  }
                  className="text-emerald-600"
                />
                <span className="text-blue-600 font-medium">
                  Transfer
                </span>
              </label>
            </div>
          </div>

          {/* Title & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Judul Catatan *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                placeholder="Judul transaksi keuangan"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Jumlah (IDR) *
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                placeholder="0"
                required
                min="0"
                step="any"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tanggal *
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm resize-none"
              rows={3}
              placeholder="Deskripsi detail catatan keuangan"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Unit *
            </label>
            <select
              value={form.unitId}
              onChange={(e) => setForm({ ...form, unitId: e.target.value })}
              disabled={role === 'MANAGER' || role === 'STAFF'}
              className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm ${
                role === 'MANAGER' || role === 'STAFF'
                  ? 'bg-slate-100 text-slate-600 cursor-default'
                  : ''
              }`}
              required
            >
              <option value="">Pilih Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !form.amount || !form.title || !form.unitId}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Simpan Catatan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
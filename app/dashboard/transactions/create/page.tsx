'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface Unit {
  id: string;
  name: string;
  code: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface CreateForm {
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  description: string;
  reference: string;
  unitId: string;
  categoryId: string;
  date: string;
  photoUrl: string;
  photoFile: File | null;
}

export default function CreateTransactionPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CreateForm>({
    type: 'INCOME',
    amount: '',
    description: '',
    reference: '',
    unitId: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    photoUrl: '',
    photoFile: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units', {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/financial-categories', {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setCategories(data.data ?? []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    fetchUnits();
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description || !form.unitId) {
      toast.error('Harap isi semua field yang wajib');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', form.type);
      formData.append('amount', parseFloat(form.amount).toString());
      formData.append('description', form.description);
      formData.append('reference', form.reference);
      formData.append('unitId', form.unitId);
      formData.append('categoryId', form.categoryId);
      formData.append('date', form.date);
      if (form.photoFile) {
        formData.append('photo', form.photoFile);
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat transaksi');
      }

      const result = await res.json();
      toast.success('Transaksi berhasil dibuat');
      router.push('/dashboard/transactions');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, photoFile: file });
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setForm({ ...form, photoFile: null, photoUrl: '' });
    setPreview(null);
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
              Buat Transaksi Baru
            </h1>
            <p className="text-slate-600 mt-1">
              Formulir transaksi keuangan baru
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Jenis Transaksi
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="INCOME"
                  checked={form.type === 'INCOME'}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as 'INCOME' | 'EXPENSE' })
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
                    setForm({ ...form, type: e.target.value as 'INCOME' | 'EXPENSE' })
                  }
                  className="text-emerald-600"
                />
                <span className="text-red-600 font-medium">
                  Pengeluaran
                </span>
              </label>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Jumlah (IDR)
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tanggal
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Deskripsi
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              placeholder="Deskripsi transaksi"
              required
            />
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Referensi (opsional)
            </label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) =>
                setForm({ ...form, reference: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              placeholder="No. referensi / bukti transfer"
            />
          </div>

          {/* Unit & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unit
              </label>
              <select
                value={form.unitId}
                onChange={(e) =>
                  setForm({ ...form, unitId: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                required
              >
                <option value="">Pilih Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kategori
              </label>
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              >
                <option value="">Pilih Kategori</option>
                {categories
                  .filter((cat) => cat.type === form.type)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.code})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Foto Nota / Bukti
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                <Upload size={18} className="text-slate-500" />
                <span className="text-sm text-slate-600">
                  {form.photoFile ? form.photoFile.name : 'Pilih file'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              {preview && (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                  <img
                    src={preview}
                    alt="Preview"
                    className="object-cover w-full h-full"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-1 right-1 bg-slate-800/50 rounded-full p-1 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Bisa ambil foto langsung atau pilih dari galeri. Format: JPG, PNG
            </p>
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
              disabled={submitting || !form.amount || !form.description || !form.unitId}
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
                  <span>Simpan Transaksi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


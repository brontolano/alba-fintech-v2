'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Upload, X, Save, ArrowLeft } from 'lucide-react';

interface Unit {
  id: string;
  name: string;
}

export default function CreateInventoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    sku: string;
    category: string;
    unitPrice: string;
    purchasePrice: string;
    minStock: string;
    isActive: boolean;
    unitId: string;
    imageUrl: string;
  }>({
    name: '',
    sku: '',
    category: '',
    unitPrice: '',
    purchasePrice: '',
    minStock: '',
    isActive: true,
    unitId: '',
    imageUrl: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.push('/login');
      return;
    }

    // Set default unit for MANAGER/STAFF
    if ((session.user.role === 'MANAGER' || session.user.role === 'STAFF') && session.user.unitId) {
      setForm((prev) => ({ ...prev, unitId: session.user.unitId as string }));
    }

    if (session.user.role === 'SUPERADMIN') {
      fetch('/api/units')
        .then((res) => res.json())
        .then((json) => setUnits(json.data || []))
        .catch(() => {});
    }
  }, [session, status, router]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setForm((prev) => ({ ...prev, imageUrl: json.url }));
      toast.success('Gambar berhasil diunggah');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, imageUrl: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.unitPrice) {
      toast.error('Nama, SKU, dan harga jual wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          category: form.category || undefined,
          unitPrice: parseFloat(form.unitPrice),
          purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
          minStock: form.minStock ? parseInt(form.minStock) : 0,
          isActive: form.isActive,
          unitId: form.unitId || undefined,
          imageUrl: form.imageUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menambahkan barang');
      toast.success('Barang berhasil ditambahkan');
      router.push('/dashboard/inventory');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mr-4 p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Tambah Barang Baru</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Gambar */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Gambar Barang
            </label>
            {form.imageUrl ? (
              <div className="relative w-32 h-32 mt-2">
                <img src={form.imageUrl} alt="Preview" className="object-cover w-full h-full rounded" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 mt-2 border-2 border-dashed rounded-lg cursor-pointer border-slate-300">
                <Upload className="w-6 h-6 mb-1 text-gray-500" />
                <span className="text-sm text-gray-500">Upload gambar</span>
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
            )}
            {uploading && <p className="text-sm text-gray-500 mt-1">Mengunggah...</p>}
          </div>

          {/* Nama */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama Barang *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              SKU *
            </label>
            <input
              type="text"
              value={form.sku}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, sku: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Kategori
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, category: e.target.value })}
              placeholder="Misal: Sarana, Elektronik, dll"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
          </div>

          {/* Unit (SuperAdmin only) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Unit
            </label>
            <select
              value={form.unitId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, unitId: e.target.value })}
              disabled={units.length === 0}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            >
              <option value="">Pilih unit (wajib untuk Super Admin)</option>
              {units.map((u: Unit) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Harga */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Harga Jual *
              </label>
              <input
                type="number"
                value={form.unitPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, unitPrice: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Harga Beli
              </label>
              <input
                type="number"
                value={form.purchasePrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, purchasePrice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Min Stock */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Stok Minimum
            </label>
            <input
              type="number"
              value={form.minStock}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, minStock: e.target.value })}
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
            />
          </div>

          {/* IsActive */}
          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">Aktif</label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Save size={16} className="animate-spin" />
                Menyimpan...
              </>
            ) : 'Simpan Barang'}
          </button>
        </form>
      </div>
    </div>
  );
}

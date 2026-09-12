'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Save,
  Building,
  Tag,
  FileText,
  Users,
  LayoutDashboard,
} from 'lucide-react';
import { toast } from 'sonner';

interface UnitType {
  value: string;
  label: string;
}

const unitTypes: UnitType[] = [
  { value: 'KPAK', label: 'KPAK (Kantor Pelayanan Administrasi Keuangan)' },
  { value: 'KOPERASI', label: 'Koperasi' },
  { value: 'KANTIN', label: 'Kantin' },
  { value: 'UMUM', label: 'Umum' },
];

interface CreateForm {
  name: string;
  code: string;
  description: string;
  type: 'KPAK' | 'KOPERASI' | 'KANTIN' | 'UMUM';
  isRetail: boolean;
  lembagaId: string;
  parentId: string;
}

export default function CreateUnitPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;

  const [lembihs, setLembihs] = useState<Array<{ id: string; name: string }>>([]);
  const [units, setUnits] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [form, setForm] = useState<CreateForm>({
    name: '',
    code: '',
    description: '',
    type: 'UMUM',
    isRetail: false,
    lembagaId: session?.user?.lembagaId || '',
    parentId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Check authorization
  useEffect(() => {
    if (role && role !== 'SUPERADMIN') {
      toast.error('Akses ditolak. Hanya SuperAdmin yang dapat membuat unit.');
      router.push('/dashboard/units');
    }
  }, [role, router]);

  // Fetch lembaga for dropdown
  const fetchLembihs = async () => {
    try {
      const res = await fetch('/api/lembaga', {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setLembihs(data.data ?? []);
    } catch (err) {
      console.error('Error fetching lembihs:', err);
    }
  };

  // Fetch existing units for parent selection
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

  useEffect(() => {
    fetchLembihs();
    fetchUnits();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.lembagaId) {
      toast.error('Harap isi semua field yang wajib');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat unit');
      }

      toast.success('Unit berhasil dibuat');
      router.push('/dashboard/units');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat unit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.push('/dashboard/units')}
          className="mr-4 p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Buat Unit Baru</h1>
          <p className="text-slate-600 mt-1">
            Tambahkan unit operasional baru untuk lembaga
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama Unit *
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                placeholder="Misal: Kantin Umi"
                required
              />
            </div>
          </div>

          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Kode Unit *
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                placeholder="Misal: KANTIN-UMI"
                required
              />
            </div>
          </div>

          {/* Lembih */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Lembaga *
            </label>
            <select
              value={form.lembagaId}
              onChange={(e) => setForm({ ...form, lembagaId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
              required
            >
              <option value="">Pilih Lembaga</option>
              {lembihs.map((lembih) => (
                <option key={lembih.id} value={lembih.id}>
                  {lembih.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Jenis Unit *
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
            >
              {unitTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Is Retail */}
          <div className="flex items-center pt-6 space-x-3">
            <input
              type="checkbox"
              id="isRetail"
              checked={form.isRetail}
              onChange={(e) => setForm({ ...form, isRetail: e.target.checked })}
              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="isRetail" className="text-sm text-slate-700">
              Unit ritel (menjual langsung ke konsumen)
            </label>
          </div>

          {/* Parent Unit */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Unit Induk (Opsional)
            </label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value || '' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white"
            >
              <option value="">Tidak ada induk (unit mandiri)</option>
              {units
                .filter((u) => u.id !== '' && u.type !== form.type)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.type})
                  </option>
                ))
              }
            </select>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Deskripsi
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm resize-none"
                rows={3}
                placeholder="Deskripsi singkat tentang unit ini..."
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard/units')}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Save size={16} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Simpan Unit</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

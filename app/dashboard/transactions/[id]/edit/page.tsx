'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Save } from 'lucide-react';
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

interface EditForm {
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  description: string;
  reference: string;
  unitId: string;
  categoryId: string;
  date: string;
  photoUrl: string;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  reference?: string | null;
  unitId: string | null;
  categoryId?: string | null;
  type: string;
  date: string;
  photoUrl?: string | null;
}

function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;
  const userUnitId = session?.user?.unitId as string | undefined;

  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [form, setForm] = useState<EditForm>({
    type: 'INCOME',
    amount: '',
    description: '',
    reference: '',
    unitId: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    photoUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const extractId = async () => {
      const p = await params;
      setTransactionId(p.id);
    };
    extractId();
  }, [params]);

  const fetchData = async () => {
    try {
      const [uRes, cRes] = await Promise.all([
        fetch('/api/units'),
        fetch('/api/financial-categories'),
      ]);
      const uData = await uRes.json();
      const cData = await cRes.json();
      setUnits(uData.data ?? []);
      setCategories(cData.data ?? []);
      if (role && (role === 'MANAGER' || role === 'STAFF') && userUnitId) {
        setForm((prev) => ({ ...prev, unitId: userUnitId }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`);
      if (!res.ok) throw new Error('Gagal memuat transaksi');
      const result = await res.json();
      const tx: Transaction = result.data;
      setTransaction(tx);
      setForm({
        type: tx.type as 'INCOME' | 'EXPENSE',
        amount: String(tx.amount),
        description: tx.description,
        reference: tx.reference || '',
        unitId: tx.unitId || '',
        categoryId: tx.categoryId || '',
        date: tx.date ? new Date(tx.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        photoUrl: tx.photoUrl || '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat transaksi');
      router.push('/dashboard/transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (transactionId) fetchTransaction(transactionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description) {
      toast.error('Harap isi semua field yang wajib');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui transaksi');
      }
      toast.success('Transaksi berhasil diperbarui');
      router.push('/dashboard/transactions');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !transaction) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">Memuat data transaksi...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Edit Transaksi</h1>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg"
        >
          <ArrowLeft size={16} />
          Kembali
        </button>
      </div>

      <form onSubmit={handleUpdate} className="space-y-5 bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipe</label>
          <div className="flex gap-3">
            {(['INCOME', 'EXPENSE'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={form.type === t}
                  onChange={() => setForm((f) => ({ ...f, type: t }))}
                  className="radio radio-sm text-emerald-600"
                />
                <span className="text-sm text-slate-700">{t === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Jumlah (Rp)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit</label>
            <select
              value={form.unitId}
              onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
            >
              <option value="">Pilih unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategori</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
            >
              <option value="">Pilih kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Referensi</label>
          <input
            type="text"
            value={form.reference}
            onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            placeholder="Nomor referensi opsional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Deskripsi</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            rows={3}
            placeholder="Deskripsi transaksi"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 rounded-lg text-sm text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <>Menyimpan... </> : <><Save size={16} /> Simpan</>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EditTransactionPage params={params} />;
}

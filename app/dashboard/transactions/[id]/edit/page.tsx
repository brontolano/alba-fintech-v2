"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

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
  type: "INCOME" | "EXPENSE";
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
  const [unitSearch, setUnitSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [form, setForm] = useState<EditForm>({
    type: "INCOME",
    amount: "",
    description: "",
    reference: "",
    unitId: "",
    categoryId: "",
    date: new Date().toISOString().split("T")[0],
    photoUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const filteredUnits = units.filter((unit) => {
    const query = unitSearch.trim().toLowerCase();
    return (
      !query ||
      unit.name.toLowerCase().includes(query) ||
      unit.code.toLowerCase().includes(query) ||
      unit.id === form.unitId
    );
  });
  const filteredCategories = categories.filter((category) => {
    const query = categorySearch.trim().toLowerCase();
    return (
      !query ||
      category.name.toLowerCase().includes(query) ||
      category.code.toLowerCase().includes(query) ||
      category.id === form.categoryId
    );
  });

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
        fetch("/api/units"),
        fetch("/api/financial-categories"),
      ]);
      const uData = await uRes.json();
      const cData = await cRes.json();
      setUnits(uData.data ?? []);
      setCategories(cData.data ?? []);
      if (role && (role === "MANAGER" || role === "STAFF") && userUnitId) {
        setForm((prev) => ({ ...prev, unitId: userUnitId }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`);
      if (!res.ok) throw new Error("Gagal memuat transaksi");
      const result = await res.json();
      const tx: Transaction = result.data;
      setTransaction(tx);
      setForm({
        type: tx.type as "INCOME" | "EXPENSE",
        amount: String(tx.amount),
        description: tx.description,
        reference: tx.reference || "",
        unitId: tx.unitId || "",
        categoryId: tx.categoryId || "",
        date: tx.date
          ? new Date(tx.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        photoUrl: tx.photoUrl || "",
      });
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat transaksi");
      router.push("/dashboard/transactions");
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
      toast.error("Harap isi semua field yang wajib");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memperbarui transaksi");
      }
      toast.success("Transaksi berhasil diperbarui");
      router.push("/dashboard/transactions");
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui transaksi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !transaction) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">
          Memuat data transaksi...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Edit Transaksi
          </h1>
        </div>
      </div>

      <form
        onSubmit={handleUpdate}
        className="space-y-5 rounded-[22px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Tipe
          </label>
          <div className="flex flex-wrap gap-3">
            {(["INCOME", "EXPENSE"] as const).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={form.type === t}
                  onChange={() => setForm((f) => ({ ...f, type: t }))}
                  className="h-4 w-4 border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-foreground">
                  {t === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Jumlah (Rp)
          </label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Unit
            </label>
            <input
              type="search"
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Cari unit atau kode..."
              aria-label="Cari unit"
            />
            <select
              value={form.unitId}
              onChange={(e) =>
                setForm((f) => ({ ...f, unitId: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="">Pilih unit</option>
              {filteredUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Kategori
            </label>
            <input
              type="search"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Cari kategori atau kode..."
              aria-label="Cari kategori"
            />
            <select
              value={form.categoryId}
              onChange={(e) =>
                setForm((f) => ({ ...f, categoryId: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="">Pilih kategori</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Tanggal
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Referensi
          </label>
          <input
            type="text"
            value={form.reference}
            onChange={(e) =>
              setForm((f) => ({ ...f, reference: e.target.value }))
            }
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            placeholder="Nomor referensi opsional"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Deskripsi
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            rows={3}
            placeholder="Deskripsi transaksi"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <>Menyimpan... </>
            ) : (
              <>
                <Save size={16} /> Simpan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EditTransactionPage params={params} />;
}

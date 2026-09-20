"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  code: string;
  type: string;
}

export default function UnitCashPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const unitId = session?.user?.unitId;
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "INCOME" as "INCOME" | "EXPENSE",
    amount: "",
    description: "",
    categoryId: "",
    reference: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (session?.user?.unitIsRetail === true) {
      router.replace("/dashboard/transactions");
      return;
    }
    if (!unitId) return;
    fetch(`/api/financial-categories?unitId=${encodeURIComponent(unitId)}`)
      .then((response) => response.json())
      .then((result) => setCategories(result.data ?? []))
      .catch(() => setCategories([]));
  }, [unitId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!unitId || !form.amount || !form.description) {
      toast.error("Nominal dan keterangan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const body = new FormData();
      body.set("type", form.type);
      body.set("amount", form.amount);
      body.set("description", form.description);
      body.set("unitId", unitId);
      body.set("categoryId", form.categoryId);
      body.set("reference", form.reference);
      body.set("date", form.date);
      const response = await fetch("/api/transactions", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal menyimpan transaksi");
      toast.success("Transaksi kas unit berhasil disimpan");
      router.push("/dashboard/transactions");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan transaksi",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kas Unit</h1>
          <p className="text-sm text-muted-foreground">
            Catat pemasukan dan pengeluaran unit sederhana.
          </p>
        </div>
      </div>
      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border border-border bg-card p-5"
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setForm({ ...form, type: "INCOME", categoryId: "" })}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${form.type === "INCOME" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-border text-muted-foreground"}`}
          >
            <ArrowUpRight size={17} /> Pemasukan
          </button>
          <button
            type="button"
            onClick={() =>
              setForm({ ...form, type: "EXPENSE", categoryId: "" })
            }
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${form.type === "EXPENSE" ? "border-rose-500 bg-rose-50 text-rose-700" : "border-border text-muted-foreground"}`}
          >
            <ArrowDownRight size={17} /> Pengeluaran
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-foreground">
            Nominal *
            <input
              required
              type="number"
              min="1"
              step="any"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-normal"
              placeholder="0"
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            Tanggal *
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-normal"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-foreground">
          Kategori
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-normal"
          >
            <option value="">Pilih kategori</option>
            {categories
              .filter((category) => category.type === form.type)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.code})
                </option>
              ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-foreground">
          Keterangan *
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 font-normal"
            placeholder="Contoh: Pembelian ATK kantor"
          />
        </label>
        <label className="block text-sm font-medium text-foreground">
          Referensi atau catatan tambahan
          <input
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-normal"
            placeholder="Nomor bukti atau keterangan tambahan"
          />
        </label>
        <button
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Save size={17} /> {saving ? "Menyimpan..." : "Simpan Transaksi"}
        </button>
      </form>
    </div>
  );
}

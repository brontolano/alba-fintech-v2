"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  code: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  unitId: string | null;
}

const typeLabels = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
};

export default function CategorySettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const unitId = session?.user?.unitId ?? "";
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "EXPENSE" as Category["type"],
  });
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    setLoading(true);
    const query = role === "MANAGER" && unitId ? `?unitId=${unitId}` : "";
    const response = await fetch(`/api/financial-categories${query}`);
    const result = await response.json();
    if (response.ok) setCategories(result.data ?? []);
    else toast.error(result.error || "Gagal memuat kategori");
    setLoading(false);
  };

  useEffect(() => {
    if (role) loadCategories();
  }, [role, unitId]);

  const addCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/financial-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        unitId: role === "MANAGER" ? unitId : null,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "Gagal menambah kategori");
      return;
    }
    setCategories((current) => [...current, result.data]);
    setForm({ name: "", code: "", type: "EXPENSE" });
    toast.success("Kategori ditambahkan");
  };

  const removeCategory = async (id: string) => {
    if (!window.confirm("Hapus kategori ini?")) return;
    const response = await fetch(`/api/financial-categories/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "Kategori tidak dapat dihapus");
      return;
    }
    setCategories((current) =>
      current.filter((category) => category.id !== id),
    );
    toast.success("Kategori dihapus");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Kategori Keuangan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === "MANAGER"
            ? "Kategori khusus unit Anda."
            : "Kategori umum untuk transaksi lembaga/pimpinan."}
        </p>
      </div>
      <form
        onSubmit={addCategory}
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_1fr_180px_auto]"
      >
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nama kategori"
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
        />
        <input
          required
          value={form.code}
          onChange={(e) =>
            setForm({ ...form, code: e.target.value.toUpperCase() })
          }
          placeholder="Kode kategori"
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
        />
        <select
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value as Category["type"] })
          }
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
        >
          {Object.entries(typeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
          <Plus size={16} /> Tambah
        </button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">
            Memuat kategori...
          </p>
        ) : categories.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Belum ada kategori.
          </p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-3 border-b border-border p-4 last:border-b-0"
            >
              <div>
                <p className="font-medium text-foreground">{category.name}</p>
                <p className="text-xs text-muted-foreground">
                  {category.code} · {typeLabels[category.type]} ·{" "}
                  {category.unitId ? "Unit" : "Lembaga"}
                </p>
              </div>
              <button
                onClick={() => removeCategory(category.id)}
                className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                aria-label={`Hapus ${category.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Sparkles,
  Building2,
  LayoutGrid,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  code: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  isActive: boolean | null;
  unitId: string | null;
  lembagaId: string | null;
}

const typeLabels: Record<string, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
};

const typeColors: Record<string, string> = {
  INCOME: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  EXPENSE: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  TRANSFER: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export default function CategorySettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const unitId = (session?.user as any)?.unitId as string | undefined;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "EXPENSE" as Category["type"],
    scope: "unit" as "lemaga" | "unit",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", code: "", type: "EXPENSE" as Category["type"] });

  const canManageLembaga = role === "SUPERADMIN" || role === "PIMPINAN";
  const canManageUnit = role === "SUPERADMIN" || role === "PIMPINAN" || role === "MANAGER";

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/financial-categories");
    const result = await res.json();
    if (res.ok) setCategories(result.data ?? []);
    else toast.error(result.error || "Gagal memuat kategori");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (role) loadCategories();
  }, [role, loadCategories]);

  const lembagaCategories = categories.filter((c) => c.unitId === null);
  const unitCategories = categories.filter((c) => c.unitId !== null);

  // ── Seed default ──
  const handleSeed = async () => {
    setSeeding(true);
    const res = await fetch("/api/financial-categories/seed-default", { method: "POST" });
    const result = await res.json();
    setSeeding(false);
    if (!res.ok) {
      toast.error(result.error || "Gagal membuat kategori default");
      return;
    }
    toast.success(result.message || "Kategori Umum berhasil dibuat");
    loadCategories();
  };

  // ── Add category ──
  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      name: form.name,
      code: form.code.toUpperCase(),
      type: form.type,
    };
    if (form.scope === "unit" && unitId) body.unitId = unitId;
    // scope lembaga => unitId null

    const res = await fetch("/api/financial-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Gagal menambah kategori");
      return;
    }
    setCategories((prev) => [...prev, result.data]);
    setForm({ name: "", code: "", type: "EXPENSE", scope: "unit" });
    toast.success("Kategori ditambahkan");
  };

  // ── Update category ──
  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/financial-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        code: editForm.code.toUpperCase(),
        type: editForm.type,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Gagal mengubah kategori");
      return;
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...result.data } : c)),
    );
    setEditingId(null);
    toast.success("Kategori diperbarui");
  };

  // ── Toggle active ──
  const toggleActive = async (id: string, current: boolean | null) => {
    const res = await fetch(`/api/financial-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Gagal mengubah status");
      return;
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !current } : c)),
    );
  };

  // ── Delete category ──
  const removeCategory = async (id: string) => {
    if (!window.confirm("Hapus kategori ini?")) return;
    const res = await fetch(`/api/financial-categories/${id}`, { method: "DELETE" });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Kategori tidak dapat dihapus");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success("Kategori dihapus");
  };

  // ── Category row ──
  const renderCategory = (cat: Category, canEdit: boolean) => {
    const isEditing = editingId === cat.id;

    if (isEditing) {
      return (
        <div
          key={cat.id}
          className="flex items-center gap-2 border-b border-border p-3 last:border-b-0"
        >
          <input
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
          />
          <input
            value={editForm.code}
            onChange={(e) =>
              setEditForm({ ...editForm, code: e.target.value.toUpperCase() })
            }
            className="w-24 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
          />
          <select
            value={editForm.type}
            onChange={(e) =>
              setEditForm({ ...editForm, type: e.target.value as Category["type"] })
            }
            className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
          >
            {Object.entries(typeLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button
            onClick={() => saveEdit(cat.id)}
            className="rounded-lg bg-primary/10 p-1.5 text-primary hover:bg-primary/20"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => setEditingId(null)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={14} />
          </button>
        </div>
      );
    }

    return (
      <div
        key={cat.id}
        className="flex items-center gap-3 border-b border-border p-3 last:border-b-0"
      >
        <button
          onClick={() => canEdit && toggleActive(cat.id, cat.isActive)}
          className={`h-5 w-9 shrink-0 rounded-full transition-colors ${
            cat.isActive !== false
              ? "bg-primary"
              : "bg-muted"
          } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
          disabled={!canEdit}
        >
          <div
            className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              cat.isActive !== false ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${cat.isActive === false ? "text-muted-foreground line-through" : "text-foreground"}`}
          >
            {cat.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {cat.code} ·{" "}
            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColors[cat.type]}`}>
              {typeLabels[cat.type]}
            </span>
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setEditingId(cat.id);
                setEditForm({ name: cat.name, code: cat.code, type: cat.type });
              }}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => removeCategory(cat.id)}
              className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Kategori Keuangan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola kategori Umum (lembaga) dan kategori per Unit
        </p>
      </div>

      {/* ── Seed button ── */}
      {canManageLembaga && lembagaCategories.length === 0 && (
        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 text-center">
          <Sparkles className="mx-auto mb-2 h-8 w-8 text-primary" />
          <p className="mb-3 text-sm font-medium text-foreground">
            Belum ada Kategori Umum
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Buat 13 kategori default (Pemasukan, Pengeluaran, Transfer) yang berlaku untuk seluruh unit di lembaga Anda.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Sparkles size={16} />
            {seeding ? "Membuat..." : "Buat Kategori Umum Default"}
          </button>
        </div>
      )}

      {/* ── Add form ── */}
      {canManageUnit && (
        <form
          onSubmit={addCategory}
          className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_100px_120px_140px_auto]"
        >
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama kategori"
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="Kode"
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm uppercase"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as Category["type"] })}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            {Object.entries(typeLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value as "lemaga" | "unit" })}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            {canManageLembaga && <option value="lemaga">Lembaga (Umum)</option>}
            <option value="unit">Unit Saya</option>
          </select>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Plus size={16} /> Tambah
          </button>
        </form>
      )}

      {/* ── Lembaga (Umum) categories ── */}
      {canManageLembaga && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Kategori Umum (Lembaga)
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {lembagaCategories.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {lembagaCategories.length === 0 ? (
              <p className="p-5 text-center text-sm text-muted-foreground">
                Belum ada kategori Umum. Klik tombol di atas untuk membuat.
              </p>
            ) : (
              lembagaCategories.map((cat) => renderCategory(cat, canManageLembaga))
            )}
          </div>
        </section>
      )}

      {/* ── Unit categories ── */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <LayoutGrid size={18} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Kategori Unit
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {unitCategories.length}
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {unitCategories.length === 0 ? (
            <p className="p-5 text-center text-sm text-muted-foreground">
              Belum ada kategori unit.
            </p>
          ) : (
            unitCategories.map((cat) => renderCategory(cat, canManageUnit))
          )}
        </div>
      </section>
    </div>
  );
}

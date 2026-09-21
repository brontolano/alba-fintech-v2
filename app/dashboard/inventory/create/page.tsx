"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Upload, X, Save, ArrowLeft } from "lucide-react";

interface Unit {
  id: string;
  name: string;
}

import { usePageGuard } from "@/lib/use-page-guard";

export default function CreateInventoryPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      (u?.unitIsRetail === true &&
        (u.role === "MANAGER" || u.role === "STAFF")),
  });
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
    name: "",
    sku: "",
    category: "",
    unitPrice: "",
    purchasePrice: "",
    minStock: "",
    isActive: true,
    unitId: "",
    imageUrl: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }

    // Set default unit for MANAGER/STAFF
    if (
      (session.user.role === "MANAGER" || session.user.role === "STAFF") &&
      session.user.unitId
    ) {
      setForm((prev) => ({ ...prev, unitId: session.user.unitId as string }));
    }

    if (session.user.role === "SUPERADMIN") {
      fetch("/api/units")
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
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setForm((prev) => ({ ...prev, imageUrl: json.url }));
      toast.success("Gambar berhasil diunggah");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, imageUrl: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.unitPrice) {
      toast.error("Nama, SKU, dan harga jual wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          category: form.category || undefined,
          unitPrice: parseFloat(form.unitPrice),
          purchasePrice: form.purchasePrice
            ? parseFloat(form.purchasePrice)
            : undefined,
          minStock: form.minStock ? parseInt(form.minStock) : 0,
          isActive: form.isActive,
          unitId: form.unitId || undefined,
          imageUrl: form.imageUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menambahkan barang");
      toast.success("Barang berhasil ditambahkan");
      router.push("/dashboard/inventory");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Tambah Barang Baru
        </h1>
      </div>
      <div className="rounded-[22px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Gambar */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Gambar Barang
            </label>
            {form.imageUrl ? (
              <div className="relative mt-2 h-32 w-32">
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="h-full w-full rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="mt-2 flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition hover:border-primary/50">
                <Upload className="mb-1 h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Upload gambar
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
            {uploading && (
              <p className="mt-1 text-sm text-muted-foreground">
                Mengunggah...
              </p>
            )}
          </div>

          {/* Nama */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Nama Barang *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, name: e.target.value })
              }
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              SKU *
            </label>
            <input
              type="text"
              value={form.sku}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, sku: e.target.value })
              }
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Kategori
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, category: e.target.value })
              }
              placeholder="Misal: Sarana, Elektronik, dll"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Unit
            </label>
            <select
              value={form.unitId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setForm({ ...form, unitId: e.target.value })
              }
              disabled={units.length === 0}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Pilih unit (wajib untuk Super Admin)</option>
              {units.map((u: Unit) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Harga */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Harga Jual *
              </label>
              <input
                type="number"
                value={form.unitPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, unitPrice: e.target.value })
                }
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Harga Beli
              </label>
              <input
                type="number"
                value={form.purchasePrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, purchasePrice: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Stok Minimum
            </label>
            <input
              type="number"
              value={form.minStock}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, minStock: e.target.value })
              }
              placeholder="0"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, isActive: e.target.checked })
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <label htmlFor="isActive" className="text-sm text-foreground">
              Aktif
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Save size={16} className="animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Barang"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

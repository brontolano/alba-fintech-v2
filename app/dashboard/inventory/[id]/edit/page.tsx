"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { finzoInputClass } from "@/components/ui/finzo";

interface InventoryForm {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  purchasePrice: string;
  currentStock: string;
  minStock: string;
  isActive: boolean;
  imageUrl: string;
}

import { usePageGuard } from "@/lib/use-page-guard";

export default function EditInventoryPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      (u?.unitIsRetail === true &&
        (u.role === "MANAGER" || u.role === "STAFF")),
  });
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<InventoryForm>({
    name: "",
    sku: "",
    category: "",
    unitPrice: "",
    purchasePrice: "",
    currentStock: "",
    minStock: "",
    isActive: true,
    imageUrl: "",
  });

  useEffect(() => {
    if (!id) return;
    const loadItem = async () => {
      try {
        const response = await fetch(`/api/inventory/${id}`);
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Gagal memuat barang");
        const item = result.data;
        setForm({
          name: item.name || "",
          sku: item.sku || "",
          category: item.category || "",
          unitPrice: String(Number(item.unitPrice) || ""),
          purchasePrice:
            item.purchasePrice == null
              ? ""
              : String(Number(item.purchasePrice)),
          currentStock: String(Number(item.currentStock) || 0),
          minStock: String(Number(item.minStock) || 0),
          isActive: item.isActive !== false,
          imageUrl: item.imageUrl || "",
        });
      } catch (error: any) {
        toast.error(error.message || "Gagal memuat barang");
        router.push("/dashboard/inventory");
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, [id, router]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload gagal");
      setForm((current) => ({ ...current, imageUrl: result.url }));
      toast.success("Gambar berhasil diunggah");
    } catch (error: any) {
      toast.error(error.message || "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.sku || !form.unitPrice) {
      toast.error("Nama, SKU, dan harga jual wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          category: form.category || null,
          unitPrice: Number(form.unitPrice),
          purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
          currentStock: Number(form.currentStock),
          minStock: Number(form.minStock),
          isActive: form.isActive,
          imageUrl: form.imageUrl || null,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal menyimpan barang");
      toast.success("Barang berhasil diperbarui");
      router.push("/dashboard/inventory");
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan barang");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Memuat data barang...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
          aria-label="Kembali"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Edit Barang
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Perbarui informasi dan stok barang inventori.
          </p>
        </div>
      </div>

      <div className="rounded-[22px] border border-border bg-card/90 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Gambar Barang
            </label>
            {form.imageUrl ? (
              <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-border">
                <img
                  src={form.imageUrl}
                  alt="Preview barang"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({ ...current, imageUrl: "" }))
                  }
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  aria-label="Hapus gambar"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 text-sm font-medium text-muted-foreground transition hover:bg-muted">
                <Upload size={16} />{" "}
                {uploading ? "Mengunggah..." : "Pilih gambar"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["name", "Nama Barang", "text"],
                ["sku", "SKU", "text"],
                ["category", "Kategori", "text"],
                ["unitPrice", "Harga Jual", "number"],
                ["purchasePrice", "Harga Beli", "number"],
                ["currentStock", "Stok Saat Ini", "number"],
                ["minStock", "Stok Minimum", "number"],
              ] as const
            ).map(([field, label, type]) => (
              <div key={field}>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {label}
                </label>
                <input
                  type={type}
                  value={form[field]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  className={finzoInputClass}
                  min={type === "number" ? "0" : undefined}
                  required={
                    field === "name" || field === "sku" || field === "unitPrice"
                  }
                />
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Barang aktif dan dapat digunakan di POS
          </label>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              <Save size={16} /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

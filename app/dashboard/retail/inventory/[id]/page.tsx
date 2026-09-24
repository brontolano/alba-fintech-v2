"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Package,
  Save,
  Upload,
  X,
  Pencil,
} from "lucide-react";
import { usePageGuard } from "@/lib/use-page-guard";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const inputCls =
  "rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary";

type ItemDetail = {
  id: string;
  name: string;
  sku?: string;
  category?: string | null;
  currentStock: number;
  purchasePrice?: number | null;
  minStock?: number;
  unitPrice?: number;
  imageUrl?: string;
  isActive?: boolean;
  isConsignment?: boolean;
  isConsignmentOwner?: string | null;
};

export default function RetailInventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      (u?.unitIsRetail === true &&
        (u.role === "MANAGER" || u.role === "STAFF")),
  });
  const isManager = String(user?.role || "").toUpperCase() === "MANAGER";

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    unitPrice: "",
    purchasePrice: "",
    minStock: "",
    isActive: true,
    imageUrl: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/inventory/${id}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Gagal memuat barang");
        const d: ItemDetail = body.data;
        setItem(d);
        setForm({
          name: d.name || "",
          sku: d.sku || "",
          category: d.category || "",
          unitPrice: d.unitPrice != null ? String(d.unitPrice) : "",
          purchasePrice:
            d.purchasePrice != null ? String(d.purchasePrice) : "",
          minStock: d.minStock != null ? String(d.minStock) : "",
          isActive: d.isActive !== false,
          imageUrl: d.imageUrl || "",
        });
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error || "Upload gagal");
      setForm((f) => ({ ...f, imageUrl: r.url }));
      setMsg("Foto berhasil diunggah. Jangan lupa Simpan.");
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const unitPrice = Number(form.unitPrice);
    if (!form.name.trim() || !unitPrice) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || undefined,
          category: form.category.trim() || null,
          unitPrice,
          purchasePrice: form.purchasePrice
            ? Number(form.purchasePrice)
            : null,
          minStock: form.minStock ? Number(form.minStock) : 0,
          isActive: form.isActive,
          imageUrl: form.imageUrl || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan barang");
      setMsg("Perubahan tersimpan");
      setItem((i) =>
        i ? { ...i, ...body.data } : i,
      );
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-3 overflow-x-hidden p-3 sm:p-4">
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 size={18} className="mx-auto animate-spin" />
        </div>
      </main>
    );
  }

  const low = item
    ? Number(item.currentStock) <= Number(item.minStock ?? -1)
    : false;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-3 overflow-x-hidden p-3 sm:p-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={() => router.back()}
          aria-label="Kembali"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">
          Detail Barang
        </h1>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-600">
          {err}
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-600">
          {msg}
        </div>
      )}

      {item && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border bg-card">
            {form.imageUrl ? (
              <img
                src={form.imageUrl}
                alt={item.name}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-muted">
                <Package size={28} className="text-muted-foreground" />
              </div>
            )}
          </div>

          {isManager ? (
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border bg-card p-2.5"
            >
              <div className="mb-2">
                <p className="mb-1 px-0.5 text-xs font-semibold text-muted-foreground">
                  Foto Barang
                </p>
                {form.imageUrl && (
                  <div className="mb-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, imageUrl: "" }))
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1 text-[11px] font-semibold text-rose-600"
                    >
                      <X size={11} /> Hapus foto
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      (kosong = pakai ikon default)
                    </span>
                  </div>
                )}
                <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 text-xs font-medium text-muted-foreground hover:bg-muted">
                  <Upload size={14} />{" "}
                  {uploading ? "Mengunggah..." : "Pilih / ganti foto"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid gap-1.5 sm:grid-cols-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama barang *"
                  className={`${inputCls} min-w-0`}
                  required
                />
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU"
                  className={`${inputCls} min-w-0`}
                />
                <input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="Kategori"
                  className={`${inputCls} min-w-0`}
                />
                <input
                  value={form.unitPrice}
                  onChange={(e) =>
                    setForm({ ...form, unitPrice: e.target.value })
                  }
                  placeholder="Harga jual *"
                  type="number"
                  min="0"
                  className={`${inputCls} min-w-0`}
                  required
                />
                <input
                  value={form.purchasePrice}
                  onChange={(e) =>
                    setForm({ ...form, purchasePrice: e.target.value })
                  }
                  placeholder="Harga beli"
                  type="number"
                  min="0"
                  className={`${inputCls} min-w-0`}
                />
                <input
                  value={form.minStock}
                  onChange={(e) =>
                    setForm({ ...form, minStock: e.target.value })
                  }
                  placeholder="Stok minimum"
                  type="number"
                  min="0"
                  className={`${inputCls} min-w-0`}
                />
              </div>

              <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
                Aktif (tampil di POS & stok)
              </label>

              <button
                type="submit"
                disabled={saving || !form.name.trim() || !Number(form.unitPrice)}
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Simpan Perubahan
              </button>
            </form>
          ) : (
            <div className="rounded-xl border bg-card p-2.5">
              <div className="space-y-0.5">
                <p className="truncate text-sm font-semibold" title={item.name}>
                  {item.name}
                  {item.isConsignment && (
                    <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-px align-middle text-[10px] font-semibold text-amber-800">
                      UMKM
                    </span>
                  )}
                </p>
                <p className="text-sm font-medium text-emerald-700">
                  {item.unitPrice ? fmt(Number(item.unitPrice)) : "—"}
                </p>
                <p
                  className={`text-xs ${low ? "font-bold text-rose-600" : "text-muted-foreground"}`}
                >
                  Stok: {item.currentStock}
                  {low ? " · menipis" : ""}
                </p>
                <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] text-muted-foreground">
                  <p>SKU: {item.sku || "—"}</p>
                  <p>Kategori: {item.category || "—"}</p>
                  <p>Stok min: {item.minStock ?? 0}</p>
                  <p>
                    Harga beli:{" "}
                    {item.purchasePrice ? fmt(Number(item.purchasePrice)) : "—"}
                  </p>
                </div>
              </div>
              <p className="mt-2 flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
                <Pencil size={11} /> Hanya MANAGER yang bisa mengedit barang ini.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
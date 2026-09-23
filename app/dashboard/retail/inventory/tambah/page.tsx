"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackagePlus, ArrowLeft, Loader2 } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

type Session = {
  user?: { role?: string; unitId?: string; unitIsRetail?: boolean };
};
type Unit = { id: string; name: string };

export default function TambahBarangPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    sku: string;
    category: string;
    unitPrice: string;
    purchasePrice: string;
    minStock: string;
    unitId: string;
  }>({
    name: "",
    sku: "",
    category: "",
    unitPrice: "",
    purchasePrice: "",
    minStock: "",
    unitId: "",
  });

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        setSession(s);
        const r2 = String(s?.user?.role || "").toUpperCase();
        if (
          r2 === "SUPERADMIN" ||
          r2 === "PIMPINAN" ||
          r2 === "MANAGER" ||
          r2 === "STAFF"
        ) {
          if (r2 === "MANAGER" || r2 === "STAFF") {
            setForm((p) => ({ ...p, unitId: s.user.unitId || "" }));
          } else {
            fetch("/api/units?active=true")
              .then((r3) => r3.json())
              .then((b) => setUnits(b.units || b.data || []))
              .catch(() => setUnits([]));
          }
        } else {
          router.push("/login");
        }
      })
      .catch(() => setSession({}))
      .finally(() => setLoading(false));
  }, [router]);

  const r = String(session?.user?.role || "").toUpperCase();
  const canWrite =
    r === "SUPERADMIN" || r === "PIMPINAN" || r === "MANAGER" || r === "STAFF";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim(),
          category: form.category.trim() || null,
          unitPrice: Number(form.unitPrice) || 0,
          purchasePrice: form.purchasePrice
            ? Number(form.purchasePrice)
            : undefined,
          minStock: form.minStock ? Number(form.minStock) : 0,
          isActive: true,
          ...(form.unitId ? { unitId: form.unitId } : {}),
        }),
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Gagal menambah barang");
      setMsg("Barang ditambahkan");
      setForm({
        name: "",
        sku: "",
        category: "",
        unitPrice: "",
        purchasePrice: "",
        minStock: "",
        unitId: form.unitId,
      });
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const fields = [
    { label: "Nama barang", key: "name", type: "text" },
    { label: "SKU", key: "sku", type: "text" },
    { label: "Kategori", key: "category", type: "text" },
    { label: "Harga jual", key: "unitPrice", type: "number" },
    { label: "Harga beli (modal)", key: "purchasePrice", type: "number" },
    { label: "Stok minimum", key: "minStock", type: "number" },
  ];

  const previewPrice = Number(form.unitPrice) || 0;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/retail/inventory"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <PackagePlus size={20} /> Tambah Barang (Pondok)
        </h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Barang pondok = barang milik unit (bukan titipan UMKM). SKU unik
        global — jika gagal, pakai kode berbeda.
      </p>

      {loading ? (
        <div className="py-6 text-center text-muted-foreground">
          <Loader2 size={18} className="mx-auto animate-spin" />
        </div>
      ) : !canWrite ? (
        <p className="py-3 text-sm text-rose-600">
          Anda tidak memiliki akses menambah barang.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-4">
          {err && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">
              {err}
            </div>
          )}
          {msg && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600">
              {msg}
            </div>
          )}

          {r === "SUPERADMIN" || r === "PIMPINAN" ? (
            <div>
              <label className="block text-xs font-medium">Unit</label>
              <select
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Pilih unit —</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div
                key={f.key}
                className={f.key === "unitPrice" ? "sm:col-span-2" : ""}
              >
                <label className="block text-xs font-medium">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  min={f.type === "number" ? "0" : undefined}
                  step={f.type === "number" ? "100" : undefined}
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  required={f.key === "name" || f.key === "sku" || f.key === "unitPrice"}
                />
              </div>
            ))}
            {previewPrice > 0 && (
              <div className="sm:col-span-2">
                <span className="text-xs text-muted-foreground">
                  Harga jual: {fmt(previewPrice)}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!form.name || !form.sku || !form.unitPrice}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <PackagePlus size={14} /> Simpan Barang
          </button>
        </form>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackagePlus, PackageOpen, ArrowLeft, Loader2 } from "lucide-react";
import { ImageUpload } from "@/components/retail/ImageUpload";

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
type Owner = { id: string; name: string };
type Kind = "pondok" | "titipan";

export default function TambahBarangPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [kind, setKind] = useState<Kind>("pondok");
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    unitPrice: "",
    purchasePrice: "",
    minStock: "",
    startingStock: "",
    ownerId: "",
    marginType: "PERCENT" as "PERCENT" | "FIXED",
    marginValue: "",
    unitId: "",
    imageUrl: "",
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

  // Daftar pemilik untuk mode titipan (scope unit aktif).
  useEffect(() => {
    if (!canWrite || !form.unitId) {
      setOwners([]);
      return;
    }
    fetch(`/api/retail/consignments/owners?unitId=${form.unitId}`)
      .then((res) => res.json())
      .then((b) => setOwners(Array.isArray(b.data) ? b.data : []))
      .catch(() => setOwners([]));
  }, [canWrite, form.unitId]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }) as typeof form);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (kind === "pondok") {
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
            imageUrl: form.imageUrl || null,
            ...(form.unitId ? { unitId: form.unitId } : {}),
          }),
        });
        const b = await res.json();
        if (!res.ok) throw new Error(b.error || "Gagal menambah barang");
        setMsg("Barang pondok ditambahkan");
      } else {
        if (!form.ownerId) throw new Error("Pilih pemilik titipan");
        const res = await fetch("/api/retail/consignments/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerId: form.ownerId,
            name: form.name.trim(),
            sku: form.sku.trim(),
            category: form.category.trim() || null,
            costPrice: Number(form.purchasePrice) || 0,
            marginType: form.marginType,
            marginValue: Number(form.marginValue) || 0,
            startingStock: form.startingStock ? Number(form.startingStock) : 0,
            minStock: form.minStock ? Number(form.minStock) : 0,
            ...(form.unitId ? { unitId: form.unitId } : {}),
          }),
        });
        const b = await res.json();
        if (!res.ok) throw new Error(b.error || "Gagal menambah barang titipan");
        setMsg(
          `Barang titipan ditambahkan · harga jual ${fmt(Number(b.data?.agreedPrice) || 0)}`,
        );
      }
      const keepUnit = form.unitId;
      setForm({
        name: "",
        sku: "",
        category: "",
        unitPrice: "",
        purchasePrice: "",
        minStock: "",
        startingStock: "",
        ownerId: "",
        marginType: "PERCENT",
        marginValue: "",
        unitId: keepUnit,
        imageUrl: "",
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cost = Number(form.purchasePrice) || 0;
  const marginVal = Number(form.marginValue) || 0;
  const agreed =
    form.marginType === "FIXED"
      ? cost + marginVal
      : Math.round(cost * (1 + marginVal / 100));
  const valid =
    form.name.trim() &&
    form.sku.trim() &&
    (kind === "pondok"
      ? Number(form.unitPrice) > 0
      : form.ownerId && cost >= 0);

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
          {kind === "pondok" ? (
            <PackagePlus size={20} />
          ) : (
            <PackageOpen size={20} />
          )}
          Tambah Barang
        </h1>
      </div>

      {/* Pilihan jenis barang */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { key: "pondok", label: "Barang Pondok", desc: "Milik unit" },
            { key: "titipan", label: "Barang Titipan", desc: "Milik UMKM" },
          ] as { key: Kind; label: string; desc: string }[]
        ).map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => {
              setKind(o.key);
              setErr(null);
              setMsg(null);
            }}
            className={`rounded-xl border p-3 text-left ${
              kind === o.key
                ? "border-primary bg-primary/10"
                : "bg-card hover:border-primary/50"
            }`}
          >
            <p className="text-sm font-semibold">{o.label}</p>
            <p className="text-xs text-muted-foreground">{o.desc}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-6 text-center text-muted-foreground">
          <Loader2 size={18} className="mx-auto animate-spin" />
        </div>
      ) : !canWrite ? (
        <p className="py-3 text-sm text-rose-600">
          Anda tidak memiliki akses menambah barang.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-card p-4"
        >
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

          {(r === "SUPERADMIN" || r === "PIMPINAN") && (
            <div>
              <label className="block text-xs font-medium">Unit</label>
              <select
                value={form.unitId}
                onChange={(e) => set("unitId", e.target.value)}
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
          )}

          {kind === "titipan" && (
            <div>
              <label className="block text-xs font-medium">
                Pemilik titipan
              </label>
              <select
                value={form.ownerId}
                onChange={(e) => set("ownerId", e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">
                  {owners.length === 0
                    ? "— Belum ada pemilik di unit ini —"
                    : "— Pilih pemilik —"}
                </option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              {owners.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Daftarkan pemilik dulu di halaman{" "}
                  <Link
                    href="/dashboard/retail/konsinyasi"
                    className="font-semibold text-primary"
                  >
                    Titipan UMKM
                  </Link>
                  .
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium">Foto produk</label>
            <ImageUpload
              value={form.imageUrl}
              onChange={(url) => set("imageUrl", url ?? "")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium">Nama barang</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium">SKU</label>
              <input
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Kategori</label>
              <input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Stok minimum</label>
              <input
                type="number"
                min="0"
                value={form.minStock}
                onChange={(e) => set("minStock", e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            {kind === "pondok" ? (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium">Harga jual</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.unitPrice}
                    onChange={(e) => set("unitPrice", e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    required
                  />
                  {Number(form.unitPrice) > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Harga jual: {fmt(Number(form.unitPrice))}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium">
                    Harga beli (modal)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.purchasePrice}
                    onChange={(e) => set("purchasePrice", e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium">
                    Harga modal (dari pemilik)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.purchasePrice}
                    onChange={(e) => set("purchasePrice", e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Stok awal titipan</label>
                  <input
                    type="number"
                    min="0"
                    value={form.startingStock}
                    onChange={(e) => set("startingStock", e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Margin</label>
                  <div className="mt-1 flex gap-1">
                    <select
                      value={form.marginType}
                      onChange={(e) =>
                        set(
                          "marginType",
                          e.target.value as "PERCENT" | "FIXED",
                        )
                      }
                      className="w-1/2 rounded-lg border bg-background px-2 py-2 text-sm"
                    >
                      <option value="PERCENT">% persen</option>
                      <option value="FIXED">Rp tetap</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={form.marginValue}
                      onChange={(e) => set("marginValue", e.target.value)}
                      className="w-1/2 rounded-lg border bg-background px-2 py-2 text-sm text-right"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium">
                    Harga jual (otomatis)
                  </label>
                  <input
                    value={fmt(agreed)}
                    readOnly
                    className="mt-1 w-full rounded-lg border bg-muted px-3 py-2 text-sm font-semibold text-emerald-700"
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={busy || !valid}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <PackagePlus size={14} />
            )}
            Simpan {kind === "pondok" ? "Barang Pondok" : "Barang Titipan"}
          </button>
        </form>
      )}
    </main>
  );
}

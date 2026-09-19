"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Save, Upload, X } from "lucide-react";
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

interface CreateForm {
  type: "INCOME" | "EXPENSE";
  amount: string;
  description: string;
  reference: string;
  unitId: string;
  categoryId: string;
  date: string;
  photoUrl: string;
  photoFile: File | null;
}

/** Sentinel yang dipakai Pimpinan untuk mencatat transaksi level lembaga (bukan unit). */
const LEMBAGA_SENTINEL = "__LEMBAGA__";

export default function CreateTransactionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;
  const userUnitId = session?.user?.unitId as string | undefined;

  const isPimpinan = role === "PIMPINAN";

  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CreateForm>({
    type: "INCOME",
    amount: "",
    description: "",
    reference: "",
    unitId: "",
    categoryId: "",
    date: new Date().toISOString().split("T")[0],
    photoUrl: "",
    photoFile: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/units", {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setUnits(data.data ?? []);
      // Auto-select unit for MANAGER/STAFF (single-unit users)
      if (role && (role === "MANAGER" || role === "STAFF") && userUnitId) {
        setForm((prevForm) => ({ ...prevForm, unitId: userUnitId }));
      }
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/financial-categories", {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setCategories(data.data ?? []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchUnits();
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isLembagaTx = isPimpinan && form.unitId === LEMBAGA_SENTINEL;
    if (!form.amount || !form.description || (!form.unitId && !isLembagaTx)) {
      toast.error("Harap isi semua field yang wajib");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("type", form.type);
      formData.append("amount", parseFloat(form.amount).toString());
      formData.append("description", form.description);
      formData.append("reference", form.reference);
      formData.append("unitId", isLembagaTx ? LEMBAGA_SENTINEL : form.unitId);
      formData.append("categoryId", form.categoryId);
      formData.append("date", form.date);
      if (form.photoFile) {
        formData.append("photo", form.photoFile);
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal membuat transaksi");
      }

      const result = await res.json();
      toast.success(
        result.data?.status === "APPROVED"
          ? "Transaksi lembaga tercatat & langsung disetujui"
          : "Transaksi tersimpan, menunggu persetujuan",
      );
      router.push("/dashboard/transactions");
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat transaksi");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, photoFile: file });
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setForm({ ...form, photoFile: null, photoUrl: "" });
    setPreview(null);
  };

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
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Buat Transaksi Baru
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Formulir transaksi keuangan baru
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Jenis Transaksi
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="INCOME"
                  checked={form.type === "INCOME"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as "INCOME" | "EXPENSE",
                    })
                  }
                  className="h-4 w-4 border-border text-primary focus:ring-primary/20"
                />
                <span className="font-medium text-emerald-600">Pemasukan</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="EXPENSE"
                  checked={form.type === "EXPENSE"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as "INCOME" | "EXPENSE",
                    })
                  }
                  className="h-4 w-4 border-border text-primary focus:ring-primary/20"
                />
                <span className="font-medium text-red-600">Pengeluaran</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Jumlah (IDR)
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="0"
                required
                min="0"
                step="any"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Tanggal
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Deskripsi
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Deskripsi transaksi"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Referensi (opsional)
            </label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="No. referensi / bukti transfer"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Unit
              </label>
              <select
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                disabled={role === "MANAGER" || role === "STAFF"}
                className={`w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 ${
                  role === "MANAGER" || role === "STAFF"
                    ? "cursor-default bg-muted text-muted-foreground"
                    : ""
                }`}
                required
              >
                {isPimpinan && (
                  <option value={LEMBAGA_SENTINEL}>
                    🏛️ Transaksi Lembaga (non-unit)
                  </option>
                )}
                <option value="">Pilih Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Kategori
              </label>
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="">Pilih Kategori</option>
                {categories
                  .filter((cat) => cat.type === form.type)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.code})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Foto Nota / Bukti
            </label>
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 transition hover:border-primary/50">
                <Upload size={18} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {form.photoFile ? form.photoFile.name : "Pilih file"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
              {preview && (
                <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-muted">
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute right-1 top-1 rounded-full bg-slate-800/70 p-1 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Bisa ambil foto langsung atau pilih dari galeri. Format: JPG, PNG
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            {role === "STAFF" && (
              <>
                📋 Transaksi akan <b>menunggu persetujuan Manager</b> unit Anda
                sebelum terhitung di laporan.
              </>
            )}
            {role === "MANAGER" && (
              <>
                📋 Transaksi unit akan <b>menunggu persetujuan Pimpinan</b>{" "}
                lembaga sebelum terhitung di laporan.
              </>
            )}
            {isPimpinan && (
              <>
                ✅ Sebagai Pimpinan: transaksi lembaga/unit yang Anda catat{" "}
                <b>langsung tercatat resmi</b>. Transaksi Manager unit perlu
                persetujuan Anda di menu <b>Persetujuan</b>.
              </>
            )}
            {role === "SUPERADMIN" && (
              <>
                ✅ Sebagai Superadmin, transaksi yang Anda catat{" "}
                <b>langsung disetujui</b>.
              </>
            )}
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
              disabled={
                submitting ||
                !form.amount ||
                !form.description ||
                (!form.unitId && !isPimpinan)
              }
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-current"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Simpan Transaksi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

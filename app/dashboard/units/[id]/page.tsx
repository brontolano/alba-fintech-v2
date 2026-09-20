"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Save,
  Building,
  Tag,
  FileText,
  LayoutDashboard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";
import { buildCashbookEntries } from "@/lib/modules/ledger/ledger";

interface UnitType {
  value: string;
  label: string;
}

const unitTypes: UnitType[] = [
  { value: "KPAK", label: "KPAK (Kantor Pelayanan Administrasi Keuangan)" },
  { value: "KOPERASI", label: "Koperasi" },
  { value: "KANTIN", label: "Kantin" },
  { value: "UMUM", label: "Umum" },
];

interface EditForm {
  name: string;
  code: string;
  description: string;
  type: "KPAK" | "KOPERASI" | "KANTIN" | "UMUM";
  isRetail: boolean;
  isActive: boolean;
  lembagaId: string;
  parentId: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditUnitPage({ params }: Props) {
  const router = useRouter();
  const unitId = use(params).id;
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;

  const [lembihs, setLembihs] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [units, setUnits] = useState<
    Array<{ id: string; name: string; type: string }>
  >([]);
  const [form, setForm] = useState<EditForm>({
    name: "",
    code: "",
    description: "",
    type: "UMUM",
    isRetail: false,
    isActive: true,
    lembagaId: "",
    parentId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ledgerRows, setLedgerRows] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  // Check authorization
  useEffect(() => {
    if (role && role !== "SUPERADMIN") {
      toast.error("Akses ditolak. Hanya SuperAdmin yang dapat mengedit unit.");
      router.push("/dashboard/units");
    }
  }, [role, router]);

  // Fetch unit detail
  const fetchUnit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/units/${unitId}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Status ${res.status}: ${text.substring(0, 100)}`);
      }
      if (!res.ok) throw new Error(data.error || "Unit tidak ditemukan");
      const unit = data.data;
      setForm({
        name: unit.name || "",
        code: unit.code || "",
        description: unit.description || "",
        type: unit.type || "UMUM",
        isRetail: unit.isRetail ?? false,
        isActive: unit.isActive ?? true,
        lembagaId: unit.lembagaId || "",
        parentId: unit.parentId || "",
      });
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat unit");
      router.push("/dashboard/units");
    } finally {
      setLoading(false);
    }
  };

  // Fetch lembihs for dropdown
  const fetchLembihs = async () => {
    try {
      const res = await fetch("/api/lembaga", {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      setLembihs(data.data ?? []);
    } catch (err) {
      console.error("Error fetching lembihs:", err);
    }
  };

  // Fetch existing units for parent selection
  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/units", {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  };

  const fetchLedger = async () => {
    if (!unitId) return;
    setLedgerLoading(true);
    try {
      const res = await fetch(
        `/api/transactions?unitId=${encodeURIComponent(unitId)}&status=APPROVED&limit=200`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memuat buku kas unit");
      }
      const result = await res.json();
      const entries = buildCashbookEntries(
        (result.data ?? []).map((tx: any) => ({
          id: tx.id,
          date: tx.date,
          type: tx.type,
          amount: Number(tx.amount ?? 0),
          description: tx.description || tx.reference || "Transaksi",
          reference: tx.reference,
          unitName: tx.unitName || null,
          categoryName: tx.categoryName || null,
        })),
      );
      setLedgerRows(entries);
    } catch (error) {
      console.error("Error fetching unit ledger:", error);
      setLedgerRows([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    fetchUnit();
    fetchLembihs();
    fetchUnits();
    fetchLedger();
  }, [unitId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.lembagaId) {
      toast.error("Harap isi semua field yang wajib");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/units/${unitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memperbarui unit");
      }

      toast.success("Unit berhasil diperbarui");
      router.push("/dashboard/units");
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui unit");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const ledgerSummary = ledgerRows.reduce(
    (acc, row) => {
      acc.debit += row.debit;
      acc.credit += row.credit;
      return acc;
    },
    { debit: 0, credit: 0 },
  );

  const currentBalance = ledgerRows.at(-1)?.balance ?? 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/units")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Edit Unit
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Memuat data unit...
            </p>
          </div>
        </div>
        <div className="rounded-[22px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-muted"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/units")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Edit Unit
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Perbarui informasi unit: {form.name}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-[22px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Nama Unit *
            </label>
            <div className="relative">
              <Building
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pl-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="Misal: Kantin Umi"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Kode Unit *
            </label>
            <div className="relative">
              <Tag
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pl-10 text-sm uppercase text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="Kode unit"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Lembaga *
            </label>
            <select
              value={form.lembagaId}
              onChange={(e) => setForm({ ...form, lembagaId: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              required
            >
              <option value="">Pilih Lembaga</option>
              {lembihs.map((lembih) => (
                <option key={lembih.id} value={lembih.id}>
                  {lembih.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Jenis Unit *
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as any })
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {unitTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3 pt-6">
            <input
              type="checkbox"
              id="isRetail"
              checked={form.isRetail}
              onChange={(e) => setForm({ ...form, isRetail: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <label htmlFor="isRetail" className="text-sm text-muted-foreground">
              Unit Retail (dengan inventory & POS)
            </label>
          </div>

          <div className="flex items-center space-x-3 pt-6">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <label htmlFor="isActive" className="text-sm text-muted-foreground">
              Unit aktif
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Unit Induk (Opsional)
            </label>
            <select
              value={form.parentId}
              onChange={(e) =>
                setForm({ ...form, parentId: e.target.value || "" })
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="">Tidak ada induk (unit mandiri)</option>
              {units
                .filter((u) => u.id !== unitId && u.type !== form.type)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.type})
                  </option>
                ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Deskripsi (opsional)
            </label>
            <div className="relative">
              <FileText
                className="absolute left-3 top-3 text-muted-foreground"
                size={16}
              />
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 pl-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                rows={3}
                placeholder="Deskripsi unit"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard/units")}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || !form.name || !form.code}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Save size={16} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </form>

      <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Buku Kas Unit</h2>
            <p className="text-sm text-muted-foreground">
              Saldo berjalan berdasarkan transaksi yang sudah disetujui.
            </p>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            Saldo saat ini: {formatCurrency(currentBalance)}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
              <ArrowUpRight size={14} /> Debet
            </div>
            <div className="mt-2 text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(ledgerSummary.debit)}
            </div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-300">
              <ArrowDownRight size={14} /> Kredit
            </div>
            <div className="mt-2 text-xl font-bold text-rose-700 dark:text-rose-300">
              {formatCurrency(ledgerSummary.credit)}
            </div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-500/20 dark:bg-sky-500/5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
              <Wallet size={14} /> Saldo
            </div>
            <div className="mt-2 text-xl font-bold text-sky-700 dark:text-sky-300">
              {formatCurrency(currentBalance)}
            </div>
          </div>
        </div>

        {ledgerLoading ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
            Memuat buku kas unit...
          </div>
        ) : ledgerRows.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
            Belum ada transaksi yang disetujui untuk unit ini.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Tanggal</th>
                  <th className="px-3 py-2 font-semibold">Keterangan</th>
                  <th className="px-3 py-2 font-semibold text-right">Debet</th>
                  <th className="px-3 py-2 font-semibold text-right">Kredit</th>
                  <th className="px-3 py-2 font-semibold text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2.5 align-top text-foreground">
                      {row.date
                        ? new Date(row.date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="px-3 py-2.5 align-top text-foreground">
                      <div className="font-medium">{row.description}</div>
                      {row.reference && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Ref: {row.reference}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top font-medium text-emerald-600 dark:text-emerald-400">
                      {row.debit > 0 ? formatCurrency(row.debit) : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top font-medium text-rose-600 dark:text-rose-400">
                      {row.credit > 0 ? formatCurrency(row.credit) : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top font-semibold text-foreground">
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

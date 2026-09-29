"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { usePageGuard } from "@/lib/use-page-guard";
import { Plus, Trash2, Wallet } from "lucide-react";

interface Unit {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
}

interface Allocation {
  id: string;
  categoryId: string;
  periodType: string;
  period: string;
  title: string | null;
  amount: number | string;
  used: number;
  remaining: number;
  source: string | null;
  note: string | null;
  rangeStart: string;
  rangeEnd: string;
  category: { id: string; name: string; code: string } | null;
  creator: { id: string; name: string } | null;
}

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function BudgetPage() {
  usePageGuard(["SUPERADMIN", "PIMPINAN"]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [unitId, setUnitId] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Form alokasi baru
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    categoryId: "",
    periodType: "MONTHLY",
    date: new Date().toISOString().slice(0, 10),
    month: currentMonth(),
    amount: "",
    source: "LEMBAGA",
    note: "",
  });

  const monthBounds = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    const last = new Date(y, mo, 0).getDate();
    return { from: `${m}-01`, to: `${m}-${String(last).padStart(2, "0")}` };
  };

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch("/api/units");
      if (!res.ok) return;
      const data = await res.json();
      const list: Unit[] = (data.data ?? []).filter(
        (u: Unit) => !u.name.endsWith("(Lembaga)"),
      );
      setUnits(list);
      if (!unitId && list.length > 0) setUnitId(list[0].id);
    } catch {
      // abaikan
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/financial-categories?type=EXPENSE");
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.data ?? []);
    } catch {
      // abaikan
    }
  }, []);

  const fetchAllocations = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try {
      const { from, to } = monthBounds(month);
      const res = await fetch(
        `/api/kpak/allocations?unitId=${unitId}&from=${from}&to=${to}`,
      );
      if (!res.ok) throw new Error("Gagal memuat anggaran");
      const data = await res.json();
      setAllocations(data.data?.allocations ?? []);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat anggaran");
    } finally {
      setLoading(false);
    }
  }, [unitId, month]);

  useEffect(() => {
    fetchUnits();
    fetchCategories();
  }, [fetchUnits, fetchCategories]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const handleSave = async () => {
    const amount = Number(form.amount);
    if (!unitId || !form.categoryId || !amount || amount <= 0) {
      toast.error("Lengkapi unit, kategori, dan nominal");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        unitId,
        categoryId: form.categoryId,
        periodType: form.periodType,
        amount,
        source: form.source,
        note: form.note.trim() || undefined,
      };
      if (form.periodType === "DAILY") payload.date = form.date;
      if (form.periodType === "MONTHLY") payload.month = form.month;
      const res = await fetch("/api/kpak/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan alokasi");
      toast.success("Alokasi anggaran disimpan");
      setShowForm(false);
      setForm((p) => ({ ...p, amount: "", note: "", categoryId: "" }));
      fetchAllocations();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan alokasi");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus alokasi ini?")) return;
    try {
      const res = await fetch(`/api/kpak/allocations?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Alokasi dihapus");
      fetchAllocations();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus alokasi");
    }
  };

  const totalBudget = allocations.reduce((s, a) => s + Number(a.amount), 0);
  const totalUsed = allocations.reduce((s, a) => s + Number(a.used), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Anggaran Unit
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tetapkan pagu belanja per unit dan pantau realisasinya
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus size={16} />
          Alokasi Baru
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="rounded-full border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="">Pilih unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="rounded-full border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Pagu
          </p>
          <p className="mt-2 text-base font-bold text-foreground sm:text-xl">
            {fmtRp(totalBudget)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Terpakai
          </p>
          <p className="mt-2 text-base font-bold text-rose-600 sm:text-xl">
            {fmtRp(totalUsed)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Sisa
          </p>
          <p className="mt-2 text-base font-bold text-emerald-600 sm:text-xl">
            {fmtRp(totalBudget - totalUsed)}
          </p>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">
            Alokasi Baru
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Kategori belanja
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              >
                <option value="">Pilih kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Periode
              <select
                value={form.periodType}
                onChange={(e) =>
                  setForm({ ...form, periodType: e.target.value })
                }
                className="rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              >
                <option value="DAILY">Harian</option>
                <option value="MONTHLY">Bulanan</option>
              </select>
            </label>
            {form.periodType === "DAILY" ? (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Tanggal
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                />
              </label>
            ) : form.periodType === "MONTHLY" ? (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Bulan
                <input
                  type="month"
                  value={form.month}
                  onChange={(e) =>
                    e.target.value && setForm({ ...form, month: e.target.value })
                  }
                  className="rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Nominal (Rp)
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="cth: 500000"
                className="rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Sumber dana
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              >
                <option value="LEMBAGA">Kas Lembaga</option>
                <option value="KPAK">Kas Unit (KPAK)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
              Catatan (opsional)
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="cth: operasional bulan berjalan"
                className="rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Alokasi"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          Memuat anggaran...
        </div>
      ) : allocations.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          Belum ada alokasi untuk unit & bulan ini
        </div>
      ) : (
        <div className="space-y-3">
          {allocations.map((a) => {
            const budget = Number(a.amount);
            const used = Number(a.used);
            const pct = budget > 0 ? Math.min(100, (used / budget) * 100) : 0;
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {a.category?.name ?? "Kategori"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.periodType} · {fmtDate(a.rangeStart)} –{" "}
                        {fmtDate(a.rangeEnd)} · Sumber:{" "}
                        {a.source === "LEMBAGA" ? "Kas Lembaga" : "Kas Unit"}
                        {a.creator ? ` · oleh ${a.creator.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(a.id)}
                    title="Hapus alokasi"
                    className="rounded-full p-1.5 text-muted-foreground transition hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Pagu:{" "}
                    <span className="font-semibold text-foreground">
                      {fmtRp(budget)}
                    </span>
                  </span>
                  <span>
                    Terpakai:{" "}
                    <span className="font-semibold text-rose-600">
                      {fmtRp(used)}
                    </span>
                  </span>
                  <span>
                    Sisa:{" "}
                    <span className="font-semibold text-emerald-600">
                      {fmtRp(Number(a.remaining))}
                    </span>
                  </span>
                </div>
                {a.note && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Catatan: {a.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

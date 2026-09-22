"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Loader2, ClipboardList, CircleDashed, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { usePageGuard } from "@/lib/use-page-guard";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

interface Category {
  id: string;
  name: string;
  code: string;
  unitId?: string | null;
}

interface Submission {
  id: string;
  amount: number | string;
  description: string;
  reference?: string | null;
  date: string;
  status: string;
  category?: { name: string } | null;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={12} /> Disetujui
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400">
        <XCircle size={12} /> Ditolak
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
      <CircleDashed size={12} /> Menunggu pimpinan
    </span>
  );
}

export default function KpakBudgetPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      ((u?.role === "MANAGER" || u?.role === "STAFF") &&
        u?.unitIsRetail !== true),
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [catId, setCatId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: session } = useSession();
  const canSubmit =
    session?.user?.role === "SUPERADMIN" ||
    session?.user?.role === "PIMPINAN" ||
    session?.user?.role === "MANAGER";
  const canAllocate =
    session?.user?.role === "SUPERADMIN" ||
    session?.user?.role === "PIMPINAN";

  const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const [period, setPeriod] = useState(currentMonth());
  const [allocations, setAllocations] = useState<any[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocForm, setAllocForm] = useState({
    categoryId: "",
    amount: "",
    note: "",
  });
  const [allocSaving, setAllocSaving] = useState(false);

  const fetchAllocations = useCallback(async (p: string) => {
    setAllocLoading(true);
    try {
      const res = await fetch(`/api/kpak/allocations?period=${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat alokasi");
      setAllocations(json.data.allocations || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAllocLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllocations(period);
  }, [period, fetchAllocations]);

  const saveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = Number(allocForm.amount);
    if (!allocForm.categoryId || !nominal || nominal <= 0) {
      toast.error("Kategori dan nominal wajib diisi");
      return;
    }
    setAllocSaving(true);
    try {
      const res = await fetch("/api/kpak/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: allocForm.categoryId,
          period,
          amount: nominal,
          note: allocForm.note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan alokasi");
      toast.success("Alokasi anggaran ditetapkan");
      setAllocForm({ categoryId: "", amount: "", note: "" });
      fetchAllocations(period);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAllocSaving(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, txRes] = await Promise.all([
        fetch("/api/financial-categories?type=EXPENSE"),
        fetch("/api/transactions?type=EXPENSE&limit=30"),
      ]);
      if (catRes.ok) {
        const c = await catRes.json();
        // Hanya kategori unit — kategori lembaga khusus pimpinan
        const list: Category[] = (c.data || []).filter(
          (x: any) => x.isActive !== false && x.unitId,
        );
        setCategories(list);
        if (!catId && list.length > 0) setCatId(list[0].id);
      }
      if (txRes.ok) {
        const t = await txRes.json();
        const list: Submission[] = t.data || t.transactions || [];
        setSubmissions(list.filter((x) => (x.reference || "").startsWith("ANGGARAN:")));
      }
    } catch {
      toast.error("Gagal memuat data pengajuan");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = Number(amount);
    if (!catId) {
      toast.error("Pilih kategori anggaran");
      return;
    }
    if (!title.trim() || !nominal || nominal <= 0 || !reason.trim()) {
      toast.error("Judul, nominal, dan alasan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EXPENSE",
          amount: nominal,
          description: `${title.trim()} — ${reason.trim()}`,
          categoryId: catId,
          reference: `ANGGARAN:${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim pengajuan");
      toast.success(
        json.data?.status === "PENDING"
          ? "Pengajuan terkirim ke pimpinan"
          : "Pengajuan tercatat (otomatis disetujui)",
      );
      setTitle("");
      setAmount("");
      setReason("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pengajuan Anggaran</h1>
          <p className="text-sm text-muted-foreground">
            Ajukan kebutuhan dana ke pimpinan — diproses di halaman Pengajuan
          </p>
        </div>
        <Link
          href="/dashboard/approvals"
          className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          <ClipboardList size={16} /> Lihat Pengajuan
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        {!canSubmit && (
          <div className="rounded-xl border border-dashed bg-card p-6 text-sm">
            <p className="font-semibold">Pengajuan dibuat oleh Manager unit</p>
            <p className="mt-1 text-muted-foreground">
              Sampaikan kebutuhan dana ke Manager — pengajuan diteruskan ke
              pimpinan dan statusnya bisa dipantau di daftar sebelah.
            </p>
          </div>
        )}
        {canSubmit && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-card p-5"
        >
          <h2 className="text-sm font-semibold">Form Pengajuan Baru</h2>
          <div>
            <label className="mb-1 block text-xs font-medium">
              Kategori Anggaran
            </label>
            <select
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              Judul Pengajuan
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pengadaan ATK semester ganjil"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              Nominal Diajukan (Rp)
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 1500000"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              Alasan / Rincian Kebutuhan
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan rincian kebutuhan dananya untuk apa..."
              rows={4}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm"
            />
          </div>
          <button
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {saving ? "Mengirim..." : "Kirim ke Pimpinan"}
          </button>
        </form>
        )}

        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Status Pengajuan Unit</h2>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              <Loader2 size={16} className="mx-auto mb-1 animate-spin" />
              Memuat...
            </p>
          ) : submissions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada pengajuan anggaran
            </p>
          ) : (
            <div className="space-y-3">
              {submissions.map((s) => (
                <div key={s.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{s.description}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.category?.name || ""} ·{" "}
                    {new Date(s.date).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(Number(s.amount))}
                  </p>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>

      {/* ── Alokasi Anggaran (rapat manager–pimpinan) ── */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            Alokasi Anggaran per Kategori
          </h2>
          <input
            type="month"
            value={period}
            onChange={(e) => e.target.value && setPeriod(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        {canAllocate && (
          <form
            onSubmit={saveAllocation}
            className="mb-4 grid gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-[1fr_140px_1fr_auto]"
          >
            <select
              value={allocForm.categoryId}
              onChange={(e) =>
                setAllocForm({ ...allocForm, categoryId: e.target.value })
              }
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Pilih kategori...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={allocForm.amount}
              onChange={(e) =>
                setAllocForm({ ...allocForm, amount: e.target.value })
              }
              placeholder="Nominal (Rp)"
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input
              value={allocForm.note}
              onChange={(e) =>
                setAllocForm({ ...allocForm, note: e.target.value })
              }
              placeholder="Catatan (opsional)"
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <button
              disabled={allocSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {allocSaving ? "..." : "Tetapkan"}
            </button>
          </form>
        )}
        {allocLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="mx-auto animate-spin" />
          </p>
        ) : allocations.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Belum ada alokasi periode ini
            {canAllocate ? " — tetapkan lewat form di atas." : "."}
          </p>
        ) : (
          <div className="space-y-3">
            {allocations.map((a) => {
              const total = Number(a.amount || 0);
              const used = Number(a.used || 0);
              const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
              return (
                <div key={a.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{a.category?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(used)} / {formatCurrency(total)}
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sisa {formatCurrency(Number(a.remaining || 0))}
                    {a.note ? ` · ${a.note}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

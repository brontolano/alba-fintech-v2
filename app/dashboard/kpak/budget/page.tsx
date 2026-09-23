"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
      (u?.role === "MANAGER" && u?.unitIsRetail !== true),
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
  const canSeed =
    session?.user?.role === "SUPERADMIN" ||
    session?.user?.role === "PIMPINAN" ||
    session?.user?.role === "MANAGER";
  const [seeding, setSeeding] = useState(false);

  const seedDefaultCategories = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/financial-categories/seed-kpak", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat kategori");
      toast.success(
        json.data?.created > 0
          ? `${json.data.created} kategori bawaan dibuat`
          : "Kategori bawaan sudah ada",
      );
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSeeding(false);
    }
  };

  const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  type AllocType = "DAILY" | "WEEKLY" | "MONTHLY" | "AGENDA";
  const [allocType, setAllocType] = useState<AllocType>("MONTHLY");
  const [viewMonth, setViewMonth] = useState(currentMonth());
  const [allocations, setAllocations] = useState<any[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocForm, setAllocForm] = useState({
    categoryId: "",
    amount: "",
    note: "",
    date: "",
    week: "",
    month: "",
    title: "",
    startDate: "",
    endDate: "",
    source: "KPAK",
  });
  const [allocSaving, setAllocSaving] = useState(false);

  const viewRange = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    const last = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
    return { from: `${m}-01`, to: last };
  };

  const fetchAllocations = useCallback(async (m: string) => {
    setAllocLoading(true);
    try {
      const { from, to } = viewRange(m);
      const res = await fetch(`/api/kpak/allocations?from=${from}&to=${to}`);
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
    fetchAllocations(viewMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth, fetchAllocations]);

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
          periodType: allocType,
          date: allocForm.date || undefined,
          week: allocForm.week || undefined,
          month: allocForm.month || undefined,
          title: allocForm.title.trim() || undefined,
          startDate: allocForm.startDate || undefined,
          endDate: allocForm.endDate || undefined,
          amount: nominal,
          note: allocForm.note.trim() || undefined,
          source: allocForm.source,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan alokasi");
      toast.success("Alokasi anggaran ditetapkan");
      setAllocForm({
        categoryId: "",
        amount: "",
        note: "",
        date: "",
        week: "",
        month: "",
        title: "",
        startDate: "",
        endDate: "",
        source: "KPAK",
      });
      fetchAllocations(viewMonth);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAllocSaving(false);
    }
  };

  const deleteAllocation = async (id: string) => {
    try {
      const res = await fetch(`/api/kpak/allocations?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus");
      toast.success("Alokasi dihapus");
      fetchAllocations(viewMonth);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Sisa alokasi kategori terpilih (berlaku hari ini) untuk acuan pengajuan
  const selectedAlloc = allocations.find((a) => a.categoryId === catId);
  const allocRemaining =
    selectedAlloc != null ? Number(selectedAlloc.remaining || 0) : null;
  const overBudget =
    allocRemaining != null && Number(amount) > 0 && Number(amount) > allocRemaining;

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

  // Auto-seed sekali bila kategori kosong (penyebab umum "tidak bisa mengajukan")
  const seedTried = useRef(false);
  useEffect(() => {
    if (
      !loading &&
      categories.length === 0 &&
      canSeed &&
      !seedTried.current
    ) {
      seedTried.current = true;
      seedDefaultCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, categories, canSeed]);

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
      // Endpoint khusus: selalu masuk antrean persetujuan pimpinan
      const res = await fetch("/api/kpak/budget-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: catId,
          amount: nominal,
          title: title.trim(),
          reason: reason.trim(),
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
            {categories.length === 0 && !loading ? (
              <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                Belum ada kategori anggaran.
                {canSeed ? (
                  <button
                    type="button"
                    onClick={seedDefaultCategories}
                    disabled={seeding}
                    className="mx-auto mt-2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {seeding ? "Membuat..." : "Buat Kategori Bawaan KPAK"}
                  </button>
                ) : (
                  <p className="mt-1">Hubungi Manager.</p>
                )}
              </div>
            ) : (
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
            )}
            {allocRemaining != null && (
              <p
                className={`mt-1 text-xs ${overBudget ? "font-medium text-amber-600" : "text-muted-foreground"}`}
              >
                Sisa alokasi berlaku: {formatCurrency(allocRemaining)}
                {overBudget
                  ? " — nominal melebihi sisa, keputusan pimpinan"
                  : ""}
              </p>
            )}
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

      {/* ── Alokasi Anggaran (harian/mingguan/bulanan/agenda) ── */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Alokasi Anggaran</h2>
          <input
            type="month"
            value={viewMonth}
            onChange={(e) => e.target.value && setViewMonth(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        {canAllocate && (
          <form onSubmit={saveAllocation} className="mb-4 space-y-2 rounded-lg bg-muted/50 p-3">
            <div className="flex gap-1">
              {(
                [
                  ["DAILY", "Harian"],
                  ["WEEKLY", "Mingguan"],
                  ["MONTHLY", "Bulanan"],
                  ["AGENDA", "Agenda"],
                ] as [AllocType, string][]
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAllocType(v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    allocType === v
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
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
            <div className="grid gap-2 sm:grid-cols-2">
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
              <div
                role="group"
                aria-label="Sumber dana"
                className="grid grid-cols-2 gap-1 rounded-lg border bg-background p-1"
              >
                {(
                  [
                    ["KPAK", "Kas KPAK"],
                    ["LEMBAGA", "Kas Lembaga"],
                  ] as [string, string][]
                ).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAllocForm({ ...allocForm, source: v })}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium ${
                      allocForm.source === v
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {allocType === "DAILY" && (
                <input
                  type="date"
                  value={allocForm.date}
                  onChange={(e) =>
                    setAllocForm({ ...allocForm, date: e.target.value })
                  }
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                />
              )}
              {allocType === "WEEKLY" && (
                <input
                  type="week"
                  value={allocForm.week}
                  onChange={(e) =>
                    setAllocForm({ ...allocForm, week: e.target.value })
                  }
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                />
              )}
              {allocType === "MONTHLY" && (
                <input
                  type="month"
                  value={allocForm.month}
                  onChange={(e) =>
                    setAllocForm({ ...allocForm, month: e.target.value })
                  }
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                />
              )}
              {allocType === "AGENDA" && (
                <>
                  <input
                    value={allocForm.title}
                    onChange={(e) =>
                      setAllocForm({ ...allocForm, title: e.target.value })
                    }
                    placeholder="Nama agenda (mis. Maulid, Renovasi)"
                    className="rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={allocForm.startDate}
                      onChange={(e) =>
                        setAllocForm({ ...allocForm, startDate: e.target.value })
                      }
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      value={allocForm.endDate}
                      onChange={(e) =>
                        setAllocForm({ ...allocForm, endDate: e.target.value })
                      }
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
              <input
                value={allocForm.note}
                onChange={(e) =>
                  setAllocForm({ ...allocForm, note: e.target.value })
                }
                placeholder="Catatan (opsional)"
                className="rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              disabled={allocSaving}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {allocSaving ? "Menyimpan..." : "Tetapkan Alokasi"}
            </button>
          </form>
        )}
        {allocLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="mx-auto animate-spin" />
          </p>
        ) : allocations.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Belum ada alokasi pada bulan ini
            {canAllocate ? " — tetapkan lewat form di atas." : "."}
          </p>
        ) : (
          <div className="space-y-3">
            {allocations.map((a) => {
              const total = Number(a.amount || 0);
              const used = Number(a.used || 0);
              const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
              const typeLabel =
                a.periodType === "DAILY"
                  ? "Harian"
                  : a.periodType === "WEEKLY"
                    ? "Mingguan"
                    : a.periodType === "AGENDA"
                      ? "Agenda"
                      : "Bulanan";
              const rangeLabel = a.title
                ? a.title
                : `${new Date(a.rangeStart).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} – ${new Date(a.rangeEnd).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`;
              return (
                <div key={a.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {a.category?.name}{" "}
                      <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {typeLabel}
                      </span>{" "}
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          (a.source || "KPAK") === "LEMBAGA"
                            ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {(a.source || "KPAK") === "LEMBAGA" ? "Kas Lembaga" : "Kas KPAK"}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(used)} / {formatCurrency(total)}
                      </p>
                      {canAllocate && (
                        <button
                          onClick={() => deleteAllocation(a.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rangeLabel} · Sisa {formatCurrency(Number(a.remaining || 0))}
                    {a.note && !a.title ? ` · ${a.note}` : ""}
                    {a.note && a.title ? ` · ${a.note}` : ""}
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

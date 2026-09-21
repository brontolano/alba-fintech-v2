"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Wallet,
  UserPlus,
  Search,
  ChevronDown,
  X,
  Save,
  CreditCard,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { usePageGuard } from "@/lib/use-page-guard";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

interface StudentAccount {
  id: string;
  balance: number | string;
  status: string;
}

interface Student {
  id: string;
  studentNumber: string;
  name: string;
  className?: string | null;
  cardUid?: string | null;
  isActive?: boolean | null;
  account?: StudentAccount | null;
  createdAt?: string;
}

interface Mutation {
  id: string;
  type: string;
  amount: number | string;
  balanceBefore: number | string;
  balanceAfter: number | string;
  description?: string | null;
  reference?: string | null;
  createdAt: string;
}

export default function KpakStudentsPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      ((u?.role === "MANAGER" || u?.role === "STAFF") &&
        u?.unitIsRetail !== true),
  });

  const { data: session } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState({ total: 0, totalBalance: 0 });

  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<Student | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    className: "",
    cardUid: "",
  });
  const [saving, setSaving] = useState(false);

  // Mutations
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [mutationsLoading, setMutationsLoading] = useState(false);

  // Add form
  const [addForm, setAddForm] = useState({
    studentNumber: "",
    name: "",
    className: "",
    cardUid: "",
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/savings/students?${params}`);
      if (!res.ok) throw new Error("Gagal memuat data");
      const json = await res.json();
      const list = json.data || [];
      setStudents(list);
      setSummary({
        total: list.length,
        totalBalance: list.reduce(
          (sum: number, s: Student) =>
            sum + Number(s.account?.balance || 0),
          0,
        ),
      });
    } catch {
      toast.error("Gagal memuat data santri");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleAdd = async () => {
    if (!addForm.studentNumber.trim() || !addForm.name.trim()) {
      toast.error("NIS dan Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/savings/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: addForm.studentNumber.trim(),
          name: addForm.name.trim(),
          className: addForm.className.trim() || undefined,
          cardUid: addForm.cardUid.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mendaftarkan santri");
      }
      toast.success("Santri berhasil didaftarkan");
      setShowAdd(false);
      setAddForm({ studentNumber: "", name: "", className: "", cardUid: "" });
      fetchStudents();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!showDetail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/savings/students/${showDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editData.name.trim(),
          className: editData.className.trim() || null,
          cardUid: editData.cardUid.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengupdate");
      }
      toast.success("Data santri diperbarui");
      setEditMode(false);
      fetchStudents();
      // Refresh detail
      const updated = await res.json();
      setShowDetail({ ...showDetail, ...updated.data });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (student: Student) => {
    setShowDetail(student);
    setEditMode(false);
    setEditData({
      name: student.name,
      className: student.className || "",
      cardUid: student.cardUid || "",
    });
    // Fetch mutations
    setMutationsLoading(true);
    try {
      const res = await fetch(
        `/api/savings/lookup?studentNumber=${encodeURIComponent(student.studentNumber)}`,
      );
      if (res.ok) {
        const json = await res.json();
        setMutations(json.data?.account?.transactions || []);
      }
    } catch {
      // silent
    } finally {
      setMutationsLoading(false);
    }
  };

  const role = session?.user?.role;
  const canEdit =
    role === "SUPERADMIN" || role === "PIMPINAN" || role === "MANAGER";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Santri</h1>
          <p className="text-sm text-muted-foreground">
            {canEdit
              ? "Kelola data santri dan rekening tabungan"
              : "Daftarkan santri baru — ubah data oleh Manager unit"}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus size={16} />
          Santri Baru
        </button>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2.5">
              <Users size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Santri</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <Wallet
                size={20}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total Saldo Tabungan
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.totalBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Cari NIS, nama, atau UID NFC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-card pl-9 pr-4 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">NIS</th>
              <th className="px-4 py-3 text-left font-medium">Nama</th>
              <th className="px-4 py-3 text-left font-medium">Kelas</th>
              <th className="px-4 py-3 text-left font-medium">UID NFC</th>
              <th className="px-4 py-3 text-right font-medium">Saldo</th>
              <th className="px-4 py-3 text-center font-medium">Rincian</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
                  Memuat data...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <AlertCircle size={20} className="mx-auto mb-2" />
                  {search
                    ? "Tidak ada santri yang cocok"
                    : "Belum ada data santri. Klik &quot;Santri Baru&quot; untuk mendaftarkan."}
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr
                  key={s.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {s.studentNumber}
                  </td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.className || "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {s.cardUid || "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(Number(s.account?.balance || 0))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openDetail(s)}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      Rincian
                      <ChevronDown size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Santri Baru</h2>
              <button onClick={() => setShowAdd(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">
                  Nomor Induk Santri (NIS) *
                </label>
                <input
                  type="text"
                  value={addForm.studentNumber}
                  onChange={(e) =>
                    setAddForm({ ...addForm, studentNumber: e.target.value })
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="Contoh: 2024001"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Nama *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="Nama lengkap santri"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Kelas</label>
                <input
                  type="text"
                  value={addForm.className}
                  onChange={(e) =>
                    setAddForm({ ...addForm, className: e.target.value })
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="Contoh: VII-A"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  UID Kartu NFC
                </label>
                <input
                  type="text"
                  value={addForm.cardUid}
                  onChange={(e) =>
                    setAddForm({ ...addForm, cardUid: e.target.value })
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
                  placeholder="Contoh: AB:CD:EF:12"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Rincian Santri</h2>
              <button onClick={() => setShowDetail(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Identity Section */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Identitas Santri</h3>
                {canEdit ? (
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="text-xs text-primary hover:underline"
                  >
                    {editMode ? "Batal" : "Edit"}
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Ubah data oleh Manager
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">NIS</p>
                  <p className="font-mono">{showDetail.studentNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Kelas</p>
                  {editMode ? (
                    <input
                      type="text"
                      value={editData.className}
                      onChange={(e) =>
                        setEditData({ ...editData, className: e.target.value })
                      }
                      className="w-full rounded border bg-background px-2 py-1 text-sm"
                    />
                  ) : (
                    <p>{showDetail.className || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Nama</p>
                  {editMode ? (
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                      className="w-full rounded border bg-background px-2 py-1 text-sm"
                    />
                  ) : (
                    <p className="font-medium">{showDetail.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">UID NFC</p>
                  {editMode ? (
                    <input
                      type="text"
                      value={editData.cardUid}
                      onChange={(e) =>
                        setEditData({ ...editData, cardUid: e.target.value })
                      }
                      className="w-full rounded border bg-background px-2 py-1 text-sm font-mono"
                      placeholder="Kosongkan jika belum ada"
                    />
                  ) : (
                    <p className="font-mono text-xs">
                      {showDetail.cardUid || (
                        <span className="text-muted-foreground">Belum diisi</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {editMode && (
                <button
                  onClick={handleEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Simpan Perubahan
                </button>
              )}
            </div>

            {/* Balance Section */}
            <div className="mt-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-primary" />
                <h3 className="text-sm font-semibold">Saldo Tabungan</h3>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {formatCurrency(Number(showDetail.account?.balance || 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                Status:{" "}
                <span
                  className={
                    showDetail.account?.status === "ACTIVE"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }
                >
                  {showDetail.account?.status === "ACTIVE"
                    ? "Aktif"
                    : "Nonaktif"}
                </span>
              </p>
            </div>

            {/* Mutations Section */}
            <div className="mt-4 rounded-lg border p-4">
              <h3 className="text-sm font-semibold mb-3">Riwayat Mutasi</h3>
              {mutationsLoading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <Loader2 size={16} className="mx-auto mb-1 animate-spin" />
                  Memuat mutasi...
                </div>
              ) : mutations.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Belum ada mutasi
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {mutations.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {m.type === "DEPOSIT" ? (
                          <ArrowDownRight
                            size={14}
                            className="text-emerald-600"
                          />
                        ) : (
                          <ArrowUpRight size={14} className="text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">
                            {m.type === "DEPOSIT" ? "Setoran" : "Penarikan"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(m.createdAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {m.description && (
                            <p className="text-xs text-muted-foreground">
                              {m.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={
                            m.type === "DEPOSIT"
                              ? "text-emerald-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {m.type === "DEPOSIT" ? "+" : "-"}
                          {formatCurrency(Number(m.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Saldo: {formatCurrency(Number(m.balanceAfter))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

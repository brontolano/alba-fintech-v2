"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Plus,
  Send,
  Save,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Lembaga {
  id: string;
  name: string;
  code: string;
}

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  isDraft: boolean;
  isSent: boolean;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  lembagas?: { id: string; name: string; code: string } | null;
  users?: { id: string; name: string; email: string } | null;
  _count?: { broadcast_recipients: number };
}

const TYPE_OPTIONS = [
  { value: "INFO", label: "Info", icon: Info, color: "text-blue-500" },
  {
    value: "WARNING",
    label: "Peringatan",
    icon: AlertCircle,
    color: "text-amber-500",
  },
  {
    value: "SUCCESS",
    label: "Sukses",
    icon: CheckCircle,
    color: "text-green-500",
  },
  { value: "ERROR", label: "Error", icon: XCircle, color: "text-red-500" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Rendah" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "Tinggi" },
  { value: "URGENT", label: "Mendesak" },
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft", icon: Clock, color: "text-slate-500" },
  { value: "PENDING", label: "Pending", icon: Clock, color: "text-amber-500" },
  {
    value: "SENT",
    label: "Terkirim",
    icon: CheckCircle,
    color: "text-green-500",
  },
  { value: "FAILED", label: "Gagal", icon: XCircle, color: "text-red-500" },
];

import { usePageGuard } from "@/lib/use-page-guard";

export default function AnnouncementsPage() {
  usePageGuard(["SUPERADMIN", "PIMPINAN"]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [lembagas, setLembagas] = useState<Lembaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "INFO",
    priority: "NORMAL",
    lembagaId: "",
    isSent: false,
  });

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/broadcast", {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Gagal memuat broadcast");
      const data = await res.json();
      setBroadcasts(data.data ?? []);
    } catch (err) {
      console.error("Error fetching broadcasts:", err);
      toast.error("Gagal memuat pengumuman");
    } finally {
      setLoading(false);
    }
  };

  const fetchLembagas = async () => {
    try {
      const res = await fetch("/api/lembaga", {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Gagal memuat lembaga");
      const data = await res.json();
      setLembagas(data.data ?? []);
    } catch (err) {
      console.error("Error fetching lembagas:", err);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
    fetchLembagas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) {
      toast.error("Judul dan pesan wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lembagaId: form.lembagaId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengirim broadcast");
      }

      toast.success(
        form.isSent ? "Broadcast berhasil dikirim" : "Draft berhasil disimpan",
      );
      setShowForm(false);
      setForm({
        title: "",
        message: "",
        type: "INFO",
        priority: "NORMAL",
        lembagaId: "",
        isSent: false,
      });
      fetchBroadcasts();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim broadcast");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pengumuman ini?")) return;
    try {
      const res = await fetch(`/api/broadcast/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Pengumuman berhasil dihapus");
      setBroadcasts(broadcasts.filter((b) => b.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus");
    }
  };

  const filteredBroadcasts = broadcasts.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.message.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? b.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    const opt = TYPE_OPTIONS.find((o) => o.value === type);
    return opt ? (
      <opt.icon size={16} className={opt.color} />
    ) : (
      <Info size={16} className="text-blue-500" />
    );
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    if (!opt) return null;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
        <opt.icon size={12} className={opt.color} />
        {opt.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const opt = PRIORITY_OPTIONS.find((o) => o.value === priority);
    const colorMap: Record<string, string> = {
      LOW: "bg-slate-100 text-slate-600",
      NORMAL: "bg-emerald-100 text-emerald-700",
      HIGH: "bg-amber-100 text-amber-700",
      URGENT: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${colorMap[priority] || "bg-slate-100 text-slate-600"}`}
      >
        {opt?.label || priority}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Pengumuman &amp; Broadcast
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Kirim pengumuman ke seluruh pengguna atau unit tertentu
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:self-auto"
        >
          <Plus size={18} />
          <span>Broadcast Baru</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari pengumuman..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-border bg-card px-4 py-2.5 pl-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Broadcast Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-border bg-card shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
            <div className="border-b border-border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  Broadcast Baru
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Judul *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Judul pengumuman"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Pesan *
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Isi pesan pengumuman"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Tipe
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Prioritas
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Lembaga
                </label>
                <select
                  value={form.lembagaId}
                  onChange={(e) =>
                    setForm({ ...form, lembagaId: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">Semua Lembaga</option>
                  {lembagas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="isSent"
                  checked={form.isSent}
                  onChange={(e) =>
                    setForm({ ...form, isSent: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <label
                  htmlFor="isSent"
                  className="text-sm text-muted-foreground"
                >
                  Kirim sekarang (simpan sebagai draft jika tidak dicentang)
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.title || !form.message}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Save size={16} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>{form.isSent ? "Kirim" : "Simpan Draft"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-slate-100 rounded-lg animate-pulse"
            ></div>
          ))}
        </div>
      ) : filteredBroadcasts.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Tidak ada pengumuman ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBroadcasts.map((b) => (
            <div
              key={b.id}
              className="rounded-[20px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {getTypeIcon(b.type)}
                    <h3 className="font-semibold text-foreground">{b.title}</h3>
                    {getPriorityBadge(b.priority)}
                    {getStatusBadge(b.status)}
                  </div>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {b.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>Dikirim: {b.users?.name || "-"}</span>
                    {b.lembagas && <span>Lembaga: {b.lembagas.name}</span>}
                    <span>Penerima: {b._count?.broadcast_recipients || 0}</span>
                    <span>
                      Dibuat:{" "}
                      {new Date(b.createdAt).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                </div>
                <div className="ml-2 flex gap-1">
                  <button
                    onClick={() => {}}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-red-600"
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

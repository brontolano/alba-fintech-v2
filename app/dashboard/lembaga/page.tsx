"use client";

import { useState, useEffect } from "react";
import { Building2, Plus, Search, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Lembaga {
  id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    units: number;
    users: number;
  };
}

export default function LembagaPage() {
  const [lembagas, setLembagas] = useState<Lembaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    address: "",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchLembagas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lembaga");
      const data = await res.json();
      setLembagas(data.data ?? []);
    } catch (err) {
      console.error("Error fetching lembaga:", err);
      toast.error("Gagal memuat lembaga");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLembagas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editMode ? "/api/lembaga" : "/api/lembaga";
      const method = editMode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan lembaga");
      }

      const result = await res.json();
      toast.success(
        editMode ? "Lembaga berhasil diperbarui" : "Lembaga berhasil dibuat",
      );
      if (editMode) {
        setLembagas(
          lembagas.map((l) => (l.id === result.data.id ? result.data : l)),
        );
      } else {
        setLembagas([result.data, ...lembagas]);
      }
      setShowModal(false);
      setEditMode(false);
      setForm({
        name: "",
        code: "",
        description: "",
        address: "",
        isActive: true,
      });
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan lembaga");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (lembaga: Lembaga) => {
    setForm({
      name: lembaga.name,
      code: lembaga.code,
      description: lembaga.description || "",
      address: lembaga.address || "",
      isActive: lembaga.isActive,
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin hapus ${name}?`)) return;
    try {
      const res = await fetch(`/api/lembaga/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal hapus lembaga");
      }
      toast.success("Lembaga berhasil dihapus");
      setLembagas(lembagas.filter((l) => l.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Gagal hapus lembaga");
    }
  };

  const filteredLembagas = lembagas.filter(
    (lembaga) =>
      lembaga.name.toLowerCase().includes(search.toLowerCase()) ||
      lembaga.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Manajemen Lembaga
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Kelola lembaga/pesantren di sistem
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:self-auto"
        >
          <Plus size={18} />
          <span>Tambah Lembaga</span>
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Cari lembaga..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-full border border-border bg-card px-4 py-2.5 pl-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={16}
        />
      </div>

      {loading ? (
        <div className="rounded-[22px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-muted/50"
              />
            ))}
          </div>
        </div>
      ) : filteredLembagas.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-border bg-card p-12 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <Building2
            size={48}
            className="mx-auto mb-4 text-muted-foreground/60"
          />
          <p className="text-sm text-muted-foreground">
            Tidak ada lembaga ditemukan
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="md:hidden">
            <div className="divide-y divide-border">
              {filteredLembagas.map((lembaga) => (
                <div key={lembaga.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                        <Building2 size={18} className="text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {lembaga.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {lembaga.code}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${lembaga.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                    >
                      {lembaga.isActive ? "Aktif" : "Non-aktif"}
                    </span>
                  </div>

                  {lembaga.address && (
                    <div className="text-sm text-muted-foreground">
                      {lembaga.address}
                    </div>
                  )}
                  {lembaga.description && (
                    <div className="text-sm text-muted-foreground">
                      {lembaga.description}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Unit
                      </div>
                      <div className="mt-1 font-semibold text-foreground">
                        {lembaga._count?.units || 0}
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Pengguna
                      </div>
                      <div className="mt-1 font-semibold text-foreground">
                        {lembaga._count?.users || 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-border pt-3">
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      title="Edit"
                      onClick={() => handleEdit(lembaga)}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600"
                      title="Hapus"
                      onClick={() => handleDelete(lembaga.id, lembaga.name)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Lembaga
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Alamat
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Pengguna
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLembagas.map((lembaga) => (
                  <tr
                    key={lembaga.id}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3" data-label="Lembaga">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                          <Building2 size={18} className="text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {lembaga.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {lembaga.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-muted-foreground"
                      data-label="Alamat"
                    >
                      {lembaga.address || lembaga.description || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm text-muted-foreground"
                      data-label="Unit"
                    >
                      {lembaga._count?.units || 0}
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm text-muted-foreground"
                      data-label="Pengguna"
                    >
                      {lembaga._count?.users || 0}
                    </td>
                    <td className="px-4 py-3 text-center" data-label="Status">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${lembaga.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                      >
                        {lembaga.isActive ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" data-label="Aksi">
                      <div className="flex justify-center gap-2">
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          title="Edit"
                          onClick={() => handleEdit(lembaga)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus"
                          onClick={() => handleDelete(lembaga.id, lembaga.name)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[24px] border border-border bg-card shadow-2xl">
            <div className="border-b border-border p-4">
              <h2 className="text-lg font-semibold text-foreground">
                {editMode ? "Edit Lembaga" : "Tambah Lembaga Baru"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Nama Lembaga
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Nama lembaga"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Kode Lembaga
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm uppercase text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Kode lembaga"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Alamat
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  rows={2}
                  placeholder="Alamat lengkap"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Deskripsi
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  rows={3}
                  placeholder="Deskripsi lembaga"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.name || !form.code}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

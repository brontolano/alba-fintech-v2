"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building,
  Wallet,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

interface Unit {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  isRetail: boolean;
  type: string;
  lembagaId?: string | null;
  _count: {
    users: number;
    transactions: number;
  };
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Fetch units
  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/units", {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setUnits(data.data ?? []);
    } catch (err) {
      console.error("Error fetching units:", err);
      toast.error("Gagal memuat unit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "KPAK":
        return <Wallet className="w-5 h-5 text-emerald-600" />;
      case "KOPERASI":
        return <Building className="w-5 h-5 text-purple-600" />;
      case "KANTIN":
        return <ShoppingCart className="w-5 h-5 text-orange-600" />;
      default:
        return <Building className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "KPAK":
        return "bg-emerald-100 text-emerald-700";
      case "KOPERASI":
        return "bg-purple-100 text-purple-700";
      case "KANTIN":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Hapus unit "${name}"? Semua data terkait akan kehilangan unit ini.`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/units/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus unit");
      }
      toast.success("Unit berhasil dihapus");
      fetchUnits();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus unit");
    }
  };

  const filteredUnits = units.filter(
    (unit) =>
      unit.name.toLowerCase().includes(search.toLowerCase()) ||
      unit.code.toLowerCase().includes(search.toLowerCase()) ||
      unit.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Manajemen Unit
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Kelola unit-unit di Pondok Pesantren Al-Basyariyah
          </p>
        </div>
        <Link
          href="/dashboard/units/create"
          className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:self-auto"
        >
          <Plus size={18} />
          <span>Tambah Unit</span>
        </Link>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Cari unit..."
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-muted/50"
              />
            ))}
          </div>
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-border bg-card p-12 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-sm text-muted-foreground">
            Tidak ada unit ditemukan
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="md:hidden">
            <div className="divide-y divide-border">
              {filteredUnits.map((unit) => (
                <div key={unit.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
                        {getTypeIcon(unit.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {unit.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {unit.code}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getTypeBadge(unit.type)}`}
                    >
                      {unit.type}
                    </span>
                  </div>

                  {unit.description && (
                    <p className="text-sm text-muted-foreground">
                      {unit.description}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Staff
                      </div>
                      <div className="mt-1 font-semibold text-foreground">
                        {unit._count?.users || 0}
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Transaksi
                      </div>
                      <div className="mt-1 font-semibold text-foreground">
                        {unit._count?.transactions || 0}
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Status
                      </div>
                      <div
                        className={`mt-1 font-semibold ${unit.isActive ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {unit.isActive ? "Aktif" : "Non-aktif"}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-border pt-3">
                    <Link
                      href={`/dashboard/units/${unit.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(unit.id, unit.name)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600"
                      title="Hapus"
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
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Tipe
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Staff
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Transaksi
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
                {filteredUnits.map((unit) => (
                  <tr
                    key={unit.id}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3" data-label="Unit">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
                          {getTypeIcon(unit.type)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {unit.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {unit.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" data-label="Tipe">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getTypeBadge(unit.type)}`}
                      >
                        {unit.type}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm text-muted-foreground"
                      data-label="Staff"
                    >
                      {unit._count?.users || 0}
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm text-muted-foreground"
                      data-label="Transaksi"
                    >
                      {unit._count?.transactions || 0}
                    </td>
                    <td className="px-4 py-3 text-center" data-label="Status">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${unit.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                      >
                        {unit.isActive ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" data-label="Aksi">
                      <div className="flex justify-center gap-2">
                        <Link
                          href={`/dashboard/units/${unit.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(unit.id, unit.name)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus"
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
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldHalf,
  Users,
  Filter,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import {
  StatCard,
  finzoInputClass,
  finzoSelectClass,
} from "@/components/ui/finzo";

interface PegawaiUser {
  id: string;
  email: string;
  name?: string | null;
  role: "SUPERADMIN" | "PIMPINAN" | "MANAGER" | "STAFF";
  isActive: boolean;
  unitId: string | null;
  lembagaId: string;
  createdAt: string;
  unit?: { id: string; name: string } | null;
  units?: { id: string; name: string } | null;
}

const roleLabel: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  PIMPINAN: "Pimpinan",
  MANAGER: "Manager",
  STAFF: "Staff",
};

const roleBg: Record<string, string> = {
  SUPERADMIN: "bg-destructive/10 text-destructive",
  PIMPINAN: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  MANAGER: "bg-muted text-muted-foreground",
  STAFF: "bg-income/10 text-income",
};

const roleIcon = (role: string, size = 16) => {
  switch (role) {
    case "SUPERADMIN":
      return <ShieldCheck size={size} className="shrink-0" />;
    case "PIMPINAN":
      return <ShieldAlert size={size} className="shrink-0" />;
    case "MANAGER":
      return <ShieldHalf size={size} className="shrink-0" />;
    default:
      return <Shield size={size} className="shrink-0" />;
  }
};

export function PimpinanPegawai() {
  const [users, setUsers] = useState<PegawaiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Gagal memuat pegawai");
      const data = await res.json();
      setUsers(data.data ?? []);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat pegawai");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          u.name?.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q);
        const matchRole = !roleFilter || u.role === roleFilter;
        const matchStatus =
          !statusFilter ||
          (statusFilter === "active" ? u.isActive : !u.isActive);
        return matchSearch && matchRole && matchStatus;
      }),
    [users, search, roleFilter, statusFilter],
  );

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const pimpinan = users.filter((u) => u.role === "PIMPINAN").length;
    const manager = users.filter((u) => u.role === "MANAGER").length;
    const staff = users.filter((u) => u.role === "STAFF").length;
    return { total: users.length, active, pimpinan, manager, staff };
  }, [users]);

  const unitName = (u: PegawaiUser) => u.unit?.name || u.units?.name || "-";

  const hasFilter = search || roleFilter || statusFilter;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Pegawai Lembaga
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rekap seluruh pengguna aplikasi keuangan di bawah lembaga ini.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Pegawai" value={String(stats.total)} icon={<Users size={18} />} />
        <StatCard label="Aktif" value={String(stats.active)} tone="income" icon={<CheckCircle2 size={18} />} />
        <StatCard label="Pimpinan" value={String(stats.pimpinan)} tone="neutral" icon={<ShieldAlert size={18} />} />
        <StatCard label="Manager" value={String(stats.manager)} tone="neutral" icon={<ShieldHalf size={18} />} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 shadow-elevation-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className={`${finzoInputClass} pl-9`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="shrink-0 text-muted-foreground sm:hidden" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`${finzoSelectClass} sm:w-[150px]`}
            >
              <option value="">Semua role</option>
              <option value="PIMPINAN">Pimpinan</option>
              <option value="MANAGER">Manager</option>
              <option value="STAFF">Staff</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${finzoSelectClass} sm:w-[140px]`}
            >
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Non-aktif</option>
            </select>
            {hasFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("");
                  setStatusFilter("");
                }}
                className="inline-flex h-[42px] items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-border bg-muted/50"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-14 text-center">
          <Users size={44} className="mx-auto mb-4 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">Tidak ada pegawai</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilter ? "Coba ubah pencarian atau filter." : "Belum ada pengguna di lembaga ini."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-elevation-1">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Pegawai</th>
                <th className="hidden px-4 py-2.5 font-semibold md:table-cell">
                  Unit
                </th>
                <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">
                  Role
                </th>
                <th className="px-4 py-2.5 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${roleBg[u.role]}`}
                      >
                        {roleIcon(u.role, 14)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {u.name || u.email}
                        </p>
                        <p className="hidden truncate text-xs text-muted-foreground sm:block">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
                    {unitName(u)}
                  </td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      {roleIcon(u.role, 12)}
                      {roleLabel[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                        u.isActive
                          ? "bg-income/10 text-income"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {u.isActive ? <CheckCircle2 size={12} /> : <Ban size={12} />}
                      {u.isActive ? "Aktif" : "Non-aktif"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
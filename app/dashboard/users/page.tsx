"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: "SUPERADMIN" | "PIMPINAN" | "MANAGER" | "STAFF";
  isActive: boolean;
  unitId: string | null;
  lembagaId: string | null;
  unit?: { id: string; name: string; code: string } | null;
  lembaga?: { id: string; name: string; code: string } | null;
  units?: { id: string; name: string; code: string } | null;
  lembagas?: { id: string; name: string; code: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface Unit {
  id: string;
  name: string;
  code: string;
}

import { usePageGuard } from "@/lib/use-page-guard";
import { useSession } from "next-auth/react";

export default function UsersPage() {
  usePageGuard(["SUPERADMIN", "PIMPINAN"]);
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPERADMIN";
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setUsers(data.data ?? []);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Gagal memuat pengguna");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pengguna ini? Tindakan ini tidak dapat dibatalkan."))
      return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus pengguna");
      }
      toast.success("Pengguna berhasil dihapus");
      setUsers(users.filter((u) => u.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pengguna");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return <ShieldCheck size={18} className="text-red-500" />;
      case "PIMPINAN":
        return <ShieldAlert size={18} className="text-blue-500" />;
      case "MANAGER":
        return <ShieldHalf size={18} className="text-purple-500" />;
      case "STAFF":
        return <Shield size={18} className="text-green-500" />;
      default:
        return <Shield size={18} className="text-slate-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-red-100 text-red-700";
      case "PIMPINAN":
        return "bg-blue-100 text-blue-700";
      case "MANAGER":
        return "bg-purple-100 text-purple-700";
      case "STAFF":
        return "bg-green-100 text-green-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {isSuperAdmin ? "Manajemen Pengguna" : "Pegawai Lembaga"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Kelola pengguna aplikasi keuangan"
              : "Pantau pengguna aplikasi keuangan di seluruh unit"}
          </p>
        </div>
        {isSuperAdmin && (
          <Link
            href="/dashboard/users/create"
            className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:self-auto"
          >
            <Plus size={18} />
            <span>Tambah Pengguna</span>
          </Link>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Cari pengguna..."
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
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-border bg-muted/50"
            />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-border bg-card py-12 text-center">
          <Users size={48} className="mx-auto mb-4 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Tidak ada pengguna ditemukan
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="md:hidden">
            <div className="divide-y divide-border">
              {filteredUsers.map((user, idx) => (
                <div key={user.id} className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("id-ID")
                        : ""}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Nama
                      </div>
                      <div className="mt-1 font-medium text-foreground">
                        {user.name || "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Email
                      </div>
                      <div className="mt-1 break-all text-muted-foreground">
                        {user.email}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Role
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getRoleBadge(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Unit
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {user.unit?.name || user.units?.name || "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Status
                      </div>
                      <div className="mt-1">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            user.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {user.isActive ? "Aktif" : "Non-aktif"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div className="flex justify-end gap-2 border-t border-border pt-3">
                      <Link
                        href={`/dashboard/users/${user.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Status
                  </th>
                  {isSuperAdmin && (
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => (
                  <tr
                    key={user.id}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <td
                      className="px-4 py-3 text-sm text-muted-foreground"
                      data-label="#"
                    >
                      {idx + 1}
                    </td>
                    <td
                      className="px-4 py-3 text-sm font-medium text-foreground"
                      data-label="Nama"
                    >
                      {user.name || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-muted-foreground"
                      data-label="Email"
                    >
                      {user.email}
                    </td>
                    <td className="px-4 py-3" data-label="Role">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getRoleBadge(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm text-muted-foreground"
                      data-label="Unit"
                    >
                      {user.unit?.name || user.units?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-center" data-label="Status">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          user.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {user.isActive ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-center" data-label="Aksi">
                        <div className="flex justify-center gap-2">
                          <Link
                            href={`/dashboard/users/${user.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
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

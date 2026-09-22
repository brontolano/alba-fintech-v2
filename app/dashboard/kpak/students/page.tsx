"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Wallet,
  UserPlus,
  Search,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { usePageGuard } from "@/lib/use-page-guard";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

interface Student {
  id: string;
  studentNumber: string;
  name: string;
  className?: string | null;
  cardUid?: string | null;
  isActive?: boolean | null;
  account?: { id: string; balance: number | string; status: string } | null;
}

export default function KpakStudentsPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      ((u?.role === "MANAGER" || u?.role === "STAFF") &&
        u?.unitIsRetail !== true),
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [summary, setSummary] = useState({ total: 0, totalBalance: 0 });

  // Debounce ketikan: 1 request per 350ms, bukan per huruf
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
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
  }, [debouncedSearch]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Santri</h1>
          <p className="text-sm text-muted-foreground">
            Data santri dan rekening tabungan unit
          </p>
        </div>
        <Link
          href="/dashboard/kpak/students/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus size={16} />
          Santri Baru
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          className="w-full rounded-lg border bg-card py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Nama</th>
              <th className="px-4 py-3 text-left font-medium">Kelas</th>
              <th className="px-4 py-3 text-right font-medium">Saldo</th>
              <th className="px-4 py-3 text-center font-medium">Rincian</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
                  Memuat data...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <AlertCircle size={20} className="mx-auto mb-2" />
                  {search ? (
                    "Tidak ada santri yang cocok"
                  ) : (
                    <>
                      Belum ada data santri.{" "}
                      <Link
                        href="/dashboard/kpak/students/new"
                        className="font-medium text-primary hover:underline"
                      >
                        Daftarkan santri baru
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr
                  key={s.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">
                    {s.name}
                    {s.account?.status === "FROZEN" && (
                      <span className="ml-2 rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-600">
                        Beku
                      </span>
                    )}
                    {s.isActive === false && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Non-aktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.className || "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(Number(s.account?.balance || 0))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/dashboard/kpak/students/${s.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      Rincian
                      <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

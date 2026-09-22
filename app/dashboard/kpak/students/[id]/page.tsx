"use client";

import { useState, useEffect, use } from "react";
import {
  ArrowLeft,
  Loader2,
  Save,
  CreditCard,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
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

interface Mutation {
  id: string;
  type: string;
  amount: number | string;
  balanceAfter: number | string;
  description?: string | null;
  photoUrl?: string | null;
  createdAt: string;
}

interface Detail {
  id: string;
  studentNumber: string;
  name: string;
  className?: string | null;
  cardUid?: string | null;
  account?: {
    id: string;
    balance: number | string;
    status: string;
    transactions: Mutation[];
  } | null;
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      ((u?.role === "MANAGER" || u?.role === "STAFF") &&
        u?.unitIsRetail !== true),
  });

  const { data: session } = useSession();
  const role = session?.user?.role;
  const canEdit =
    role === "SUPERADMIN" || role === "PIMPINAN" || role === "MANAGER";

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ name: "", className: "", cardUid: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/savings/students/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat data");
        setDetail(json.data);
        setEditData({
          name: json.data.name || "",
          className: json.data.className || "",
          cardUid: json.data.cardUid || "",
        });
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleEdit = async () => {
    if (!detail) return;
    if (!editData.name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/savings/students/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editData.name.trim(),
          className: editData.className.trim() || null,
          cardUid: editData.cardUid.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengupdate");
      toast.success("Data santri diperbarui");
      setEditMode(false);
      setDetail({ ...detail, ...json.data });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
        Memuat data santri...
      </p>
    );
  }

  if (!detail) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        <p>Santri tidak ditemukan.</p>
        <Link
          href="/dashboard/kpak/students"
          className="mt-2 inline-block font-medium text-primary hover:underline"
        >
          Kembali ke Data Santri
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/kpak/students"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
          aria-label="Kembali"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{detail.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">
            NIS {detail.studentNumber}
            {detail.className ? ` · ${detail.className}` : ""}
          </p>
        </div>
      </div>

      {/* Identitas */}
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Identitas Santri</h2>
          {canEdit ? (
            <button
              onClick={() => setEditMode(!editMode)}
              className="text-xs font-medium text-primary hover:underline"
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
            <p className="text-xs text-muted-foreground">Nama</p>
            {editMode ? (
              <input
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
                className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5"
              />
            ) : (
              <p className="font-medium">{detail.name}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kelas</p>
            {editMode ? (
              <input
                value={editData.className}
                onChange={(e) =>
                  setEditData({ ...editData, className: e.target.value })
                }
                className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5"
              />
            ) : (
              <p>{detail.className || "-"}</p>
            )}
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">UID Kartu NFC</p>
            {editMode ? (
              <input
                value={editData.cardUid}
                onChange={(e) =>
                  setEditData({ ...editData, cardUid: e.target.value })
                }
                placeholder="Kosongkan jika belum ada"
                className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5 font-mono"
              />
            ) : (
              <p className="font-mono text-xs">
                {detail.cardUid || (
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

      {/* Saldo */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Saldo Tabungan</h2>
        </div>
        <p className="mt-2 text-3xl font-bold">
          {formatCurrency(Number(detail.account?.balance || 0))}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Status:{" "}
          <span
            className={
              detail.account?.status === "ACTIVE"
                ? "font-medium text-emerald-600"
                : "font-medium text-red-600"
            }
          >
            {detail.account?.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
          </span>
        </p>
      </div>

      {/* Mutasi */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Riwayat Mutasi</h2>
        {!detail.account?.transactions ||
        detail.account.transactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Belum ada mutasi
          </p>
        ) : (
          <div className="space-y-2">
            {detail.account.transactions.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  {m.type === "DEPOSIT" ? (
                    <ArrowDownRight size={14} className="text-emerald-600" />
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
                    {m.photoUrl && (
                      <a
                        href={m.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Lihat bukti →
                      </a>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={
                      m.type === "DEPOSIT"
                        ? "font-medium text-emerald-600"
                        : "font-medium text-red-600"
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
  );
}

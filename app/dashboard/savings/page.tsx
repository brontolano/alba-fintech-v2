"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  ExternalLink,
  Search,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface StudentData {
  id: string;
  studentNumber: string;
  name: string;
  className?: string | null;
  cardUid?: string | null;
  account?: { id: string; balance: number | string; status: string } | null;
}

export default function SavingsPage() {
  const { data: session } = useSession();
  const [lookupValue, setLookupValue] = useState("");
  const [student, setStudent] = useState<StudentData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mutation, setMutation] = useState({
    type: "DEPOSIT" as "DEPOSIT" | "WITHDRAWAL",
    amount: "",
    description: "",
  });
  const [showRegister, setShowRegister] = useState(false);
  const [register, setRegister] = useState({
    studentNumber: "",
    name: "",
    className: "",
    cardUid: "",
  });

  const lookup = async () => {
    if (!lookupValue.trim()) return;
    setLookupLoading(true);
    try {
      const key = lookupValue.trim();
      const param = /^[0-9]+$/.test(key) ? "studentNumber" : "cardUid";
      const response = await fetch(
        `/api/savings/lookup?${param}=${encodeURIComponent(key)}`,
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Santri tidak ditemukan");
      setStudent(result.data);
    } catch (error) {
      setStudent(null);
      toast.error(
        error instanceof Error ? error.message : "Gagal mencari santri",
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const submitMutation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!student?.account?.id || !mutation.amount) return;
    setSaving(true);
    try {
      const response = await fetch("/api/savings/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: student.account.id,
          ...mutation,
          amount: Number(mutation.amount),
          cardUid: student.cardUid,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal menyimpan mutasi");
      setStudent((current) =>
        current && current.account
          ? {
              ...current,
              account: {
                ...current.account,
                balance: result.data.balanceAfter,
              },
            }
          : current,
      );
      setMutation({ ...mutation, amount: "", description: "" });
      toast.success(
        mutation.type === "DEPOSIT"
          ? "Setoran berhasil dicatat"
          : "Pengambilan berhasil dicatat",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan mutasi",
      );
    } finally {
      setSaving(false);
    }
  };

  const registerStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/savings/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(register),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "Gagal mendaftarkan santri");
      return;
    }
    setShowRegister(false);
    setRegister({ studentNumber: "", name: "", className: "", cardUid: "" });
    setStudent(result.data);
    toast.success("Santri dan rekening tabungan berhasil dibuat");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            KPAK - Tabungan Santri
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fokus operasional KPAK: setor, tarik, dan cek saldo santri untuk
            pendaftaran, HER/SPP, serta keuangan internal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/kiosk"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <ExternalLink size={16} /> Buka Anjungan Santri
          </Link>
          {session?.user?.role !== "STAFF" && (
            <button
              onClick={() => setShowRegister((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <UserPlus size={16} /> Santri Baru
            </button>
          )}
        </div>
      </div>

      {showRegister && (
        <form
          onSubmit={registerStudent}
          className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4"
        >
          <input
            required
            placeholder="NIS/Nomor santri"
            value={register.studentNumber}
            onChange={(e) =>
              setRegister({ ...register, studentNumber: e.target.value })
            }
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          />
          <input
            required
            placeholder="Nama santri"
            value={register.name}
            onChange={(e) => setRegister({ ...register, name: e.target.value })}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Kelas"
            value={register.className}
            onChange={(e) =>
              setRegister({ ...register, className: e.target.value })
            }
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          />
          <input
            placeholder="UID kartu NFC (opsional)"
            value={register.cardUid}
            onChange={(e) =>
              setRegister({ ...register, cardUid: e.target.value })
            }
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
          />
          <button className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background md:col-span-4">
            Simpan Santri
          </button>
        </form>
      )}

      <div className="flex gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <input
            value={lookupValue}
            onChange={(e) => setLookupValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="Masukkan nomor santri atau UID kartu NFC"
            className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-3 text-sm"
          />
        </div>
        <button
          onClick={lookup}
          disabled={lookupLoading}
          className="rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          {lookupLoading ? "Mencari..." : "Cari"}
        </button>
      </div>

      {student && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CreditCard size={22} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{student.name}</p>
                <p className="text-sm text-muted-foreground">
                  {student.studentNumber}{" "}
                  {student.className ? `· ${student.className}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-muted p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Saldo tersedia
              </p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                Rp{" "}
                {Number(student.account?.balance || 0).toLocaleString("id-ID")}
              </p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {student.cardUid ? `NFC: ${student.cardUid}` : ""}
            </p>
          </div>
          <form
            onSubmit={submitMutation}
            className="space-y-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMutation({ ...mutation, type: "DEPOSIT" })}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${mutation.type === "DEPOSIT" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border text-muted-foreground"}`}
              >
                <ArrowUpRight size={17} /> Setor
              </button>
              <button
                type="button"
                onClick={() => setMutation({ ...mutation, type: "WITHDRAWAL" })}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${mutation.type === "WITHDRAWAL" ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400" : "border-border text-muted-foreground"}`}
              >
                <ArrowDownRight size={17} /> Ambil
              </button>
            </div>
            <input
              required
              type="number"
              min="1"
              value={mutation.amount}
              onChange={(e) =>
                setMutation({ ...mutation, amount: e.target.value })
              }
              placeholder="Nominal"
              className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm"
            />
            <textarea
              value={mutation.description}
              onChange={(e) =>
                setMutation({ ...mutation, description: e.target.value })
              }
              placeholder="Keterangan (opsional)"
              rows={3}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm"
            />
            <button
              disabled={saving}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving
                ? "Memproses..."
                : mutation.type === "DEPOSIT"
                  ? "Simpan Setoran"
                  : "Simpan Pengambilan"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

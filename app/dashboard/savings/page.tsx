"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Search,
  UserPlus,
  Printer,
  Nfc,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { uploadProof } from "@/lib/upload-proof";
import { printData, escapeHtml } from "@/lib/print";
import NfcUidInput from "@/components/nfc/NfcUidInput";
import { normalizeUid, isWebNfcSupported, scanNfcUid } from "@/lib/nfc";

interface StudentData {
  id: string;
  studentNumber: string;
  name: string;
  className?: string | null;
  cardUid?: string | null;
  account?: { id: string; balance: number | string; status: string } | null;
}

import { usePageGuard } from "@/lib/use-page-guard";
import { useShiftGate } from "@/components/kpak/useShiftGate";
import { ShiftLock } from "@/components/kpak/ShiftLock";

export default function SavingsPage() {
  usePageGuard([], {
    allow: (u) =>
      u?.role === "SUPERADMIN" ||
      u?.role === "PIMPINAN" ||
      ((u?.role === "MANAGER" || u?.role === "STAFF") &&
        u?.unitIsRetail !== true),
  });
  const gate = useShiftGate();
  const [lookupValue, setLookupValue] = useState("");
  const [student, setStudent] = useState<StudentData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [notFoundKey, setNotFoundKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mutation, setMutation] = useState({
    type: "DEPOSIT" as "DEPOSIT" | "WITHDRAWAL",
    amount: "",
    description: "",
    channel: "CASH" as "CASH" | "BANK",
  });
  const [showRegister, setShowRegister] = useState(false);
  const [register, setRegister] = useState({
    studentNumber: "",
    name: "",
    className: "",
    cardUid: "",
  });

  const lookup = async (keyOverride?: string) => {
    const key = (keyOverride ?? lookupValue).trim();
    if (!key) return;
    setLookupLoading(true);
    try {
      const param = /^[0-9]+$/.test(key) ? "studentNumber" : "cardUid";
      const response = await fetch(
        `/api/savings/lookup?${param}=${encodeURIComponent(key)}`,
      );
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 404) setNotFoundKey(key);
        throw new Error(result.error || "Santri tidak ditemukan");
      }
      setStudent(result.data);
      setNotFoundKey(null);
    } catch (error) {
      setStudent(null);
      toast.error(
        error instanceof Error ? error.message : "Gagal mencari santri",
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const scanLookup = async () => {
    if (lookupLoading) return;
    try {
      const uid = normalizeUid(await scanNfcUid());
      setLookupValue(uid);
      await lookup(uid);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal membaca kartu",
      );
    }
  };

  const [proofFile, setProofFile] = useState<File | null>(null);

  const submitMutation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!student?.account?.id || !mutation.amount) return;
    setSaving(true);
    try {
      // Bukti transfer via rekening (opsional) — upload dulu
      let photoUrl: string | undefined;
      if (proofFile) {
        toast.loading("Mengunggah bukti...", { id: "proof" });
        const up = await uploadProof(proofFile);
        toast.dismiss("proof");
        photoUrl = up.url;
        if (up.storage === "local")
          toast.warning("Drive belum aktif — bukti tersimpan lokal", {
            description: up.warning,
          });
      }
      const response = await fetch("/api/savings/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: student.account.id,
          type: mutation.type,
          amount: Number(mutation.amount),
          description: mutation.description,
          channel:
            mutation.type === "WITHDRAWAL" ? "CASH" : mutation.channel,
          cardUid: student.cardUid,
          photoUrl,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal menyimpan mutasi");
      // Pastikan bukti benar-benar tersimpan, bukan hanya terupload
      if (proofFile && !result.data?.photoUrl) {
        toast.warning(
          "Mutasi tersimpan, TAPI bukti foto tidak tersimpan — coba lampirkan ulang",
        );
      }
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
      setProofFile(null);
      toast.success(
        mutation.type === "DEPOSIT"
          ? "Setoran berhasil dicatat"
          : "Pengambilan berhasil dicatat",
      );
    } catch (error) {
      toast.dismiss("proof");
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
      body: JSON.stringify({
          ...register,
          cardUid: normalizeUid(register.cardUid) || undefined,
        }),
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

  // Staff KPAK: layanan tabungan hanya saat shift Tabungan aktif
  const printCard = () => {
    if (!student) return;
    const balance = Number(student.account?.balance || 0);
    const bodyHtml = `
      <div class="site-header">
        <h1>ALBA FINANCE</h1>
        <p class="sub">Pondok Pesantren Al-Basyariyah · KPAK Tabungan Santri</p>
      </div>
      <h2>Kartu Tabungan Santri</h2>
      <p class="sub">Dicetak ${escapeHtml(new Date().toLocaleString("id-ID"))}</p>
      <table>
        <tr>
          <td class="label">Nomor Santri</td>
          <td>${escapeHtml(student.studentNumber)}</td>
        </tr>
        <tr>
          <td class="label">Nama</td>
          <td>${escapeHtml(student.name)}</td>
        </tr>
        <tr>
          <td class="label">Kelas</td>
          <td>${escapeHtml(student.className || "-")}</td>
        </tr>
        ${
          student.cardUid
            ? `<tr>
            <td class="label">UID Kartu NFC</td>
            <td>${escapeHtml(student.cardUid)}</td>
          </tr>`
            : ""
        }
        <tr>
          <td class="label">Status Akun</td>
          <td>${
            student.account?.status === "ACTIVE"
              ? "Aktif"
              : escapeHtml(student.account?.status || "-")
          }</td>
        </tr>
        <tr>
          <td class="label">Saldo Tersedia</td>
          <td><strong>Rp ${balance.toLocaleString("id-ID")}</strong></td>
        </tr>
      </table>
      <div class="sign">
        <div><p>Santri / Wali</p><div class="space"></div><p>_______________</p></div>
        <div><p>Petugas KPAK</p><div class="space"></div><p>_______________</p></div>
      </div>
      <p class="footer">Dicetak ${escapeHtml(new Date().toLocaleString("id-ID"))} · Dokumen dihasilkan otomatis oleh ALBA Finance</p>
    `;
    printData("Kartu Tabungan", bodyHtml, { pageSize: "A4", margin: "12mm" });
  };

  // Staff KPAK: layanan tabungan hanya saat shift Tabungan aktif
  if (gate.gated && gate.loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <ShiftLock loading active={false} needService="TABUNGAN" />
      </div>
    );
  }
  if (
    gate.gated &&
    !gate.loading &&
    (!gate.active || gate.service !== "TABUNGAN")
  ) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <ShiftLock
          loading={false}
          active={gate.active}
          needService="TABUNGAN"
        />
      </div>
    );
  }

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
            href="/dashboard/kpak/students"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Data Santri
          </Link>
          <button
            onClick={() => setShowRegister((value) => !value)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <UserPlus size={16} /> Santri Baru
          </button>
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
          <NfcUidInput
            value={register.cardUid}
            onChange={(v) => setRegister({ ...register, cardUid: v })}
            placeholder="UID kartu NFC (opsional)"
            showHint={false}
            className="md:col-span-4"
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
          onClick={() => lookup()}
          disabled={lookupLoading}
          className="rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          {lookupLoading ? "Mencari..." : "Cari"}
        </button>
        {isWebNfcSupported() ? (
          <button
            onClick={scanLookup}
            disabled={lookupLoading}
            title="Tempel kartu NFC untuk mengisi UID"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 text-sm font-semibold text-primary hover:bg-primary/15"
          >
            <Nfc size={16} /> Tempel
          </button>
        ) : null}
      </div>

      {!student && notFoundKey && !lookupLoading && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="font-semibold text-foreground">
            Santri &quot;{notFoundKey}&quot; tidak ditemukan
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Data belum terdaftar. Daftarkan dulu di halaman Data Santri agar
            bisa setor/tarik tabungan.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/dashboard/kpak/students/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <UserPlus size={16} /> Ke Data Santri — Tambah Baru
            </Link>
            <button
              onClick={() => {
                setRegister((r) => ({
                  ...r,
                  studentNumber: /^[0-9]+$/.test(notFoundKey)
                    ? notFoundKey
                    : r.studentNumber,
                  cardUid: /^[0-9]+$/.test(notFoundKey)
                    ? r.cardUid
                    : notFoundKey,
                }));
                setShowRegister(true);
                setNotFoundKey(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Daftarkan di sini
            </button>
          </div>
        </div>
      )}

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
            <button
              onClick={printCard}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <Printer size={16} /> Cetak Kartu Tabungan
            </button>
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
            {mutation.type === "DEPOSIT" ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMutation({ ...mutation, channel: "CASH" })}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${mutation.channel === "CASH" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border text-muted-foreground"}`}
                >
                  Tunai (Cash)
                </button>
                <button
                  type="button"
                  onClick={() => setMutation({ ...mutation, channel: "BANK" })}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${mutation.channel === "BANK" ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400" : "border-border text-muted-foreground"}`}
                >
                  Transfer Bank
                </button>
              </div>
            ) : (
              <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
                Penarikan hanya tunai (cash) — diambil langsung di loket.
              </p>
            )}
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
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Bukti transfer (opsional, bila via rekening)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
              {proofFile && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {proofFile.name}
                </p>
              )}
            </div>
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

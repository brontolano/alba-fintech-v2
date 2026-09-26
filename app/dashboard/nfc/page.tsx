"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Nfc,
  Loader2,
  Check,
  Copy,
  Keyboard,
  ScanLine,
  User,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { isWebNfcSupported, normalizeUid, scanNfcUid } from "@/lib/nfc";
import NfcUidInput from "@/components/nfc/NfcUidInput";
import { usePageGuard } from "@/lib/use-page-guard";

interface StudentResult {
  id: string;
  studentNumber: string;
  name: string;
  className?: string | null;
  cardUid?: string | null;
  account?: { id: string; balance: number | string; status: string } | null;
}

export default function NfcModulePage() {
  usePageGuard([], { allow: (u) => !!u?.id });
  const webNfc = isWebNfcSupported();

  const [scanning, setScanning] = useState(false);
  const [uid, setUid] = useState("");
  const [manual, setManual] = useState("");
  const [copied, setCopied] = useState(false);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState<StudentResult | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    setStudent(null);
    setNotFound(null);
    try {
      const raw = await scanNfcUid();
      const normalized = normalizeUid(raw);
      setUid(normalized);
      setManual(normalized);
      toast.success(`Kartu terbaca · UID ${normalized}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membaca kartu");
    } finally {
      setScanning(false);
    }
  };

  const handleCopy = async () => {
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Tidak bisa menyalin. Salin manual dari teks di bawah.");
    }
  };

  const lookupStudent = async () => {
    const key = uid || normalizeUid(manual);
    if (!key) {
      toast.error("UID kosong — tempel kartu atau ketik UID dulu");
      return;
    }
    setSearching(true);
    setStudent(null);
    setNotFound(null);
    try {
      const res = await fetch(
        `/api/savings/lookup?cardUid=${encodeURIComponent(key)}`,
      );
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setNotFound(key);
          throw new Error("Santri tidak ditemukan. Periksa apakah UID sudah didaftarkan di Data Santri.");
        }
        throw new Error(json.error || "Gagal mencari santri");
      }
      setStudent(json.data);
      toast.success(`Santri ditemukan: ${json.data.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mencari santri");
    } finally {
      setSearching(false);
    }
  };

  const isCardForStudent = uid && student && student.cardUid === uid;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modul NFC</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Baca UID kartu santri dengan tempel kartu (Web NFC), reader USB/Bluetooth,
          atau ketik manual.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pembaca UID */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Nfc size={20} className="text-primary" />
            Pembaca UID Kartu
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center">
            {webNfc ? (
              <button
                type="button"
                onClick={handleScan}
                disabled={scanning}
                className="mx-auto flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-background px-8 py-6 text-primary shadow-sm transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {scanning ? (
                  <Loader2 size={44} className="animate-spin" />
                ) : (
                  <Nfc size={44} />
                )}
                <span className="text-sm font-semibold">
                  {scanning ? "Menunggu kartu ditempelkan..." : "Tempel Kartu ke Ponsel"}
                </span>
              </button>
            ) : (
              <div className="py-4">
                <Nfc size={40} className="mx-auto text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Web NFC tidak tersedia di perangkat ini.
                </p>
              </div>
            )}
          </div>

          {!webNfc ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
              <ScanLine size={18} className="mt-0.5 shrink-0 text-primary" />
              <p>
                Gunakan reader USB/Bluetooth (keyboard-wedge): arahkan kursor ke
                kolom UID di bawah lalu tempel kartu — UID terisi otomatis dan
                tekan Enter.
              </p>
            </div>
          ) : null}

          <div className="mt-5">
            <NfcUidInput
              value={manual}
              onChange={(v) => {
                setManual(v);
                setUid(normalizeUid(v));
              }}
              onEnter={lookupStudent}
              label="UID Kartu"
              placeholder="AB:CD:EF:12"
              showHint={false}
              buttonLabel="Tempel"
            />
          </div>

          {uid ? (
            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                UID terbaca
              </p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <code className="break-all font-mono text-base font-semibold text-foreground">
                  {uid}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted/80"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Tersalin" : "Salin"}
                </button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={lookupStudent}
            disabled={searching || !uid}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <User size={16} />
            )}
            Cari Santri dari UID
          </button>
        </div>

        {/* Hasil */}
        <div className="space-y-6">
          {student ? (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="text-lg font-semibold">Hasil Pencarian</div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User size={22} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{student.name}</p>
                  <p className="text-sm text-muted-foreground">
                    NIS {student.studentNumber}
                    {student.className ? ` · ${student.className}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-muted/60 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Saldo Tabungan
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    Rp{" "}
                    {Number(student.account?.balance || 0).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/60 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Status Akun
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {student.account?.status === "ACTIVE" ? "Aktif" : student.account?.status || "-"}
                  </p>
                </div>
              </div>
              {!isCardForStudent ? (
                <p className="mt-3 text-xs text-amber-600">
                  Peringatan: kartu ini terdaftar untuk santri lain
                  {student.cardUid ? ` (UID ${student.cardUid})` : " tanpa UID"}.
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/kpak/students/${student.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/15"
                >
                  Detail Santri <ArrowRight size={14} />
                </Link>
                <Link
                  href="/dashboard/savings"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm font-medium transition hover:bg-muted/80"
                >
                  Buka Layanan Tabungan
                </Link>
                <Link
                  href="/dashboard/pos"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm font-medium transition hover:bg-muted/80"
                >
                  Buka Kasir POS
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-6">
              <p className="text-sm text-muted-foreground">
                {notFound
                  ? "Hasil pencarian akan muncul di sini setelah UID terdaftar."
                  : "Tempel kartu atau ketik UID, lalu tekan “Cari Santri dari UID”."}
              </p>
            </div>
          )}

          {/* Panduan */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="text-lg font-semibold">Panduan Pembaca</div>
            <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Keyboard size={18} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  <span className="font-medium text-foreground">Reader USB/Bluetooth (utama).</span>{" "}
                  Arahkan kursor ke kolom UID maka kartu otomatis "diketik" lalu Enter.
                  Kompatibel di semua perangkat.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Nfc size={18} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  <span className="font-medium text-foreground">Tempel Kartu (Web NFC).</span>{" "}
                  Hanya Chrome Android 89+. Kartu harus berisi rekaman NDEF teks/URL
                  berisi UID (Web NFC tidak membaca UID mentah kartu).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <User size={18} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  <span className="font-medium text-foreground">Input Manual.</span>{" "}
                  Ketik UID (contoh AB:CD:EF:12). Pemakaian di kolom ketik pada POS,
                  Tabungan, dan Data Santri otomatis dinormalkan.
                </span>
              </li>
            </ul>
            <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              Terakhir diperbarui {format(new Date(), "d MMMM yyyy", { locale: id })}.
              Desain: <code>docs/DESAIN-NFC.md</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
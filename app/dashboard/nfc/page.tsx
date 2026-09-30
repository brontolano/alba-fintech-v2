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
import { isWebNfcSupported, normalizeUid, parseAscDump, scanNfcUid, writeNfcText } from "@/lib/nfc";
import type { AscCardData } from "@/lib/nfc";
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
  // Cek data kartu ASC (dump MIFARE dari software writer)
  const [dump, setDump] = useState("");
  const [card, setCard] = useState<AscCardData | null>(null);
  const [dumpError, setDumpError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);

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

  const handleParseDump = () => {
    setDumpError(null);
    setCard(null);
    if (!dump.trim()) {
      setDumpError("Tempel dulu isi file dump kartu (nfc.txt).");
      return;
    }
    const parsed = parseAscDump(dump);
    if (!parsed || !parsed.uid) {
      setDumpError("Dump tidak dikenali — pastikan format “[ .. ] Alamat XX”.");
      return;
    }
    setCard(parsed);
    toast.success(`Kartu ${parsed.cardKind} · UID ${parsed.uid}`);
  };

  const handleWriteCard = async () => {
    if (!card?.uid || writing) return;
    if (!isWebNfcSupported()) {
      toast.error("Tulis kartu hanya bisa dari Chrome Android dengan NFC.");
      return;
    }
    const ok = confirm(
      `Tulis UID ${card.uid} ke kartu yang ditempelkan? Sekali saja per kartu — setelah ini kartu bisa dibaca via tombol “Tempel” di semua HP. Data blok kartu tidak diubah.`,
    );
    if (!ok) return;
    setWriting(true);
    try {
      await writeNfcText(card.uid);
      toast.success("Kartu aktif — sekarang bisa dibaca via “Tempel” di semua HP");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menulis kartu");
    } finally {
      setWriting(false);
    }
  };

  const handleUseCardUid = () => {
    if (!card?.uid) return;
    setUid(card.uid);
    setManual(card.uid);
    setStudent(null);
    setNotFound(null);
    toast.success(`UID ${card.uid} dimasukkan ke kolom pencarian`);
  };

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
                  <span className="font-medium text-foreground">Kartu ASC MIFARE mentah.</span>{" "}
                  Tidak bisa ditempel via Web NFC (tanpa NDEF). Pakai reader USB,
                  ketik UID manual, atau urai file dump di panel “Cek Data Kartu ASC”.
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

      {/* Cek Data Kartu ASC (MIFARE Classic, dump dari software writer) */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="text-lg font-semibold">Cek Data Kartu ASC</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Kartu ASC MIFARE mentah tidak bisa ditempel langsung via Web NFC (butuh
          rekaman NDEF). Tempel isi file dump kartu (<code>nfc.txt</code> dari software
          writer) untuk mengurai UID, nama, dan ID santri — lalu pakai UID-nya untuk
          mencari/mendaftarkan santri.
        </p>
        <textarea
          value={dump}
          onChange={(e) => setDump(e.target.value)}
          rows={5}
          placeholder="[ AF:C2:99:E7: ... ] Alamat 00 : ..."
          className="mt-4 w-full rounded-xl border border-border bg-background p-3 font-mono text-xs text-foreground outline-none focus:border-primary"
        />
        {dumpError ? (
          <p className="mt-2 text-sm text-rose-600">{dumpError}</p>
        ) : null}
        <button
          type="button"
          onClick={handleParseDump}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <ScanLine size={16} />
          Urai Data Kartu
        </button>

        {card ? (
          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  UID kartu · {card.cardKind}
                </p>
                <code className="font-mono text-xl font-bold text-foreground">
                  {card.uid}
                </code>
              </div>
              <button
                type="button"
                onClick={handleUseCardUid}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/15"
              >
                Pakai UID ini <ArrowRight size={14} />
              </button>
            </div>
            {webNfc ? (
              <button
                type="button"
                onClick={handleWriteCard}
                disabled={writing}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {writing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Nfc size={16} />
                )}
                {writing
                  ? "Tempelkan kartu — menulis..."
                  : "Tulis UID ke Kartu (aktivasi sekali)"}
              </button>
            ) : null}
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Nama di kartu: </span>
                <span className="font-medium text-foreground">{card.name ?? "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">ID di kartu: </span>
                <span className="font-medium text-foreground">{card.studentId ?? "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Nominal di kartu: </span>
                <span className="font-medium text-foreground">
                  {card.amounts.length > 0 ? card.amounts.join(" · ") : "—"}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Tanggal di kartu: </span>
                <span className="font-medium text-foreground">
                  {[
                    ...(card.timestamp ? [`tulis ${card.timestamp}`] : []),
                    ...card.dates,
                  ].join(" · ") || "—"}
                </span>
              </p>
            </div>
            <p className="mt-3 text-xs text-amber-600">
              UID kartu ({card.uid}) berbeda dengan ID santri di blok data
              {card.studentId ? ` (${card.studentId})` : ""} — daftarkan
              <span className="font-semibold"> UID</span>-nya di Data Santri, bukan ID-nya.
            </p>
            {card && !student ? (
              <Link
                href={`/dashboard/kpak/students/new?${(() => {
                  const q = new URLSearchParams();
                  if (card?.uid) q.set("uid", card.uid);
                  if (card?.studentId) q.set("nis", card.studentId);
                  if (card?.name) q.set("name", card.name);
                  return q.toString();
                })()}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm font-medium transition hover:bg-muted/80"
              >
                Daftarkan dengan data kartu ini <ArrowRight size={14} />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Panduan aktivasi kartu ASC mentah (sekali per kartu) */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
        <div className="text-lg font-semibold">
          Kartu Mentah Ditolak? Aktifkan Sekali per Kartu
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Kartu ASC dari writer masih mentah (tanpa NDEF) sehingga HP menolak
          dibaca maupun ditulisi. Aktifkan dulu — cukup sekali per kartu:
        </p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Install “NFC Tools”</span>{" "}
            (Play Store) di HP Android yang ada NFC-nya, lalu aktifkan NFC di
            pengaturan HP.
          </li>
          <li>
            <span className="font-medium text-foreground">Format kartu:</span> buka
            NFC Tools → <span className="font-medium text-foreground">Write → Format as NDEF</span> →
            tempel kartu → tunggu tulisan sukses. Kunci kartu ASC masih bawaan
            pabrik sehingga format langsung berhasil.
          </li>
          <li>
            <span className="font-medium text-foreground">Isi UID:</span> masih di NFC
            Tools → <span className="font-medium text-foreground">Write → Add a record → Text</span> →
            ketik UID kartu (mis. <code>AFC299E7</code> — salin dari hasil “Urai Data
            Kartu” di atas) → Write → tempel kartu yang sama.
          </li>
          <li>
            <span className="font-medium text-foreground">Uji di aplikasi ini:</span>{" "}
            tekan tombol <span className="font-medium text-foreground">“Tempel”</span> di
            atas lalu tempel kartu — UID harus terbaca. Atau pakai tombol hijau
            “Tulis UID ke Kartu” sebagai pengganti langkah 3.
          </li>
        </ol>
        <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
          Tiap kartu butuh aktivasi ini sekali saja (±30 detik/kartu). Kalau NFC Tools
          gagal format (kartu terkunci), kartu itu tetap bisa dipakai via reader USB
          atau ketik UID manual.
        </p>
      </div>
    </div>
  );
}
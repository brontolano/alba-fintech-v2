"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  ScanLine,
  ClipboardPaste,
  UserPlus,
  Loader2,
  CheckCircle2,
  ArrowRight,
  User,
} from "lucide-react";
import NfcUidInput from "@/components/nfc/NfcUidInput";
import { normalizeUid, parseAscDump } from "@/lib/nfc";
import type { AscCardData } from "@/lib/nfc";
import { usePageGuard } from "@/lib/use-page-guard";

interface StudentResult {
  id: string;
  studentNumber: string;
  name: string;
  className?: string | null;
  cardUid?: string | null;
  account?: { id: string; balance: number | string; status: string } | null;
}

interface Unit {
  id: string;
  name: string;
}

/** Arti tiap blok untuk tabel Blok | Isi | Arti. */
function artiBlok(
  block: number,
  ascii: string,
  decoded: string | null,
  card: AscCardData,
): string {
  if (block === 0) return `UID kartu ${card.uid} · ${card.cardKind}`;
  const teks = decoded ?? ascii;
  if (!teks) return "Kosong";
  if (/^\d{14}$/.test(teks)) return "Waktu tulis kartu (YYYYMMDDHHMMSS)";
  if (/^\d{4}-\d{2}-\d{2}$/.test(teks)) return "Tanggal di kartu";
  if (card.name && teks === card.name) return "Nama santri di kartu";
  if (card.studentId && teks === card.studentId) return "ID santri di kartu";
  if (/^\d+$/.test(teks) && teks.length >= 6) return "Nominal di kartu (Rp)";
  if (/^\d+$/.test(teks)) return "Kode/flag internal software writer";
  if (/^[A-Za-z0-9+/=]+$/.test(teks)) return "Teks/kode di kartu";
  return "Teks di kartu";
}

export default function NfcDaftarPage() {
  usePageGuard([], { allow: (u) => !!u?.id });
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const needUnit = role === "SUPERADMIN" || role === "PIMPINAN";

  const [tab, setTab] = useState<"dump" | "uid">("dump");
  const [dump, setDump] = useState("");
  const [card, setCard] = useState<AscCardData | null>(null);
  const [uid, setUid] = useState("");
  const [manual, setManual] = useState("");

  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState<StudentResult | null>(null);

  // Form santri baru dari kartu
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [nis, setNis] = useState("");
  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<StudentResult | null>(null);

  const lookupByUid = async (key: string) => {
    setSearching(true);
    setStudent(null);
    try {
      const res = await fetch(
        `/api/savings/lookup?cardUid=${encodeURIComponent(key)}`,
      );
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          toast("Kartu belum terdaftar — lengkapi form di bawah untuk buat santri.");
          return;
        }
        throw new Error(json.error || "Gagal mencari santri");
      }
      setStudent(json.data);
      toast.success(`Kartu milik: ${json.data.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mencari santri");
    } finally {
      setSearching(false);
    }
  };

  const prefillFromCard = (c: AscCardData) => {
    if (c.studentId) setNis(c.studentId);
    if (c.name) setNama(c.name);
  };

  const handleParseDump = () => {
    if (!dump.trim()) {
      toast.error("Tempel dulu isi file dump kartu (nfc.txt).");
      return;
    }
    const parsed = parseAscDump(dump);
    if (!parsed || !parsed.uid) {
      toast.error("Dump tidak dikenali — pastikan format “[ .. ] Alamat XX”.");
      return;
    }
    setCard(parsed);
    setUid(parsed.uid);
    setManual(parsed.uid);
    setStudent(null);
    setCreated(null);
    prefillFromCard(parsed);
    toast.success(`Kartu ${parsed.cardKind} · UID ${parsed.uid}`);
    lookupByUid(parsed.uid);
  };

  const handleUidSearch = () => {
    const key = normalizeUid(manual);
    if (!key) {
      toast.error("UID kosong — tempel kartu, paste UID, atau ketik manual.");
      return;
    }
    setUid(key);
    setCard(null);
    setCreated(null);
    lookupByUid(key);
  };

  const ensureUnits = async (): Promise<Unit[]> => {
    if (units.length > 0) return units;
    try {
      const res = await fetch("/api/units");
      if (!res.ok) return [];
      const data = await res.json();
      const list: Unit[] = (data.data ?? []).filter(
        (u: Unit) => !u.name.endsWith("(Lembaga)"),
      );
      setUnits(list);
      if (!unitId && list.length > 0) setUnitId(list[0].id);
      return list;
    } catch {
      return [];
    }
  };

  const handleCreate = async () => {
    const key = uid || normalizeUid(manual);
    if (!key) {
      toast.error("UID kartu belum ada.");
      return;
    }
    if (!nis.trim() || !nama.trim()) {
      toast.error("NIS dan Nama wajib diisi.");
      return;
    }
    let targetUnit = unitId;
    if (needUnit) {
      const list = await ensureUnits();
      targetUnit = unitId || list[0]?.id || "";
      if (!targetUnit) {
        toast.error("Pilih unit untuk santri ini.");
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/savings/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: nis.trim(),
          name: nama.trim(),
          className: kelas.trim() || undefined,
          cardUid: key,
          ...(targetUnit ? { unitId: targetUnit } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Gagal membuat santri");
      setCreated(json.data);
      setStudent(json.data);
      toast.success(`Santri dibuat + kartu ${key} terpasang + rekening dibuka`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat santri");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daftarkan Kartu Santri</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Baca data lama di kartu (UID + isi blok), cocokkan ke data santri — kalau
          belum ada, langsung buat santri + pasang kartu + buka rekening.
        </p>
      </div>

      {/* Sumber data kartu */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("dump")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === "dump" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <ClipboardPaste size={15} /> Tempel Dump Kartu
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("uid")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === "uid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <ScanLine size={15} /> UID Saja
            </span>
          </button>
        </div>

        {tab === "dump" ? (
          <div className="mt-4">
            <textarea
              value={dump}
              onChange={(e) => setDump(e.target.value)}
              rows={5}
              placeholder="Tempel nfc.txt (Alamat XX) atau Share dump .mct dari MIFARE Classic Tool"
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleParseDump}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <ScanLine size={16} />
              Baca Data Kartu
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <NfcUidInput
              value={manual}
              onChange={(v) => {
                setManual(v);
                setUid(normalizeUid(v));
              }}
              onEnter={handleUidSearch}
              label="UID Kartu"
              placeholder="Tempel kartu / salin dari NFC Tools / ketik, lalu Enter"
            />
            <button
              type="button"
              onClick={handleUidSearch}
              disabled={searching}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {searching ? <Loader2 size={16} className="animate-spin" /> : <User size={16} />}
              Cocokkan Kartu
            </button>
          </div>
        )}
      </div>

      {/* Tabel Blok | Isi | Arti */}
      {card ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <p className="text-sm font-semibold text-foreground">
              Isi kartu · UID <code className="font-mono">{card.uid}</code> · {card.cardKind}
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2">Blok</th>
                <th className="px-4 py-2">Isi</th>
                <th className="px-4 py-2">Arti</th>
              </tr>
            </thead>
            <tbody>
              {card.blocks.map((b) => {
                const isi = b.decoded ?? b.ascii;
                return (
                  <tr key={b.block} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {b.block.toString(16).toUpperCase().padStart(2, "0")}
                    </td>
                    <td className="break-all px-4 py-2 font-mono text-xs text-foreground">
                      {isi || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {artiBlok(b.block, b.ascii, b.decoded, card)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Hasil cocok: kartu milik santri */}
      {student ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={16} /> Kartu cocok dengan data santri
          </p>
          <p className="mt-2 text-lg font-bold text-foreground">{student.name}</p>
          <p className="text-sm text-muted-foreground">
            NIS {student.studentNumber}
            {student.className ? ` · ${student.className}` : ""} · Saldo Rp{" "}
            {Number(student.account?.balance || 0).toLocaleString("id-ID")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
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
              Buka Tabungan
            </Link>
            <Link
              href="/dashboard/pos"
              className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm font-medium transition hover:bg-muted/80"
            >
              Buka POS
            </Link>
          </div>
        </div>
      ) : null}

      {/* Form buat santri dari kartu */}
      {!student && (card || uid) && !created ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-lg font-semibold">Buat Santri dari Kartu Ini</div>
          <p className="mt-1 text-sm text-muted-foreground">
            UID <code className="font-mono">{uid}</code> belum terdaftar. Data di
            bawah sudah diisi otomatis dari kartu — periksa lalu simpan.
          </p>
          {needUnit ? (
            <label className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground">
              Unit
              <select
                value={unitId}
                onChange={async (e) => {
                  setUnitId(e.target.value);
                  if (!e.target.value) await ensureUnits();
                }}
                onFocus={() => ensureUnits()}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
              >
                <option value="">Pilih unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              NIS (dari kartu)
              <input
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                placeholder="cth: 14526047"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Kelas (opsional)
              <input
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                placeholder="cth: VII-A"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
            Nama Lengkap (dari kartu)
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama lengkap santri"
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {saving ? "Menyimpan..." : "Buat Santri + Pasang Kartu"}
          </button>
        </div>
      ) : null}

      {created ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-700">
          Santri {created.name} (NIS {created.studentNumber}) berhasil dibuat — kartu{" "}
          <code className="font-mono">{uid}</code> terpasang dan rekening tabungan
          dibuka otomatis.{" "}
          <Link
            href={`/dashboard/kpak/students/${created.id}`}
            className="font-semibold underline"
          >
            Lihat detail
          </Link>
        </div>
      ) : null}
    </div>
  );
}

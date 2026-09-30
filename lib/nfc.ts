/**
 * Utilitas kartu NFC untuk modul "Tempel Kartu / Input Text".
 *
 * Tiga jalur pembaca kartu yang didukung:
 *  1. Reader USB/Bluetooth (keyboard-wedge) — reader "mengetik" UID + Enter
 *     ke input; tanpa kode tambahan, cukup fokus input lalu tekan Enter.
 *  2. Web NFC (Chrome Android) — NDEFReader membaca rekaman NDEF (teks/URL)
 *     yang berisi UID. Catatan: Web NFC tidak mengekspos UID mentah kartu,
 *     hanya data NDEF, jadi kartu harus berisi rekaman teks/URL berisi UID.
 *  3. Input manual — ketik UID langsung; `normalizeUid` menyamakan format
 *     (huruf besar, separator dihapus) agar cocok dengan data tersimpan.
 */

export type NfcErrorCode =
  | "WEB_NFC_UNSUPPORTED"
  | "NFC_NOT_ALLOWED"
  | "NFC_TIMEOUT"
  | "NFC_READ_FAILED"
  | "NFC_ABORTED";

export class NfcError extends Error {
  code: NfcErrorCode;

  constructor(code: NfcErrorCode, message: string) {
    super(message);
    this.name = "NfcError";
    this.code = code;
  }
}

/** UID kanonik: huruf besar, tanpa spasi, titik dua, titik, atau garis. */
export function normalizeUid(raw: string): string {
  return (raw ?? "").trim().replace(/[\s:.\-]/g, "").toUpperCase();
}

/* ── Kartu ASC (Al-Basyariyah Smart Card, MIFARE Classic 1K) ──────────
 *
 * Kartu ASC ditulis oleh software writer kartu (BUKAN NDEF): tiap blok data
 * 16 byte berisi teks ASCII langsung (nama, tanggal) atau base64 dari angka
 * (ID santri, nominal, PIN, tanggal). Web NFC di HP TIDAK bisa membaca blok
 * mentah ini — hanya rekaman NDEF. Jadi alur yang didukung aplikasi:
 *   1. Baca UID kartu (reader USB keyboard-wedge / ketik manual), lalu
 *   2. lookup santri via /api/savings/lookup?cardUid=UID (server-side).
 * UID kartu (blok 0, mis. AFC299E7) BERBEDA dengan ID santri di blok data
 * (mis. "14526047") — jangan tertukar saat mendaftarkan kartu.
 *
 * `parseAscDump` mengurai teks dump ala nfc.txt ("[ .. ] Alamat XX : ..")
 * hasil unduhan software writer, untuk verifikasi isi kartu dan mengambil
 * UID yang benar sebelum didaftarkan ke Data Santri.
 */

export interface AscDataBlock {
  /** Nomor blok desimal (0-63 untuk 1K). */
  block: number;
  /** 16 byte heksa tanpa separator. */
  hex: string;
  /** Teks ASCII blok (tanpa padding NUL). */
  ascii: string;
  /** Hasil decode base64 bila ascii-nya base64 valid, selain itu null. */
  decoded: string | null;
}

export interface AscCardData {
  /** UID kanonik dari blok 0 (mis. "AFC299E7"). */
  uid: string;
  /** Jenis kartu dari SAK/ATQA blok 0 (mis. "MIFARE Classic 1K"). */
  cardKind: string;
  /** Nama terpanjang berhuruf (blok teks), bila ada. */
  name: string | null;
  /** Kandidat ID santri: decode digit terpanjang, bila ada. */
  studentId: string | null;
  /** Kandidat nominal (decode digit ≥6, mis. saldo), bila ada. */
  amounts: string[];
  /** Tanggal ISO (YYYY-MM-DD) yang tertulis di kartu, bila ada. */
  dates: string[];
  /** Stempel 14 digit (YYYYMMDDHHMMSS, waktu tulis kartu), bila ada. */
  timestamp: string | null;
  /** Semua blok data (blok trailer dilewati). */
  blocks: AscDataBlock[];
}

function hexToAscii(hex: string): string {
  let out = "";
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const code = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(code) || code === 0) continue;
    out += String.fromCharCode(code);
  }
  return out;
}

function tryBase64Decode(ascii: string): string | null {
  if (!/^[A-Za-z0-9+/]{4,}={0,2}$/.test(ascii) || ascii.length % 4 !== 0)
    return null;
  try {
    if (typeof Buffer !== "undefined") {
      const dec = Buffer.from(ascii, "base64").toString("ascii");
      // Round-trip: pastikan benar-benar base64, bukan teks kebetulan.
      if (Buffer.from(dec).toString("base64").replace(/=+$/, "") !==
        ascii.replace(/=+$/, ""))
        return null;
      if (!/^[\x20-\x7E]*$/.test(dec)) return null;
      return dec;
    }
  } catch {
    return null;
  }
  return null;
}

function detectCardKind(block0Hex: string): string {
  // Blok 0: UID0-3 | BCC | SAK | ATQA0-1 | data pabrikan.
  const sak = block0Hex.slice(10, 12).toUpperCase();
  const atqa = block0Hex.slice(12, 16).toUpperCase();
  if (sak === "08" && atqa === "0400") return "MIFARE Classic 1K";
  if (sak === "18" && atqa === "4400") return "MIFARE Classic 4K";
  if (sak === "00" && atqa === "4400") return "MIFARE Ultralight";
  return "MIFARE (tak dikenal)";
}

/**
 * Urai teks dump kartu ASC. Mengembalikan null bila tidak ada blok valid.
 * Trailer sektor (blok 3,7,11,... — kunci akses) otomatis dilewati.
 */
export function parseAscDump(text: string): AscCardData | null {
  const blocks: AscDataBlock[] = [];
  const lineRe = /\[\s*([0-9A-Fa-f:\s]+?)\s*\]\s*Alamat\s*([0-9A-Fa-f]+)/g;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(text ?? "")) !== null) {
    const hex = m[1].replace(/[\s:]/g, "").toUpperCase();
    const block = parseInt(m[2], 16);
    if (!/^[0-9A-F]+$/.test(hex) || hex.length !== 32) continue;
    if (Number.isNaN(block) || block < 0 || block > 63) continue;
    if (block % 4 === 3) continue; // trailer: KEYA/ACCESS/KEYB
    const ascii = hexToAscii(hex);
    blocks.push({ block, hex, ascii, decoded: tryBase64Decode(ascii) });
  }
  if (blocks.length === 0) return null;
  blocks.sort((a, b) => a.block - b.block);

  const block0 = blocks.find((b) => b.block === 0);
  const uid = block0 ? normalizeUid(block0.hex.slice(0, 8)) : "";
  const cardKind = block0 ? detectCardKind(block0.hex) : "tak dikenal";

  const texts = blocks.map((b) => b.ascii).filter((s) => s.length > 0);
  const decoded = blocks
    .map((b) => b.decoded)
    .filter((s): s is string => !!s && s.length > 0);
  const digits = decoded.filter((s) => /^\d+$/.test(s));

  const name =
    texts
      .filter((s) => /[A-Za-z]/.test(s) && /[^A-Za-z0-9+/=]/.test(s))
      .sort((a, b) => b.length - a.length)[0] ?? null;
  const amounts = digits.filter((s) => s.length >= 6);
  const studentId =
    digits.filter((s) => s.length >= 6).sort((a, b) => b.length - a.length)[0] ??
    null;
  const dates = Array.from(
    new Set(
      [...texts, ...decoded].flatMap((s) => {
        const found = s.match(/\b\d{4}-\d{2}-\d{2}\b/g);
        return found ?? [];
      }),
    ),
  );
  const timestamp =
    [...texts, ...decoded].find((s) => /^\d{14}$/.test(s)) ?? null;

  return { uid, cardKind, name, studentId, amounts, dates, timestamp, blocks };
}

export function isWebNfcSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "NDEFReader" in window;
}

interface NdefRecordLike {
  data?: unknown;
}

interface NdefMessageLike {
  records?: NdefRecordLike[];
}

export interface ScanNfcOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Membaca UID via Web NFC. Menunggu kartu ditempelkan ke ponsel.
 * Meloloskan nilai rekaman NDEF pertama (teks/URL) sebagai UID.
 * Melempar `NfcError` dengan kode yang bisa dipetakan ke UI.
 */
export function scanNfcUid(options: ScanNfcOptions = {}): Promise<string> {
  const { timeoutMs = 30000, signal } = options;

  return new Promise((resolve, reject) => {
    if (!isWebNfcSupported()) {
      reject(
        new NfcError(
          "WEB_NFC_UNSUPPORTED",
          "Web NFC tidak didukung browser/perangkat ini. Pakai reader USB/Bluetooth atau ketik manual.",
        ),
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const NDEFReaderCtor = (window as any).NDEFReader;
    const reader = new NDEFReaderCtor();

    let timer: ReturnType<typeof setTimeout> | undefined;

    const clearTimer = () => {
      if (timer) clearTimeout(timer);
    };

    const cleanup = () => {
      clearTimer();
      if (signal) signal.removeEventListener("abort", onAbort);
      reader.onreading = null;
      reader.onreadingerror = null;
    };

    const settle = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onAbort = () =>
      settle(new NfcError("NFC_ABORTED", "Pemindaian kartu dibatalkan."));

    reader.onreading = (event: { message?: NdefMessageLike }) => {
      let uid = "";
      for (const record of event.message?.records ?? []) {
        const data = record.data;
        if (typeof data === "string") {
          uid = data;
          break;
        }
        if (data instanceof ArrayBuffer) {
          uid = new TextDecoder().decode(data);
          if (uid) break;
        }
      }
      const peek = uid.trim();
      if (!peek) {
        settle(
          new NfcError(
            "NFC_READ_FAILED",
            "Kartu terbaca tanpa data UID (rekaman NDEF kosong). Ketik manual, atau isi kartu dengan rekaman teks/URL berisi UID.",
          ),
        );
        return;
      }
      cleanup();
      resolve(peek);
    };

    reader.onreadingerror = () => {
      settle(
        new NfcError(
          "NFC_READ_FAILED",
          "Gagal membaca kartu. Dekatkan kartu kembali dan coba lagi.",
        ),
      );
    };

    reader.scan().catch((error: unknown) => {
      const name = error instanceof Error ? error.name : String(error);
      if (name === "NotAllowedError" || name === "SecurityError") {
        settle(
          new NfcError(
            "NFC_NOT_ALLOWED",
            "Izin NFC ditolak. Aktifkan NFC dan izinkan situs ini menggakses NFC di pengaturan ponsel.",
          ),
        );
      } else {
        settle(
          new NfcError(
            "NFC_READ_FAILED",
            `Tidak bisa memulai pemindaian NFC (${name}).`,
          ),
        );
      }
    });

    timer = setTimeout(
      () =>
        settle(
          new NfcError(
            "NFC_TIMEOUT",
            `Tidak ada kartu terdeteksi dalam ${Math.round(timeoutMs / 1000)} detik.`,
          ),
        ),
      timeoutMs,
    );

    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}
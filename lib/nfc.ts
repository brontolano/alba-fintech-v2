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
/**
 * WIB (UTC+7) date helpers — satu sumber kebenaran untuk seluruh codebase.
 *
 * Dua jenis boundary:
 *
 * 1. **Range query** (`wibDayStart` / `wibDayEnd`):
 *    Dipakai untuk filter `transaction.date` dan field timestamp lain yang
 *    diisi `now()`. Offset +07:00 agar 00:00–23:59 WIB benar-benar mencakup
 *    hari operasional pesantren.
 *
 * 2. **Composite-key date** (`wibKeyDate`):
 *    Dipakai sebagai bagian unique-key (misal ShiftAttendance, ShiftSession,
 *    PosSession). Disimpan sebagai UTC midnight (`Z`) agar konsisten dengan
 *    data historis. JANGAN dipakai untuk range query.
 */

/** Offset WIB dalam milidetik. */
const WIB_MS = 7 * 3600 * 1000;

/** Tanggal hari ini dalam WIB sebagai "YYYY-MM-DD". */
export const wibDateStr = (now = Date.now()): string =>
  new Date(now + WIB_MS).toISOString().slice(0, 10);

/** Jam:menit WIB sekarang sebagai "HH:mm". */
export const wibHM = (now = Date.now()): string =>
  new Date(now + WIB_MS).toISOString().slice(11, 16);

// ── Range-query boundaries (WIB-correct) ──────────────────────────────

/** Awal hari WIB: `${dateStr}T00:00:00+07:00` → untuk filter gte. */
export const wibDayStart = (dateStr: string): Date =>
  new Date(`${dateStr}T00:00:00.000+07:00`);

/** Akhir hari WIB: `${dateStr}T23:59:59.999+07:00` → untuk filter lte. */
export const wibDayEnd = (dateStr: string): Date =>
  new Date(`${dateStr}T23:59:59.999+07:00`);

// ── Composite-key date (backward-compatible UTC midnight) ─────────────

/**
 * UTC midnight — dipakai HANYA sebagai composite-key date (ShiftAttendance,
 * ShiftSession, PosSession).  Data historis sudah tersimpan dengan konvensi
 * ini; JANGAN ubah tanpa migrasi data.
 */
export const wibKeyDate = (dateStr: string): Date =>
  new Date(`${dateStr}T00:00:00.000Z`);

// ── Label rendering (TZ-independent) ──────────────────────────────────

/**
 * Label pendek tanggal dalam bahasa Indonesia, mis. "2026-10-01" → "01 Okt".
 *
 * Tujuan: chart label di server yang TZ-nya bukan WIB (umumnya container
 * UTC) tidak boleh merender tanggal via `date-fns/format` terhadap `Date`
 * yang sudah ter-anchor WIB — `format` memakai local-time proses, sehingga
 * `2026-10-01T00:00:00+07:00` (= 2026-09-30T17:00Z) akan tercetak
 * "30 Sep" di server UTC.
 *
 * Pendekatan: string `dateStr` sudah pasti "YYYY-MM-DD" (sumber kebenaran
 * WIB dari `wibDateStr`), jadi label cukup dibangun dari komponen string
 * tanpa instantiasi `Date`. Aman terhadap TZ proses.
 */
const WIB_MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export const wibLabelShort = (dateStr: string): string => {
  // dateStr format: "YYYY-MM-DD"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr; // fallback defensif: tampilkan apa adanya
  const dd = m[3];
  const monthIdx = Number(m[2]) - 1;
  const mon =
    monthIdx >= 0 && monthIdx < WIB_MONTH_SHORT.length
      ? WIB_MONTH_SHORT[monthIdx]
      : m[2];
  return `${dd} ${mon}`;
};

/**
 * Utilities untuk fitur batas belanja harian tabungan (SMART_CARD).
 * Hari dibuka dalam zona WIB (UTC+7) karena dipakai di lingkungan
 * Pondok Pesantren (Kantor = KPAK, membayar di unit retail).
 */

export function startOfWibDay(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + 7 * 3600 * 1000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) - 7 * 3600 * 1000,
  );
}
/**
 * Helper untuk membangun label bucket (key) pada chart laporan.
 * Digunakan oleh app/api/reports/aggregations/route.ts agar konsisten
 * dengan Senin (start-of-week ISO) dan tidak lagi bergantung pada
 * pendekatan "7 hari mundur dari now" yang bisa meleset di batas bulan.
 *
 * Konteks: audit 2026-10-05 menemukan bahwa `period=weekly` memakai
 * loop mundur 7 hari dari now lalu `weekKey()` snap ke Senin, sehingga
 * Senin minggu sebelumnya bisa terlewat / collision. Helper ini adalah
 * sumber tunggal kebenaran (single source of truth) untuk:
 *   - weekKey(d): Senin dari tanggal d, format YYYY-MM-DD
 *   - buildWeeklyBuckets(now, weeks): array Senin berurutan, weeks Senin
 *     inklusif Senin minggu ini, selalu 7 hari jarak, tidak collision
 *
 * PENTING — semua kalkulasi memakai perspektif WIB (UTC+7), bukan local
 * time server. Pesantren beroperasi pada zona WIB; transaksi jam 02:00
 * WIB (= 19:00 UTC hari sebelumnya) adalah hari yang sama dengan
 * server-side UTC local time akan mengklasifikasikannya sebagai hari
 * sebelumnya. Untuk konsistensi dengan helper `lib/date-wib.ts`, kita
 * geser +7 jam lalu baca komponen UTC (yang sekarang merepresentasikan
 * field WIB).
 */

/** Offset WIB dalam milidetik. */
const WIB_MS = 7 * 3600 * 1000;

/** Kembalikan salinan Date yang komponen UTC-nya = komponen WIB. */
function asWib(d: Date): Date {
  return new Date(d.getTime() + WIB_MS);
}

/** Ambil Senin (start-of-week ISO) untuk tanggal `d`, format YYYY-MM-DD. */
export function weekKey(d: Date): string {
  const w = asWib(d);
  const day = w.getUTCDay(); // 0=Sun … 6=Sat, dari sudut pandang WIB
  const monMs = w.getTime() - ((day + 6) % 7) * 86400000;
  // `w` sudah +WIB, jadi baca langsung komponen UTC-nya (= komponen WIB).
  const mon = new Date(monMs);
  return `${mon.getUTCFullYear()}-${String(mon.getUTCMonth() + 1).padStart(2, "0")}-${String(mon.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Bangun daftar `weeks` Senin berurutan, diakhiri dengan Senin minggu ini
 * (inklusif). Contoh: sekarang Kamis 2026-10-08 → Senin minggu ini
 * 2026-10-05. Untuk weeks=4 → [2026-09-15, 2026-09-22, 2026-09-29, 2026-10-05].
 *
 * @param now tanggal acuan (biasanya `new Date()`)
 * @param weeks jumlah Senin yang dikembalikan, harus >= 1
 */
export function buildWeeklyBuckets(now: Date, weeks: number): string[] {
  if (!Number.isFinite(weeks) || weeks < 1) {
    throw new Error(`buildWeeklyBuckets: weeks harus >= 1 (got ${weeks})`);
  }
  const thisMonday = weekKey(now);
  const [y, m, d] = thisMonday.split("-").map((s) => Number(s));
  // Bangun Date untuk Senin minggu ini pada perspektif WIB (UTC midnight
  // sudah cukup karena `weekKey` akan menormalkan dari shift +7h lagi).
  const mondayMs = Date.UTC(y, m - 1, d) - WIB_MS;
  const monday = new Date(mondayMs);
  const keys: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const k = new Date(monday.getTime() - i * 7 * 86400000);
    keys.push(weekKey(k));
  }
  return keys;
}

/**
 * Kembalikan label hari (WIB) untuk tanggal `d` sebagai "YYYY-MM-DD".
 * Konsisten dengan `weekKey()`: transaksi jam 02:00 WIB (= 19:00 UTC hari
 * sebelumnya) tetap masuk hari yang sama di WIB, bukan hari sebelumnya
 * di local-time server (umumnya UTC).
 */
export function dayKey(d: Date): string {
  const w = asWib(d);
  return `${w.getUTCFullYear()}-${String(w.getUTCMonth() + 1).padStart(2, "0")}-${String(w.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Bangun daftar `days` hari terakhir (WIB), inklusif hari ini.
 * Contoh: sekarang Kamis 2026-10-08 → days=7 → 7 label YYYY-MM-DD
 * dari 2026-10-02 sampai 2026-10-08, urut naik.
 *
 * @param now tanggal acuan (biasanya `new Date()`)
 * @param days jumlah hari yang dikembalikan, harus >= 1
 */
export function buildDailyBuckets(now: Date, days: number): string[] {
  if (!Number.isFinite(days) || days < 1) {
    throw new Error(`buildDailyBuckets: days harus >= 1 (got ${days})`);
  }
  const today = dayKey(now);
  const [y, m, d] = today.split("-").map((s) => Number(s));
  // UTC midnight untuk hari ini dalam WIB → kurangi WIB_MS agar Date lokal
  // menyimpan epoch hari ini; shift +WIB di asWib() akan menormalkan lagi.
  const todayMs = Date.UTC(y, m - 1, d) - WIB_MS;
  const todayDate = new Date(todayMs);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = new Date(todayDate.getTime() - i * 86400000);
    keys.push(dayKey(k));
  }
  return keys;
}

/**
 * Kembalikan label bulan (WIB) untuk tanggal `d` sebagai "YYYY-MM".
 * Konsisten dengan `weekKey()` / `dayKey()`: batas bulan mengikuti WIB,
 * bukan local-time server.
 */
export function monthKey(d: Date): string {
  const w = asWib(d);
  return `${w.getUTCFullYear()}-${String(w.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Bangun daftar `months` bulan terakhir (WIB), inklusif bulan ini.
 * Contoh: sekarang 2026-10-08 → months=6 → ["2026-05", "2026-06",
 * "2026-07", "2026-08", "2026-09", "2026-10"], urut naik.
 *
 * @param now tanggal acuan (biasanya `new Date()`)
 * @param months jumlah bulan yang dikembalikan, harus >= 1
 */
export function buildMonthlyBuckets(now: Date, months: number): string[] {
  if (!Number.isFinite(months) || months < 1) {
    throw new Error(`buildMonthlyBuckets: months harus >= 1 (got ${months})`);
  }
  const thisMonth = monthKey(now);
  const [y, m] = thisMonth.split("-").map((s) => Number(s));
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    // Bekerja pada angka bulan absolut agar tidak slip tahun.
    const total = (y * 12 + (m - 1)) - i;
    const yr = Math.floor(total / 12);
    const mo = (total % 12) + 1;
    keys.push(
      `${yr}-${String(mo).padStart(2, "0")}`,
    );
  }
  return keys;
}

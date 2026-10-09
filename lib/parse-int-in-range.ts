/**
 * Helper parseInt dengan validasi rentang — single source of truth.
 *
 * Audit (2026-10-05) menemukan pola rentan `Math.min(Number(q.get("limit")),
 * N)` di beberapa endpoint listing. Pola ini menerima:
 *   - `?limit=abc` → `Number("abc") = NaN` → `Math.min(NaN, N) = NaN`
 *     → Prisma `take: NaN` → error 500.
 *   - `?limit=-5` → `Math.min(-5, N) = -5` → Prisma `take: -5` → error.
 *   - `?limit=0`  → `take: 0` → respons kosong tanpa indikasi kesalahan.
 *
 * Helper ini menolak NaN / Infinity / bilangan di bawah `min` dengan
 * mengembalikan `fallback`, dan menutup upper-bound via `Math.min(n, max)`.
 * Dipakai via Zod `.transform` agar input invalid otomatis jadi 400
 * (`safeParse` mengembalikan success=false) — bukan error 500 dari Prisma.
 *
 * @param raw      string query (mis. `q.get("limit") ?? ""`)
 * @param fallback nilai yang dikembalikan bila input invalid / di luar `min`
 * @param min      batas bawah inklusif
 * @param max      batas atas inklusif (cap DoS ringan via `take` besar)
 */
export function parseIntInRange(
  raw: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.min(n, max);
}

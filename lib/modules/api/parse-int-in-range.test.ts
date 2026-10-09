import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI: `app/api/notifications/route.ts` GET `limit` query harus aman dari
 * input berbahaya — bilangan negatif, NaN (non-angka), atau bilangan sangat
 * besar yang dapat membebani Prisma `take`.
 *
 * Sprint sebelumnya (notifications hardening): `parseInt(val) || 10` (sebelum
 * patch) menerima NaN untuk `?limit=abc` dan bilangan besar tanpa batas
 * atas, sehingga Prisma menarik seluruh baris notifikasi user (DoS ringan
 * via `take: 99999`).
 *
 * Sprint ini: helper inline `parseIntInRange` di route telah di-ekstrak ke
 * `lib/parse-int-in-range.ts` (single source of truth). Endpoint lain
 * (`app/api/purchase-requests/route.ts`) memakai helper yang sama. Test
 * SOURCE marker di sini mengunci BAHWA route tetap mengimpor helper +
 * konstanta upper-bound; helper itu sendiri diuji unit-level di
 * `lib/parse-int-in-range.test.ts`.
 */

const ROOT = process.cwd();
const SRC = "app/api/notifications/route.ts";
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("route notifications ada dan readable", () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, SRC)),
    `route hilang: ${SRC}`,
  );
});

test("notifications: route mengimpor helper parseIntInRange dari lib bersama", () => {
  const src = read(SRC);
  // Helper dipusatkan di `lib/parse-int-in-range.ts` agar single source of
  // truth — endpoint lain tinggal impor. Regex: baris `import { ...
  // parseIntInRange ... } from "@/lib/parse-int-in-range"`.
  assert.ok(
    /import\s*\{[^}]*\bparseIntInRange\b[^}]*\}\s*from\s*["']@\/lib\/parse-int-in-range["']/.test(src),
    "impor parseIntInRange dari @/lib/parse-int-in-range tidak ditemukan — sanitasi limit tidak lagi diterapkan via helper bersama",
  );
});

test("notifications: ada konstanta upper-bound untuk limit", () => {
  const src = read(SRC);
  // Batas atas eksplisit, bukan angka magic scattered.
  assert.ok(
    /NOTIFICATION_LIMIT_MAX\s*=\s*\d+/.test(src),
    "konstanta NOTIFICATION_LIMIT_MAX tidak ditemukan",
  );
});

test("notifications: limit default 10 ketika query kosong", () => {
  const src = read(SRC);
  // Transform menggunakan fallback 10.
  assert.ok(
    /parseIntInRange\([^)]*,\s*10\s*,/.test(src),
    "fallback 10 untuk limit tidak ditemukan di parseIntInRange",
  );
});

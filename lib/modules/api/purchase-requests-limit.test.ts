import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI: `app/api/purchase-requests/route.ts` GET `limit` query harus aman dari
 * input berbahaya — bilangan negatif, NaN (non-angka), atau bilangan sangat
 * besar yang dapat membebani Prisma `take` / `count` join.
 *
 * Sebelumnya: `Math.min(Number(q.get("limit") ?? 50), 200)` (sebelum patch
 * sprint ini) menerima NaN untuk `?limit=abc` (Number("abc")=NaN,
 * Math.min(NaN,200)=NaN -> Prisma error) dan bilangan negatif untuk
 * `?limit=-5` (Math.min(-5,200)=-5 -> Prisma error). Audit endpoint listing
 * `app/api/notifications/route.ts` (sprint sebelumnya) menemukan pola yang
 * sama di DoS ringan.
 *
 * Test ini mengunci SOURCE marker agar refactor berikutnya yang melemahkan
 * sanitasi langsung gagal.
 */

const ROOT = process.cwd();
const SRC = "app/api/purchase-requests/route.ts";
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("route purchase-requests ada dan readable", () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, SRC)),
    `route hilang: ${SRC}`,
  );
});

test("purchase-requests: route mengimpor helper parseIntInRange dari lib bersama", () => {
  const src = read(SRC);
  // Helper dipusatkan di `lib/parse-int-in-range.ts` (single source of truth).
  // Endpoint lain (notifications) memakai helper yang sama. Regex mengunci
  // BAHWA route memakai helper bersama — bukan duplikasi inline.
  assert.ok(
    /import\s*\{[^}]*\bparseIntInRange\b[^}]*\}\s*from\s*["']@\/lib\/parse-int-in-range["']/.test(src),
    "impor parseIntInRange dari @/lib/parse-int-in-range tidak ditemukan — sanitasi limit tidak lagi diterapkan via helper bersama",
  );
});

test("purchase-requests: ada konstanta upper-bound untuk limit", () => {
  const src = read(SRC);
  // Batas atas eksplisit, bukan angka magic scattered.
  assert.ok(
    /PURCHASE_REQUEST_LIMIT_MAX\s*=\s*\d+/.test(src),
    "konstanta PURCHASE_REQUEST_LIMIT_MAX tidak ditemukan",
  );
});

test("purchase-requests: limit default 50 ketika query kosong", () => {
  const src = read(SRC);
  // Helper dipanggil dengan fallback 50.
  assert.ok(
    /parseIntInRange\([^)]*,\s*50\s*,/.test(src),
    "fallback 50 untuk limit tidak ditemukan di parseIntInRange",
  );
});

test("purchase-requests: Number(val) telanjang sudah tidak dipakai untuk limit", () => {
  const src = read(SRC);
  // Pola lama yang rentan: `Math.min(Number(q.get("limit") ?? 50), 200)`.
  // Setelah patch, yang muncul hanya `parseIntInRange(...)` di baris limit.
  const block = src.split(/\r?\n/).find((l) => /limit\s*=/.test(l)) || "";
  assert.ok(
    !/Math\.min\(\s*Number\(q\.get\(\s*["']limit["']\s*\)\s*\?\?\s*\d+\s*\),\s*\d+\s*\)/.test(block),
    "pola lama `Math.min(Number(q.get('limit') ?? N), M)` masih ada — sanitasi limit tidak lagi diterapkan",
  );
});

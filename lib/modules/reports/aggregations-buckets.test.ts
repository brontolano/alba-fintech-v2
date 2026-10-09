import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI — Bucket waktu laporan (`/api/reports/aggregations`).
 *
 * Audit MEDIUM-3 & MEDIUM-4 (docs/AUDIT-MODUL-2026-10-05.md): route
 * aggregations sebelumnya memakai `Math.ceil(d.getDate() / 7)` untuk
 * bucket weekly (bucket reset tiap bulan, bisa collision) dan memakai
 * `now.getDate() - 27` / `now.getDate() - 6` dengan komponen lokal
 * server (meleset di WIB boundary).
 *
 * Perbaikan di working tree: route sekarang mengimpor helper dari
 * `@/lib/modules/reports/buckets`:
 *   - buildWeeklyBuckets / buildDailyBuckets / buildMonthlyBuckets
 *     untuk inisialisasi `monthlyData`
 *   - weekKey / dayKey / monthKey untuk key transaksi per-bucket
 *   - anchor startDate harian & mingguan memakai helper agar konsisten
 *     dengan perspektif WIB.
 *
 * Test ini mengunci SOURCE marker agar refactor berikutnya yang
 * menghapus impor helper (kembali ke logika inline) atau
 * mengembalikan `Math.ceil(getDate() / 7)` segera terdeteksi. Test
 * HANYA mengecek source — tidak mengeksekusi route, tidak butuh DB.
 */

const ROOT = process.cwd();
const SRC = "app/api/reports/aggregations/route.ts";
const read = () => fs.readFileSync(path.join(ROOT, SRC), "utf8");

test("route aggregations ada dan readable", () => {
  assert.ok(fs.existsSync(path.join(ROOT, SRC)), `route hilang: ${SRC}`);
});

test("impor helper buckets: 6 nama dipakai", () => {
  const src = read();
  // Impor blok `import { ... } from "@/lib/modules/reports/buckets"`.
  // 6 nama ini harus tetap dipakai route; menghapus salah satu = regresi.
  const importBlock = /import\s*\{[\s\S]*?\}\s*from\s*["']@\/lib\/modules\/reports\/buckets["']/;
  assert.ok(importBlock.test(src), "blok import helper buckets hilang");
  for (const name of [
    "buildWeeklyBuckets",
    "weekKey",
    "buildDailyBuckets",
    "dayKey",
    "buildMonthlyBuckets",
    "monthKey",
  ]) {
    assert.ok(
      src.includes(name),
      `helper '${name}' tidak diimpor / tidak dipakai di route`,
    );
  }
});

test("weekly: Math.ceil(getDate() / 7) tidak boleh muncul lagi", () => {
  const src = read();
  assert.ok(
    !/Math\.ceil\s*\(\s*d\.getDate\s*\(\s*\)\s*\/\s*7\s*\)/.test(src),
    "rumus Math.ceil(getDate() / 7) untuk bucket weekly masih ada — ini bug audit",
  );
  assert.ok(
    !/Math\.ceil\s*\(\s*[a-zA-Z_]+\.getDate\s*\(\s*\)\s*\/\s*7\s*\)/.test(src),
    "varian Math.ceil(*.getDate() / 7) masih ada",
  );
});

test("weekly: template key 'YYYY-MM-Wn' tidak boleh lagi untuk weekly", () => {
  const src = read();
  // Pola lama: `${d.getFullYear()}-${...}-W${weekNum}` — weekNum dari Math.ceil
  // tidak dipakai lagi. Sekarang weekly key adalah Senin (YYYY-MM-DD) tanpa Wn.
  assert.ok(
    !/-W\$\{/.test(src),
    "template key weekly masih memakai suffix 'W${...}' — harus Senin murni",
  );
});

test("anchor startDate: tidak lagi pakai getDate() lokal server", () => {
  const src = read();
  // Pola lama: now.getDate() - 27 (weekly) atau now.getDate() - 6 (daily).
  // Anchor sekarang melalui helper buildWeeklyBuckets / buildDailyBuckets.
  assert.ok(
    !/now\.getDate\s*\(\s*\)\s*-\s*27/.test(src),
    "anchor 'now.getDate() - 27' masih ada — harus via buildWeeklyBuckets",
  );
  assert.ok(
    !/now\.getDate\s*\(\s*\)\s*-\s*6/.test(src),
    "anchor 'now.getDate() - 6' masih ada — harus via buildDailyBuckets",
  );
});

test("daily: inisialisasi monthlyData memakai buildDailyBuckets", () => {
  const src = read();
  // Cari blok groupBy === "day" dan pastikan body-nya berisi buildDailyBuckets
  // Batas: dari `if (groupBy === "day")` hingga `} else if (groupBy === "week")`
  const start = src.indexOf('if (groupBy === "day")');
  const stop = src.indexOf('} else if (groupBy === "week")');
  assert.ok(start >= 0 && stop > start, "blok groupBy day/week hilang");
  const block = src.slice(start, stop);
  assert.ok(
    block.includes("buildDailyBuckets"),
    "inisialisasi bucket day harus memakai buildDailyBuckets, bukan loop manual",
  );
  // Harus ada iterasi for-of yang membuat key — bukan template literal inline.
  assert.ok(
    /for\s*\(\s*const\s+key\s+of\s+buildDailyBuckets/.test(block),
    "loop inisialisasi bucket day bukan 'for (const key of buildDailyBuckets(...))'",
  );
});

test("weekly: inisialisasi monthlyData memakai buildWeeklyBuckets (4 Senin)", () => {
  const src = read();
  const start = src.indexOf('} else if (groupBy === "week")');
  const stop = src.indexOf("} else {", start);
  assert.ok(start >= 0 && stop > start, "blok groupBy week hilang");
  const block = src.slice(start, stop);
  assert.ok(
    block.includes("buildWeeklyBuckets"),
    "inisialisasi bucket week harus memakai buildWeeklyBuckets",
  );
  // Jumlah Senin = 4 (mingguan = 4 minggu terakhir)
  assert.ok(
    /buildWeeklyBuckets\s*\(\s*now\s*,\s*4\s*\)/.test(block),
    "buildWeeklyBuckets harus dipanggil dengan 4 Senin",
  );
});

test("monthly: inisialisasi monthlyData memakai buildMonthlyBuckets", () => {
  const src = read();
  // Blok else (groupBy === "month" untuk monthly/6months/12months/year)
  const start = src.indexOf("} else {");
  assert.ok(start >= 0, "blok else groupBy hilang");
  const block = src.slice(start);
  // Ambil hanya blok inisialisasi (sebelum 'Build monthly array')
  const initEnd = block.indexOf("Build monthly array");
  const init = initEnd > 0 ? block.slice(0, initEnd) : block;
  assert.ok(
    init.includes("buildMonthlyBuckets"),
    "inisialisasi bucket month harus memakai buildMonthlyBuckets",
  );
  assert.ok(
    /buildMonthlyBuckets\s*\(\s*now\s*,\s*months\s*\)/.test(init),
    "buildMonthlyBuckets harus dipanggil dengan parameter months",
  );
});

test("keying per-tx: dayKey, weekKey, monthKey dipakai konsisten", () => {
  const src = read();
  // Lokasi: pada loop for (const tx of transactions) {...}
  const start = src.indexOf("for (const tx of transactions)");
  assert.ok(start >= 0, "loop for (const tx of transactions) hilang");
  const stop = src.indexOf("Build monthly array", start);
  const block = src.slice(start, stop > 0 ? stop : src.length);
  // Tiap cabang groupBy harus memakai helper, bukan template inline.
  assert.ok(
    /groupBy\s*===\s*["']day["'][\s\S]{0,200}key\s*=\s*dayKey\s*\(\s*d\s*\)/.test(block),
    "cabang groupBy day harus memakai dayKey(d) — bukan template literal",
  );
  assert.ok(
    /groupBy\s*===\s*["']week["'][\s\S]{0,200}key\s*=\s*weekKey\s*\(\s*d\s*\)/.test(block),
    "cabang groupBy week harus memakai weekKey(d) — bukan Math.ceil",
  );
  assert.ok(
    /(\}\s*else\s*\{\s*key\s*=\s*monthKey\s*\(\s*d\s*\))/.test(block),
    "cabang groupBy month harus memakai monthKey(d) — bukan template literal",
  );
});

test("WIB: anchor daily/weekly lewat helper (memakai build*Buckets)", () => {
  const src = read();
  // Anchor startDate untuk daily, weekly, dan monthly harus via helper
  // agar konsisten dengan perspektif WIB.
  const dailyAnchor = /if\s*\(\s*parsed\.data\.period\s*===\s*["']daily["']\s*\)\s*\{[\s\S]{0,400}buildDailyBuckets/.test(src);
  assert.ok(
    dailyAnchor,
    "anchor startDate harian tidak lagi lewat buildDailyBuckets",
  );
  const weeklyAnchor = /if\s*\(\s*parsed\.data\.period\s*===\s*["']weekly["']\s*\)\s*\{[\s\S]{0,400}buildWeeklyBuckets/.test(src);
  assert.ok(
    weeklyAnchor,
    "anchor startDate mingguan tidak lagi lewat buildWeeklyBuckets",
  );
  const monthlyAnchor = /\} else if\s*\(\s*parsed\.data\.period\s*===\s*["']monthly["']\s*\)\s*\{[\s\S]{0,400}buildMonthlyBuckets/.test(src);
  assert.ok(
    monthlyAnchor,
    "anchor startDate bulanan tidak lagi lewat buildMonthlyBuckets",
  );
});

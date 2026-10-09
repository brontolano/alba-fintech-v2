import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI: anchor "bulan ini" di `seedDemoData` harus WIB, bukan server-local
 * TZ.
 *
 * Audit MODUL 2026-10-05 (HIGH — "Batas hari memakai timezone server")
 * menandai 1 site di `lib/data-management.ts` (seedDemoData, line 793-808):
 *   1. `monthPrefix` — `today.getFullYear() + today.getMonth() + 1`
 *   2. `monthStart` — `new Date(today.getFullYear(), today.getMonth(), 1)`
 *   3. `monthEnd` — `new Date(today.getFullYear(), today.getMonth() + 1, 0,
 *      23, 59, 59, 999)`
 *
 * Saat runtime UTC (Hostinger container `TZ=UTC`):
 *   - 00:00–07:00 WIB (= 17:00–24:00 UTC hari sebelumnya), `today.setHours
 *     (0,0,0,0)` menghasilkan tanggal UTC yang masih "hari kemarin" (atau
 *     bulan kemarin di awal bulan), sehingga:
 *     a) `monthPrefix` menjadi bulan sebelumnya → `period: M2026-09` padahal
 *        user pesantren sudah Oktober 2026.
 *     b) `monthStart`/`monthEnd` di-anchor ke UTC midnight, bukan WIB.
 *        Alokasi demo `startDate`/`endDate` masuk DB sebagai UTC, inkonsisten
 *        dengan helper `wibDayStart`/`wibDayEnd` yang dipakai modul
 *        kpak/allocations dan route baca laporan.
 *
 * Pola perbaikan sama dengan 6 modul sebelumnya (handovers, reconciliation,
 * retail/sisa, dashboard/aggregates, transactions, kpak/allocations,
 * purchase-requests): label/rentang bulan memakai `wibDateStr().slice(0, 7)`,
 * lalu `monthStart`/`monthEnd` dihitung dari komponen Y/M hasil slice
 * tersebut via `Date.UTC` (Z midnight, bukan local-time). Komposit-key
 * `today = new Date(); today.setHours(0,0,0,0)` tetap dipakai untuk
 * posSession.date & cashHandover.date (konsisten dengan data historis).
 *
 * Test ini SOURCE-presence agar refactor berikutnya yang menghapus
 * guard segera gagal.
 */

const ROOT = process.cwd();
const SRC = "lib/data-management.ts";
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("data-management: seedDemoData import wibDateStr dari ./date-wib", () => {
  const src = read(SRC);
  // Impor eksplisit agar helper tersedia di scope seedDemoData.
  assert.ok(
    /import\s*\{[^}]*\bwibDateStr\b[^}]*\}\s*from\s*["']\.\/date-wib["']/.test(
      src,
    ),
    "seedDemoData harus mengimpor wibDateStr dari ./date-wib",
  );
});

test("data-management: monthPrefix di seedDemoData memakai wibDateStr().slice(0, 7)", () => {
  const src = read(SRC);
  // Pola baru: `const monthPrefix = wibDateStr().slice(0, 7);`
  assert.ok(
    /const\s+monthPrefix\s*=\s*wibDateStr\(\)\.slice\(\s*0\s*,\s*7\s*\)/.test(
      src,
    ),
    "monthPrefix harus memakai wibDateStr().slice(0, 7) — bukan today.getFullYear/getMonth+1 server-local",
  );
});

test("data-management: monthStart di seedDemoData memakai Date.UTC(Y, M-1, 1)", () => {
  const src = read(SRC);
  // Pola baru: `const monthStart = new Date(Date.UTC(yy, mm - 1, 1, 0, 0, 0, 0));`
  assert.ok(
    /const\s+monthStart\s*=\s*new\s+Date\(Date\.UTC\(\s*yy\s*,\s*mm\s*-\s*1\s*,\s*1\b/.test(
      src,
    ),
    "monthStart harus memakai Date.UTC(yy, mm - 1, 1, ...) — bukan new Date(today.getFullYear, today.getMonth, 1) server-local",
  );
});

test("data-management: monthEnd di seedDemoData memakai Date.UTC(Y, M, 0, 23, 59, 59, 999)", () => {
  const src = read(SRC);
  // Pola baru: hari terakhir bulan = Date.UTC bulan berikutnya, hari 0.
  // Deklarasi boleh multi-line (`new Date(\n  Date.UTC(...)\n)`).
  assert.ok(
    /const\s+monthEnd\s*=\s*new\s+Date\([\s\S]*?Date\.UTC\(\s*yy\s*,\s*mm\s*,\s*0\s*,\s*23\s*,\s*59\s*,\s*59\s*,\s*999\s*\)/.test(
      src,
    ),
    "monthEnd harus memakai Date.UTC(yy, mm, 0, 23, 59, 59, 999) — bukan today.getFullYear/today.getMonth+1 server-local",
  );
});

test("data-management: seedDemoData tidak lagi memakai today.getFullYear()/getMonth() untuk monthPrefix", () => {
  const src = read(SRC);
  // Pemeriksaan negatif: anchor bulan berbasis TZ server harus hilang total.
  // Pola lama yang harus hilang:
  //   `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  const oldPrefix =
    /\$\{today\.getFullYear\(\)\}\s*-\s*\$\{String\(\s*today\.getMonth\(\)\s*\+\s*1\s*\)\.padStart/;
  assert.ok(
    !oldPrefix.test(src),
    "monthPrefix tidak boleh lagi memakai today.getFullYear()/getMonth() server-local",
  );
  // monthStart baru juga tidak boleh memakai today.getFullYear()/today.getMonth():
  const oldMonthStart =
    /new\s+Date\(\s*today\.getFullYear\(\)\s*,\s*today\.getMonth\(\)\s*,\s*1\s*\)/;
  assert.ok(
    !oldMonthStart.test(src),
    "monthStart tidak boleh lagi memakai new Date(today.getFullYear(), today.getMonth(), 1) server-local",
  );
  // monthEnd baru juga tidak boleh memakai today.getFullYear()/today.getMonth()+1:
  const oldMonthEnd =
    /new\s+Date\(\s*today\.getFullYear\(\)\s*,\s*today\.getMonth\(\)\s*\+\s*1\s*,\s*0\s*,\s*23\s*,\s*59\s*,\s*59\s*,\s*999\s*\)/;
  assert.ok(
    !oldMonthEnd.test(src),
    "monthEnd tidak boleh lagi memakai new Date(today.getFullYear(), today.getMonth()+1, 0, 23,59,59,999) server-local",
  );
});

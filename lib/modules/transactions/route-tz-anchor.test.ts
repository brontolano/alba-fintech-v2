import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI: anchor "hari ini" / batas hari di `/api/transactions` harus
 * WIB, bukan server-local TZ.
 *
 * Audit MODUL 2026-10-05 (HIGH — "Batas hari memakai timezone server")
 * menandai 3 site di `app/api/transactions/route.ts`:
 *   1. `case "today"` switch — `new Date(now.getFullYear(), ...)`
 *   2. `todayStart` untuk tile ringkasan "Hari Ini" — `setHours(0,0,0,0)`
 *   3. `endDate` user-supplied — `setHours(23, 59, 59, 999)` setelah
 *      `new Date('YYYY-MM-DD')` yang di-parser sebagai UTC midnight.
 *
 * Saat runtime UTC (Hostinger container `TZ=UTC`):
 *   - Site 1 & 2: transaksi 02:00 WIB (=19:00 UTC hari sebelumnya) jatuh
 *     ke "kemarin" padahal user pesantren menganggapnya "hari ini".
 *   - Site 3: filter `endDate=2026-10-08` kehilangan 7 jam terakhir hari
 *     jika `setHours` memakai TZ server (UTC → 23:59 UTC; WIB → 23:59
 *     WIB = 16:59 UTC, memotong transaksi sore/malam hari itu).
 *
 * Pola perbaikan sama dengan 4 modul sebelumnya (handovers,
 * reconciliation, retail/sisa, dashboard/aggregates): helper terpusat
 * `wibDayStart` / `wibDayEnd` / `wibDateStr` dari `@/lib/date-wib`.
 * Test ini SOURCE-presence agar refactor berikutnya yang menghapus
 * guard segera gagal.
 */

const ROOT = process.cwd();
const SRC = "app/api/transactions/route.ts";
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("transactions/route: import wibDayStart, wibDayEnd & wibDateStr dari @/lib/date-wib", () => {
  const src = read(SRC);
  assert.ok(
    /from\s+["']@\/lib\/date-wib["']/.test(src),
    "harus mengimpor helper WIB agar batas hari konsisten",
  );
  assert.ok(/\bwibDayStart\b/.test(src), "wibDayStart wajib dipakai");
  assert.ok(/\bwibDayEnd\b/.test(src), "wibDayEnd wajib dipakai untuk endDate");
  assert.ok(/\bwibDateStr\b/.test(src), "wibDateStr wajib dipakai");
});

test("transactions/route: case 'today' memakai wibDayStart (bukan Date constructor server-local)", () => {
  const src = read(SRC);
  // Pola lama: `startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());`
  // harus hilang agar tidak lagi bergantung TZ server.
  assert.ok(
    !/startDate\s*=\s*new\s+Date\(\s*now\.getFullYear\(\)/.test(src),
    "case 'today' tidak boleh lagi memakai Date constructor server-local",
  );
  // Pola baru: anchor WIB. Regex mengizinkan komentar di antara `case` dan
  // `startDate =` (beberapa baris komentar // atau /* */).
  const anchorRe =
    /case\s+["']today["']:\s*\n(?:\s*\/\/[^\n]*\n|\s*\/\*[^]*?\*\/\s*\n)*\s*startDate\s*=\s*wibDayStart\(wibDateStr\(Date\.now\(\)\)\)/;
  assert.ok(
    anchorRe.test(src),
    "case 'today' harus anchor ke wibDayStart(wibDateStr(Date.now()))",
  );
});

test("transactions/route: todayStart untuk tile ringkasan memakai wibDayStart", () => {
  const src = read(SRC);
  // Pola lama: `const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);`
  // harus hilang.
  assert.ok(
    !/const\s+todayStart\s*=\s*new\s+Date\(\)\s*;\s*\n\s*todayStart\.setHours\(0,\s*0,\s*0,\s*0\)/.test(src),
    "todayStart tidak boleh lagi memakai setHours(0,0,0,0) server-local",
  );
  // Pola baru.
  assert.ok(
    /const\s+todayStart\s*=\s*wibDayStart\(wibDateStr\(Date\.now\(\)\)\)/.test(src),
    "todayStart harus memakai wibDayStart(wibDateStr(Date.now()))",
  );
});

test("transactions/route: endDate filter memakai wibDayEnd (bukan setHours server-local)", () => {
  const src = read(SRC);
  // Pola lama: `const end = new Date(parsed.data.endDate); end.setHours(23,59,59,999);`
  // harus hilang agar akhir hari benar-benar 23:59 WIB, bukan 23:59 server-local.
  assert.ok(
    !/const\s+end\s*=\s*new\s+Date\(parsed\.data\.endDate\)\s*;\s*\n\s*end\.setHours\(23,\s*59,\s*59,\s*999\)/.test(src),
    "endDate tidak boleh lagi memakai setHours(23,59,59,999) server-local",
  );
  // Pola baru: langsung lewat wibDayEnd.
  assert.ok(
    /where\.date\.lte\s*=\s*wibDayEnd\(parsed\.data\.endDate\)/.test(src),
    "endDate harus memakai wibDayEnd(parsed.data.endDate)",
  );
});

test("transactions/route: tidak ada lagi konstruksi now.getFullYear()/getDate() atau setHours untuk batas hari", () => {
  const src = read(SRC);
  // Pemeriksaan negatif: anchor hari berbasis TZ server harus hilang total.
  const tzBugA = /new\s+Date\s*\(\s*now\.getFullYear\s*\(\s*\)/.test(src);
  const tzBugB = /\.setHours\(0,\s*0,\s*0,\s*0\)/.test(src);
  const tzBugC = /\.setHours\(23,\s*59,\s*59,\s*999\)/.test(src);
  assert.ok(
    !tzBugA && !tzBugB && !tzBugC,
    "tidak boleh ada lagi anchor hari berbasis TZ server (now.getFullYear/setHours)",
  );
});

test("transactions/route: startDate filter memakai wibDayStart (bukan new Date(input) UTC midnight)", () => {
  const src = read(SRC);
  // Pola lama: `where.date.gte = new Date(parsed.data.startDate);` jatuh ke
  // UTC midnight (=07:00 WIB), sehingga transaksi 00:00–06:59 WIB terlewat
  // dari filter walaupun endDate di-anchor WIB. Harus hilang.
  assert.ok(
    !/where\.date\.gte\s*=\s*new\s+Date\(\s*parsed\.data\.startDate\s*\)/.test(
      src,
    ),
    "startDate tidak boleh lagi memakai new Date(parsed.data.startDate) tanpa anchor TZ",
  );
  // Pola baru: harus lewat wibDayStart agar konsisten dengan wibDayEnd.
  assert.ok(
    /where\.date\.gte\s*=\s*wibDayStart\(\s*parsed\.data\.startDate\s*\)/.test(
      src,
    ),
    "startDate harus memakai wibDayStart(parsed.data.startDate) untuk anchor WIB",
  );
});

test("transactions/route: startDate & endDate keduanya di-anchor WIB (konsistensi)", () => {
  const src = read(SRC);
  // Audit menemukan inkonsistensi: endDate memakai wibDayEnd (WIB) tetapi
  // startDate memakai new Date(input) (UTC midnight). Keduanya harus
  // melewati helper WIB agar rentang harian mencakup 00:00–23:59 WIB utuh.
  const startIsWib = /where\.date\.gte\s*=\s*wibDayStart\(/.test(src);
  const endIsWib = /where\.date\.lte\s*=\s*wibDayEnd\(/.test(src);
  assert.ok(
    startIsWib && endIsWib,
    "kedua batas (startDate & endDate) harus anchor WIB lewat wibDayStart & wibDayEnd",
  );
});

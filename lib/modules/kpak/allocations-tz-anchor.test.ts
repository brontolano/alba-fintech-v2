import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI: anchor "hari ini" / batas hari di `/api/kpak/allocations` harus
 * WIB, bukan server-local TZ atau UTC midnight.
 *
 * Audit MODUL 2026-10-05 (HIGH — "Batas hari memakai timezone server")
 * menandai 3 site di `app/api/kpak/allocations/route.ts`:
 *   1. `dayBounds(d)` (dipakai DAILY + GET default) — UTC anchors
 *      (`${date}T00:00:00.000Z` & `T23:59:59.999Z`).
 *   2. AGENDA `end.setHours(23, 59, 59, 999)` — server-local.
 *   3. GET `fromD`/`toD` dari query string — UTC anchors.
 *
 * Saat runtime UTC (Hostinger container `TZ=UTC`):
 *   - Site 1 (DAILY key range) & 3 (GET from/to): transaksi/alokasi
 *     sore-malam WIB jatuh ke hari berikutnya karena filter berakhir
 *     pada 16:59 UTC (= 23:59 WIB) atau 23:59 UTC (= 06:59 WIB besok).
 *   - Site 2 (AGENDA endDate): `setHours(23,59,59,999)` server-local
 *     memberi 16:59 UTC di container UTC, memotong transaksi 17:00–23:59
 *     WIB di hari yang sama.
 *
 * Pola perbaikan sama dengan 5 modul sebelumnya (handovers,
 * reconciliation, retail/sisa, dashboard/aggregates, transactions):
 * helper terpusat `wibDayStart` / `wibDayEnd` / `wibDateStr` dari
 * `@/lib/date-wib`. Test ini SOURCE-presence agar refactor berikutnya
 * yang menghapus guard segera gagal.
 *
 * Catatan: `weekBounds` (Date.UTC + setUTCDate/setUTCHours) dan
 * `monthBounds` (Date.UTC) UTC-eksplisit — bukan bug TZ. Tidak diubah.
 */

const ROOT = process.cwd();
const SRC = "app/api/kpak/allocations/route.ts";
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("kpak/allocations: import wibDayStart, wibDayEnd & wibDateStr dari @/lib/date-wib", () => {
  const src = read(SRC);
  assert.ok(
    /from\s+["']@\/lib\/date-wib["']/.test(src),
    "harus mengimpor helper WIB agar batas hari konsisten",
  );
  assert.ok(/\bwibDayStart\b/.test(src), "wibDayStart wajib dipakai");
  assert.ok(/\bwibDayEnd\b/.test(src), "wibDayEnd wajib dipakai untuk endDate");
  assert.ok(/\bwibDateStr\b/.test(src), "wibDateStr wajib dipakai");
});

test("kpak/allocations: dayBounds() memakai wibDayStart/wibDayEnd (bukan UTC anchors)", () => {
  const src = read(SRC);
  // Pola lama UTC anchor di dayBounds harus hilang.
  const utcStart = /T00:00:00\.000Z["']\s*,\s*\n\s*end:\s*new\s+Date\(`?\$\{date\}T23:59:59\.999Z`?\)/.test(
    src,
  );
  assert.ok(!utcStart, "dayBounds tidak boleh lagi memakai UTC anchors");
  // Pola baru: dayBounds delegasi ke wibDay*.
  const newAnchor = /function\s+dayBounds\([^)]*\)\s*{\s*[\s\S]{0,200}?wibDayStart\(\s*date\s*\)[\s\S]{0,200}?wibDayEnd\(\s*date\s*\)/.test(
    src,
  );
  assert.ok(
    newAnchor,
    "dayBounds harus memakai wibDayStart(date) & wibDayEnd(date)",
  );
});

test("kpak/allocations: AGENDA endDate memakai wibDayEnd (bukan setHours server-local)", () => {
  const src = read(SRC);
  // Pola lama: `end.setHours(23, 59, 59, 999)` harus hilang.
  assert.ok(
    !/end\.setHours\(\s*23,\s*59,\s*59,\s*999\s*\)/.test(src),
    "AGENDA endDate tidak boleh lagi memakai setHours(23,59,59,999) server-local",
  );
  // Pola baru: langsung lewat wibDayEnd.
  assert.ok(
    /const\s+end\s*=\s*wibDayEnd\(\s*input\.endDate\s*\)/.test(src),
    "AGENDA endDate harus memakai wibDayEnd(input.endDate)",
  );
});

test("kpak/allocations: GET from/to default memakai wibDayStart/wibDayEnd (bukan UTC anchors)", () => {
  const src = read(SRC);
  // Pola lama UTC anchor di GET harus hilang.
  const utcGet =
    /const\s+fromD\s*=\s*new\s+Date\(`?\$\{from\}T00:00:00\.000Z`?\)/.test(src) ||
    /const\s+toD\s*=\s*new\s+Date\(`?\$\{to\}T23:59:59\.999Z`?\)/.test(src);
  assert.ok(!utcGet, "GET fromD/toD tidak boleh lagi memakai UTC anchors");
  // Pola baru.
  const newGet =
    /const\s+fromD\s*=\s*wibDayStart\(\s*from\s*\)/.test(src) &&
    /const\s+toD\s*=\s*wibDayEnd\(\s*to\s*\)/.test(src);
  assert.ok(
    newGet,
    "GET harus memakai wibDayStart(from) & wibDayEnd(to)",
  );
});

test("kpak/allocations: tidak ada lagi anchor hari berbasis TZ server atau UTC midnight untuk dayBounds/GET", () => {
  const src = read(SRC);
  // Pemeriksaan negatif: anchor hari berbasis TZ server/UTC harus hilang.
  const tzBugA = /new\s+Date\(`?\$\{[^}]*\}T00:00:00\.000Z`?\)/.test(src);
  const tzBugB = /\.setHours\(\s*23,\s*59,\s*59,\s*999\s*\)/.test(src);
  // setHours(0,0,0,0) untuk anchor hari juga harus hilang (defensif).
  const tzBugC = /\.setHours\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(src);
  // Helper inline duplikat `WIB` (7 * 3600 * 1000) harus sudah dihapus;
  // sumber kebenaran tunggal tinggal di @/lib/date-wib.
  const dupWib = /const\s+WIB\s*=\s*7\s*\*\s*3600\s*\*\s*1000/.test(src);
  assert.ok(
    !tzBugA && !tzBugB && !tzBugC && !dupWib,
    "tidak boleh ada lagi anchor hari berbasis TZ server/UTC atau duplikat helper WIB",
  );
});

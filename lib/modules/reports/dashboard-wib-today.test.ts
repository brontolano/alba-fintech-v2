import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI: anchor "hari ini" di `/api/dashboard/aggregates` harus WIB,
 * bukan server-local TZ.
 *
 * Audit MODUL 2026-10-05 (HIGH — "Batas hari memakai timezone server")
 * masih menandai `app/api/dashboard/aggregates/route.ts` karena route
 * membangun `todayStart` dengan `new Date(now.getFullYear(), ...)` yang
 * memakai TZ server (UTC di container). Jika runtime UTC dan "sekarang"
 * adalah 08:00 WIB (= 01:00 UTC), `todayStart` jatuh ke 00:00 UTC —
 * artinya transaksi 02:00 WIB (=19:00 UTC hari sebelumnya) ikut
 * terhitung sebagai transaksi kemarin padahal secara operasional
 * pesantren (WIB) itu sudah "hari ini".
 *
 * Pola perbaikan yang sama sudah diterapkan di handovers, reconciliation,
 * retail/sisa, dan reports/aggregations — semuanya memakai
 * `wibDayStart(wibDateStr(now.getTime()))` dari `@/lib/date-wib`.
 * Test ini SOURCE-presence agar refactor berikutnya yang menghapus
 * guard segera gagal.
 */

const ROOT = process.cwd();
const SRC = "app/api/dashboard/aggregates/route.ts";
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("dashboard/aggregates: import wibDayStart & wibDateStr dari @/lib/date-wib", () => {
  const src = read(SRC);
  assert.ok(
    /from\s+["']@\/lib\/date-wib["']/.test(src),
    "harus mengimpor helper WIB agar batas hari konsisten",
  );
  assert.ok(/\bwibDayStart\b/.test(src), "wibDayStart wajib dipakai");
  assert.ok(/\bwibDateStr\b/.test(src), "wibDateStr wajib dipakai");
});

test("dashboard/aggregates: case 'today' memakai wibDayStart (bukan Date constructor server-local)", () => {
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
    /case\s+["']today["']:\s*\n(?:\s*\/\/[^\n]*\n|\s*\/\*[^]*?\*\/\s*\n)*\s*startDate\s*=\s*wibDayStart\(wibDateStr\(now\.getTime\(\)\)\)/;
  assert.ok(
    anchorRe.test(src),
    "case 'today' harus anchor ke wibDayStart(wibDateStr(now.getTime()))",
  );
});

test("dashboard/aggregates: todayStart untuk tile ringkasan memakai wibDayStart", () => {
  const src = read(SRC);
  // Pola lama: `const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());`
  // Pola baru: `const todayStart = wibDayStart(wibDateStr(now.getTime()));`
  assert.ok(
    !/const\s+todayStart\s*=\s*new\s+Date\(\s*now\.getFullYear\(\)/.test(src),
    "todayStart tidak boleh lagi memakai Date constructor server-local",
  );
  assert.ok(
    /const\s+todayStart\s*=\s*wibDayStart\(wibDateStr\(now\.getTime\(\)\)\)/.test(src),
    "todayStart harus memakai wibDayStart(wibDateStr(now.getTime()))",
  );
});

test("dashboard/aggregates: tidak ada lagi konstruksi now.getMonth()/getDate() untuk batas hari", () => {
  const src = read(SRC);
  // Pemeriksaan negatif: tidak boleh ada pola `new Date(now.getFullYear(), now.getMonth()`
  // atau `new Date(now.getFullYear(), now.getMonth(), now.getDate())` yang tersisa
  // di mana pun — menunjukkan anchor hari bergantung TZ server.
  const tzBug = /new\s+Date\s*\(\s*now\.getFullYear\s*\(\s*\)/.test(src);
  assert.ok(
    !tzBug,
    "tidak boleh ada lagi `new Date(now.getFullYear(), now.getMonth(), now.getDate())` di route",
  );
});

/**
 * REGRESI bucket loop 7d/30d/90d.
 *
 * `chartLabels` untuk rentang multi-hari harus mengikuti hari kalender WIB
 * (00:00–24:00 WIB per bucket). Pola lama memakai `setHours(0,0,0,0)` di
 * `Date(now - d*24h)` — di server UTC itu jadi 07:00 WIB, sehingga window
 * bucket melompati subuh pesantren dan label `format(date, "dd MMM")`
 * (yang memakai local-time proses) mencetak tanggal kemarin untuk
 * Date 00:00 WIB (= 17:00 UTC hari sebelumnya).
 */
test("dashboard/aggregates: loop bucket 7d/30d/90d anchor ke wibDayStart (bukan setHours server-local)", () => {
  const src = read(SRC);
  // Pola lama `dayStart.setHours(0, 0, 0, 0)` harus hilang.
  assert.ok(
    !/dayStart\.setHours\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(src),
    "loop bucket tidak boleh lagi memakai setHours(0,0,0,0) — itu TZ server-local",
  );
  // Pola baru: dalam loop 7d/30d/90d, dayStart = wibDayStart(dateStr).
  const anchorRe =
    /for\s*\(\s*let\s+d\s*=\s*days\s*-\s*1\s*;\s*d\s*>=\s*0\s*;\s*d--\s*\)\s*\{[\s\S]*?wibDayStart\s*\(\s*dateStr\s*\)/;
  assert.ok(
    anchorRe.test(src),
    "loop bucket harus anchor dayStart ke wibDayStart(dateStr)",
  );
  // dateStr harus ditentukan dari wibDateStr(now - d*24h), bukan dari Date API.
  assert.ok(
    /wibDateStr\s*\(\s*now\.getTime\s*\(\s*\)\s*-\s*d\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000\s*\)/.test(
      src,
    ),
    "dateStr dalam loop harus memakai wibDateStr(now - d*24h)",
  );
});

test("dashboard/aggregates: label chart 7d/30d/90d memakai wibLabelShort (bukan date-fns format server-local)", () => {
  const src = read(SRC);
  // Tidak boleh ada lagi `format(dayStart, "dd MMM"` di route.
  assert.ok(
    !/format\s*\(\s*dayStart\s*,\s*["']dd\s+MMM["']/.test(src),
    "label chart 7d/30d/90d tidak boleh lagi memakai date-fns format() — itu ikut local-time proses",
  );
  // Harus memakai wibLabelShort(dateStr) untuk push ke chartLabels.
  assert.ok(
    /chartLabels\.push\s*\(\s*wibLabelShort\s*\(\s*dateStr\s*\)\s*\)/.test(src),
    "label chart 7d/30d/90d harus memakai wibLabelShort(dateStr)",
  );
  // import wibLabelShort harus ada.
  assert.ok(
    /\bwibLabelShort\b/.test(src),
    "wibLabelShort wajib diimpor dari @/lib/date-wib",
  );
});
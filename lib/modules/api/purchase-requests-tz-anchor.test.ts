import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI: anchor "hari ini" untuk nomor & counter pengajuan belanja
 * (`/api/purchase-requests`) harus WIB, bukan server-local TZ.
 *
 * Audit MODUL 2026-10-05 (HIGH — "Batas hari memakai timezone server")
 * belum menandai route ini karena permukaan beku (RETAIL-STAFF-FREEZE)
 * mengecualikan pembelian dari audit terbuka. Modul pembelian dipakai
 * staff retail yang input bisa larut malam (setelah Isya, 19:00–22:00
 * WIB) atau subuh (04:00–05:00 WIB), sehingga `requestNo` dan
 * `countToday` WAJIB mengikuti hari operasional pesantren (WIB).
 *
 * Saat runtime UTC (Hostinger container `TZ=UTC`):
 *   - Site 1 (dayStart): `new Date(now.getFullYear(), now.getMonth(),
 *     now.getDate())` di server UTC memberi 00:00 UTC hari ini, padahal
 *     pesantren menganggap "hari ini" = 00:00 WIB. Saat 02:00 WIB
 *     (= 19:00 UTC hari sebelumnya), server-local dayStart jatuh ke
 *     00:00 UTC hari sebelumnya — sehingga PR yang dibuat jam 02:00 WIB
 *     dihitung "kemarin" dan `countToday` overlap dengan PR kemarin.
 *   - Site 2 (ymd untuk requestNo): `getFullYear/getMonth/getDate`
 *     di server UTC. Saat 02:00 WIB (= 19:00 UTC kemarin), ymd
 *     merepresentasikan TANGGAL KEMARIN, sehingga `requestNo` memakai
 *     YYYYMMDD kemarin walaupun user pesantren menganggap "hari ini".
 *     PR jam 23:00 WIB (= 16:00 UTC hari sama) barulah ymd cocok.
 *
 * Pola perbaikan sama dengan 6 modul sebelumnya (handovers,
 * reconciliation, retail/sisa, dashboard/aggregates, transactions,
 * kpak/allocations): helper terpusat `wibDayStart` & `wibDateStr` dari
 * `@/lib/date-wib`. Test ini SOURCE-presence agar refactor berikutnya
 * yang mengembalikan pola server-local segera terdeteksi.
 */

const ROOT = process.cwd();
const SRC = "app/api/purchase-requests/route.ts";
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("purchase-requests/route: import wibDayStart & wibDateStr dari @/lib/date-wib", () => {
  const src = read(SRC);
  assert.ok(
    /from\s+["']@\/lib\/date-wib["']/.test(src),
    "harus mengimpor helper WIB agar batas hari konsisten",
  );
  assert.ok(/\bwibDayStart\b/.test(src), "wibDayStart wajib dipakai");
  assert.ok(/\bwibDateStr\b/.test(src), "wibDateStr wajib dipakai");
});

test("purchase-requests/route: dayStart counter tidak lagi pakai Date constructor server-local", () => {
  const src = read(SRC);
  // Pola lama: `const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());`
  // harus hilang agar tidak lagi bergantung TZ server.
  assert.ok(
    !/dayStart\s*=\s*new\s+Date\(\s*today\.getFullYear\(/.test(src),
    "dayStart tidak boleh lagi memakai Date constructor server-local",
  );
  // Pola baru: anchor WIB — dayStart = wibDayStart(wibDateStr()).
  const anchorRe =
    /dayStart\s*=\s*wibDayStart\(\s*wibDateStr\(\s*\)\s*\)/;
  assert.ok(
    anchorRe.test(src),
    "dayStart harus anchor ke wibDayStart(wibDateStr())",
  );
});

test("purchase-requests/route: ymd untuk requestNo memakai wibDateStr (bukan server-local getDate)", () => {
  const src = read(SRC);
  // Pola lama: `ymd = \`${today.getFullYear()}${...}${...}\``
  // harus hilang — itu berarti ymd tergantung server-local TZ.
  assert.ok(
    !/ymd\s*=\s*`?\$\{today\.getFullYear\(\)\}/.test(src),
    "ymd tidak boleh lagi memakai today.getFullYear() server-local",
  );
  // Pola baru: ymd = wibDateStr().replace(/-/g, '') — string YYYYMMDD dari WIB.
  const newYmd = /ymd\s*=\s*wibDateStr\(\s*\)\.replace\(\s*\/-\/\s*g\s*,\s*["']["']\s*\)/;
  assert.ok(
    newYmd.test(src),
    "ymd harus memakai wibDateStr().replace(/-/g, '') untuk konsistensi WIB",
  );
});

test("purchase-requests/route: tidak ada lagi konstruksi now.getFullYear/getMonth/getDate untuk batas hari", () => {
  const src = read(SRC);
  // Pemeriksaan negatif: anchor hari berbasis TZ server harus hilang total.
  // Pola yang masih ada: today.getDate() dll hanya boleh di scope komentar
  // atau regex test SOURCE. Untuk file route production, anchor harus via
  // helper WIB.
  const tzBugA = /new\s+Date\s*\(\s*today\.getFullYear\s*\(\s*\)/.test(src);
  assert.ok(
    !tzBugA,
    "tidak boleh ada lagi `new Date(today.getFullYear(), today.getMonth(), today.getDate())` di route",
  );
});

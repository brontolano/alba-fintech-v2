/**
 * Regression test: parsing `from`/`to` YYYY-MM-DD di
 * `/api/savings/cross-unit` harus diterjemahkan ke rentang zona WIB
 * (00:00–23:59:59.999 WIB), bukan UTC midnight. createdAt transaksi
 * diisi `new Date()` UTC now saat POST, jadi transaksi 00:00–07:00 WIB
 * akan jatuh ke hari sebelumnya jika range dihitung pakai UTC.
 *
 * Test ini menyalin logika parsing yang dipakai route. Setiap perubahan
 * pada parsing range di route WAJIB disinkronkan di sini, dan sebaliknya.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { wibDayEnd, wibDayStart } from "@/lib/date-wib";

const parseRange = (from: string | null, to: string | null) => {
  const now = new Date();
  const fromDate = from ? wibDayStart(from) : new Date(now.getTime() - 30 * 86400 * 1000);
  const toDate = to ? wibDayEnd(to) : now;
  return { fromDate, toDate };
};

test("rentang harian WIB: dari 00:00 WIB, sampai 23:59:59.999 WIB", () => {
  const { fromDate, toDate } = parseRange("2026-10-08", "2026-10-08");
  // 00:00 WIB = 17:00 UTC hari sebelumnya
  assert.equal(fromDate.toISOString(), "2026-10-07T17:00:00.000Z");
  // 23:59:59.999 WIB = 16:59:59.999 UTC hari yang sama
  assert.equal(toDate.toISOString(), "2026-10-08T16:59:59.999Z");
});

test("transaksi 02:00 WIB masuk range hari kalender yang sama", () => {
  const { fromDate, toDate } = parseRange("2026-10-08", "2026-10-08");
  // 02:00 WIB tanggal 8 = 19:00 UTC tanggal 7
  const txAt = new Date("2026-10-07T19:00:00.000Z").getTime();
  assert.ok(txAt >= fromDate.getTime(), "createdAt harus >= startOfDay WIB");
  assert.ok(txAt <= toDate.getTime(), "createdAt harus <= endOfDay WIB");
});

test("transaksi 23:30 WIB masih masuk range hari kalender yang sama", () => {
  const { fromDate, toDate } = parseRange("2026-10-08", "2026-10-08");
  // 23:30 WIB = 16:30 UTC hari yang sama
  const txAt = new Date("2026-10-08T16:30:00.000Z").getTime();
  assert.ok(txAt >= fromDate.getTime() && txAt <= toDate.getTime());
});

test("transaksi 00:00 WIB berikutnya TIDAK masuk range hari sebelumnya", () => {
  const { fromDate, toDate } = parseRange("2026-10-08", "2026-10-08");
  // 00:00 WIB tanggal 9 = 17:00 UTC tanggal 8
  const txNext = new Date("2026-10-08T17:00:00.000Z").getTime();
  assert.ok(txNext > toDate.getTime(), "00:00 WIB 9/10 tidak boleh masuk range 8/10");
});

test("rentang mingguan inklusif: from=8, to=10 mencakup 8,9,10 WIB penuh", () => {
  const { fromDate, toDate } = parseRange("2026-10-08", "2026-10-10");
  // 10/10 23:59:59.999 WIB = 10/10 16:59:59.999 UTC
  assert.equal(toDate.toISOString(), "2026-10-10T16:59:59.999Z");
  // 9/10 12:00 WIB = 9/10 05:00 UTC → harus masuk
  const mid = new Date("2026-10-09T05:00:00.000Z").getTime();
  assert.ok(mid >= fromDate.getTime() && mid <= toDate.getTime());
});

test("tanpa from/to: default 30 hari terakhir sampai sekarang", () => {
  const before = Date.now();
  const { fromDate, toDate } = parseRange(null, null);
  const after = Date.now();
  // toDate ≈ now
  assert.ok(toDate.getTime() >= before && toDate.getTime() <= after);
  // fromDate ≈ 30 hari sebelum now
  const expectedFrom = before - 30 * 86400 * 1000;
  // toleransi 2 detik untuk eksekusi test
  assert.ok(Math.abs(fromDate.getTime() - expectedFrom) < 2000);
});

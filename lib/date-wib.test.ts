import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wibDayStart,
  wibDayEnd,
  wibKeyDate,
  wibDateStr,
  wibHM,
  wibLabelShort,
} from "./date-wib";

test("wibDayStart: 00:00 WIB untuk tanggal yang diminta", () => {
  const d = wibDayStart("2026-10-08");
  // 00:00 WIB = 17:00 UTC hari sebelumnya
  assert.equal(d.toISOString(), "2026-10-07T17:00:00.000Z");
  assert.equal(d.getUTCHours(), 17);
  assert.equal(d.getUTCDate(), 7);
});

test("wibDayEnd: 23:59:59.999 WIB = 16:59:59.999 UTC hari yang sama", () => {
  const d = wibDayEnd("2026-10-08");
  assert.equal(d.toISOString(), "2026-10-08T16:59:59.999Z");
  assert.equal(d.getUTCHours(), 16);
  assert.equal(d.getUTCDate(), 8);
});

test("wibDayStart/wibDayEnd mencakup transaksi sore hari (mis. 19:00 WIB)", () => {
  const start = wibDayStart("2026-10-08").getTime();
  const end = wibDayEnd("2026-10-08").getTime();
  // 19:00 WIB = 12:00 UTC hari yang sama
  const txTime = Date.UTC(2026, 9, 8, 12, 0, 0);
  assert.ok(txTime >= start && txTime <= end, "19:00 WIB harus masuk range hari 2026-10-08");
});

test("wibDayStart/wibDayEnd: transaksi 02:00 WIB masuk hari yang sama, bukan hari sebelumnya", () => {
  const start = wibDayStart("2026-10-08").getTime();
  const end = wibDayEnd("2026-10-08").getTime();
  // 02:00 WIB = 17:00 UTC hari sebelumnya (07 Okt)
  const txTime = Date.UTC(2026, 9, 7, 17, 0, 0);
  assert.ok(txTime >= start && txTime <= end, "02:00 WIB 08/10 harus masuk range 08/10");
});

test("wibDayEnd tidak pernah lebih besar dari wibDayStart hari berikutnya", () => {
  const endPrev = wibDayEnd("2026-10-08").getTime();
  const startNext = wibDayStart("2026-10-09").getTime();
  assert.ok(endPrev < startNext, "akhir hari < awal hari berikutnya");
});

test("wibKeyDate: UTC midnight untuk composite-key ShiftAttendance", () => {
  const d = wibKeyDate("2026-10-08");
  assert.equal(d.toISOString(), "2026-10-08T00:00:00.000Z");
});

test("wibKeyDate berbeda dengan wibDayStart (komposit vs range)", () => {
  const key = wibKeyDate("2026-10-08").getTime();
  const range = wibDayStart("2026-10-08").getTime();
  assert.notEqual(key, range, "key date (UTC midnight) != range start (WIB midnight)");
  // key = 00:00 UTC 08 Okt, range = 00:00 WIB 08 Okt = 17:00 UTC 07 Okt
  // sehingga key lebih lambat 7 jam.
  assert.equal(key - range, 7 * 3600 * 1000);
});

test("wibDateStr: string YYYY-MM-DD mengikuti WIB", () => {
  // 2026-10-08T15:00:00Z = 2026-10-08T22:00 WIB
  const s = wibDateStr(Date.UTC(2026, 9, 8, 15, 0, 0));
  assert.equal(s, "2026-10-08");
});

test("wibDateStr: roll-over tengah malam UTC menampilkan tanggal WIB", () => {
  // 2026-10-08T17:00:00Z = 2026-10-09T00:00 WIB (roll ke 9 Oktober)
  const s = wibDateStr(Date.UTC(2026, 9, 8, 17, 0, 0));
  assert.equal(s, "2026-10-09");
});

test("wibHM: jam:menit WIB", () => {
  // 2026-10-08T05:30:00Z = 12:30 WIB
  const hm = wibHM(Date.UTC(2026, 9, 8, 5, 30, 0));
  assert.equal(hm, "12:30");
});

test("wibLabelShort: render 'dd Mon' Indonesia dari YYYY-MM-DD", () => {
  assert.equal(wibLabelShort("2026-10-01"), "01 Okt");
  assert.equal(wibLabelShort("2026-01-15"), "15 Jan");
  assert.equal(wibLabelShort("2026-12-31"), "31 Des");
  // Bulan Mei & Juni — "Mei"/"Jun" (singkatan Indonesia baku)
  assert.equal(wibLabelShort("2026-05-20"), "20 Mei");
  assert.equal(wibLabelShort("2026-06-01"), "01 Jun");
  // Bulan Agustus — "Agu" (bukan "Aug")
  assert.equal(wibLabelShort("2026-08-17"), "17 Agu");
});

test("wibLabelShort: fallback defensif untuk input malformed", () => {
  // Tidak melempar, kembalikan input apa adanya.
  assert.equal(wibLabelShort(""), "");
  assert.equal(wibLabelShort("bukan tanggal"), "bukan tanggal");
});

test("wibLabelShort: 12 bulan tercakup lengkap", () => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  for (let i = 0; i < 12; i++) {
    const mm = String(i + 1).padStart(2, "0");
    assert.equal(
      wibLabelShort(`2026-${mm}-01`),
      `01 ${months[i]}`,
      `bulan ${mm} harus ${months[i]}`,
    );
  }
});

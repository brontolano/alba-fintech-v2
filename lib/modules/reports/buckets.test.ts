import assert from "node:assert/strict";
import test from "node:test";
import {
  weekKey,
  buildWeeklyBuckets,
  dayKey,
  buildDailyBuckets,
  monthKey,
  buildMonthlyBuckets,
} from "./buckets";

/**
 * Test plan untuk buckets.ts:
 * - weekKey() snap ke Senin (ISO week start) untuk tanggal apapun
 * - weekKey() lintas Senin menghasilkan Senin minggu yang sama (idempotent untuk minggu)
 * - buildWeeklyBuckets(now, 4) menghasilkan tepat 4 Senin berurutan
 * - Semua Senin dalam bucket berada di rentang [Senin minggu lalu ke-(weeks-1), Senin minggu ini]
 * - buildWeeklyBuckets(now, 4) tidak ter-collision: 4 Senin unik
 */

test("weekKey: Kamis snap ke Senin di awal minggu yang sama", () => {
  // 2026-10-08 = Kamis
  assert.equal(weekKey(new Date(2026, 9, 8)), "2026-10-05");
});

test("weekKey: Senin itu sendiri tetap Senin itu sendiri", () => {
  // 2026-10-05 = Senin
  assert.equal(weekKey(new Date(2026, 9, 5)), "2026-10-05");
});

test("weekKey: Minggu snap ke Senin sebelumnya", () => {
  // 2026-10-04 = Minggu
  assert.equal(weekKey(new Date(2026, 9, 4)), "2026-09-28");
});

test("weekKey: Sabtu snap ke Senin di minggu yang sama", () => {
  // 2026-10-10 = Sabtu
  assert.equal(weekKey(new Date(2026, 9, 10)), "2026-10-05");
});

test("weekKey: Rentang 7 hari dalam minggu yang sama menghasilkan Senin yang sama", () => {
  const mon = "2026-10-05";
  for (let i = 0; i < 7; i++) {
    const d = new Date(2026, 9, 5 + i);
    assert.equal(weekKey(d), mon, `day ${5 + i} (${d.toDateString()}) harusnya ${mon}`);
  }
});

test("buildWeeklyBuckets: tepat 4 Senin berurutan dan unik", () => {
  const now = new Date(2026, 9, 8); // Kamis
  const keys = buildWeeklyBuckets(now, 4);
  assert.equal(keys.length, 4, "harus tepat 4 bucket");
  // Setiap Senin harus berjarak tepat 7 hari
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i - 1]);
    const curr = new Date(keys[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    assert.equal(diffDays, 7, `bucket ${i} harus 7 hari setelah bucket ${i - 1}`);
  }
  // Semua key harus unik
  assert.equal(new Set(keys).size, keys.length, "tidak boleh ada Senin yang duplikat");
});

test("buildWeeklyBuckets: Senin minggu ini selalu masuk (inklusif)", () => {
  const now = new Date(2026, 9, 8); // Kamis, 2026-10-08 → Senin minggu ini = 2026-10-05
  const keys = buildWeeklyBuckets(now, 4);
  assert.ok(keys.includes("2026-10-05"), "Senin minggu ini harus ada di bucket");
});

test("buildWeeklyBuckets: dari now=Minggu (rentang 28 hari melewati Senin awal bulan)", () => {
  // 2026-10-04 = Minggu → Senin minggu ini = 2026-09-28
  const now = new Date(2026, 9, 4);
  const keys = buildWeeklyBuckets(now, 4);
  assert.equal(keys.length, 4);
  assert.equal(keys[0], "2026-09-07"); // 4 Senin sebelumnya
  assert.equal(keys[3], "2026-09-28"); // Senin minggu ini
});

test("buildWeeklyBuckets: Senin = now (hari ini adalah Senin)", () => {
  // 2026-10-05 = Senin → Senin minggu ini = 2026-10-05
  const now = new Date(2026, 9, 5);
  const keys = buildWeeklyBuckets(now, 4);
  assert.equal(keys.length, 4);
  assert.equal(keys[3], "2026-10-05");
  assert.equal(keys[0], "2026-09-14");
});

test("buildWeeklyBuckets: menghasilkan Senin-aligned keys (tidak ada hari non-Senin)", () => {
  const now = new Date(2026, 9, 8);
  const keys = buildWeeklyBuckets(now, 4);
  for (const k of keys) {
    const d = new Date(k);
    assert.equal(d.getDay(), 1, `${k} harus jatuh pada hari Senin`);
  }
});

// ── WIB boundary tests (audit 2026-10-05 MEDIUM-4) ───────────────────
// Server default timezone diasumsikan UTC. weekKey() harus memandang
// waktu dari sudut pandang WIB, bukan local time server.

test("WIB: tx Senin 02:00 WIB (= Minggu 19:00 UTC) masuk Senin 2026-10-05", () => {
  // 2026-10-05 02:00 WIB = 2026-10-04T19:00:00Z
  const tx = new Date(Date.UTC(2026, 9, 4, 19, 0, 0));
  assert.equal(weekKey(tx), "2026-10-05");
});

test("WIB: tx Minggu→Senin 23:30 WIB masuk Senin 2026-10-05", () => {
  // 2026-10-05 23:30 WIB = 2026-10-05T16:30:00Z
  const tx = new Date(Date.UTC(2026, 9, 5, 16, 30, 0));
  assert.equal(weekKey(tx), "2026-10-05");
});

test("WIB: tx Sabtu 23:30 WIB (= Sabtu 16:30 UTC) masuk Senin 2026-10-05 (minggu sama)", () => {
  // 2026-10-10 23:30 WIB = 2026-10-10T16:30:00Z
  const tx = new Date(Date.UTC(2026, 9, 10, 16, 30, 0));
  assert.equal(weekKey(tx), "2026-10-05");
});

test("WIB: tx Senin 06:00 WIB (= Minggu 23:00 UTC) masuk Senin 2026-10-05", () => {
  // 2026-10-05 06:00 WIB = 2026-10-04T23:00:00Z
  const tx = new Date(Date.UTC(2026, 9, 4, 23, 0, 0));
  assert.equal(weekKey(tx), "2026-10-05");
});

test("WIB: tx Senin 23:30 WIB (= Senin 16:30 UTC) tetap Senin 2026-10-05", () => {
  // Senin di UTC tetap Senin di WIB
  const tx = new Date(Date.UTC(2026, 9, 5, 16, 30, 0));
  assert.equal(weekKey(tx), "2026-10-05");
});

test("WIB: tx Minggu 22:00 WIB (= Minggu 15:00 UTC) masuk Senin 2026-10-12 (minggu depan)", () => {
  // 2026-10-11 22:00 WIB = 2026-10-11T15:00:00Z — Minggu
  const tx = new Date(Date.UTC(2026, 9, 11, 15, 0, 0));
  assert.equal(weekKey(tx), "2026-10-05");
});

test("WIB: buildWeeklyBuckets dari now=Minggu WIB menghasilkan Senin minggu ini yang benar", () => {
  // 2026-10-11 12:00 WIB = 2026-10-11T05:00:00Z — Minggu
  const now = new Date(Date.UTC(2026, 9, 11, 5, 0, 0));
  const keys = buildWeeklyBuckets(now, 4);
  assert.equal(keys.length, 4);
  assert.equal(keys[3], "2026-10-05", "Senin minggu ini (WIB) harus masuk");
  // Setiap Senin harus berjarak 7 hari
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i - 1] + "T00:00:00Z").getTime();
    const curr = new Date(keys[i] + "T00:00:00Z").getTime();
    assert.equal((curr - prev) / 86400000, 7);
  }
});

// ── dayKey / buildDailyBuckets (audit 2026-10-05 MEDIUM-4 lanjutan) ───
// Server default timezone diasumsikan UTC. Bucket harian harus memandang
// tanggal dari sudut pandang WIB, bukan local-time server.

test("dayKey: tanggal dengan komponen lokal biasa mengikuti ISO date", () => {
  // 2026-10-08 12:00 WIB = 2026-10-08T05:00:00Z
  const tx = new Date(Date.UTC(2026, 9, 8, 5, 0, 0));
  assert.equal(dayKey(tx), "2026-10-08");
});

test("WIB: dayKey tx Senin 02:00 WIB (= Minggu 19:00 UTC) tetap 2026-10-05", () => {
  // 2026-10-05 02:00 WIB = 2026-10-04T19:00:00Z
  const tx = new Date(Date.UTC(2026, 9, 4, 19, 0, 0));
  assert.equal(dayKey(tx), "2026-10-05");
});

test("WIB: dayKey tx Sabtu 23:30 WIB (= Sabtu 16:30 UTC) tetap 2026-10-10", () => {
  // 2026-10-10 23:30 WIB = 2026-10-10T16:30:00Z
  const tx = new Date(Date.UTC(2026, 9, 10, 16, 30, 0));
  assert.equal(dayKey(tx), "2026-10-10");
});

test("buildDailyBuckets: 7 hari inklusif hari ini, urut naik, jarak 1 hari", () => {
  // now = Kamis 2026-10-08 12:00 WIB = 2026-10-08T05:00:00Z
  const now = new Date(Date.UTC(2026, 9, 8, 5, 0, 0));
  const keys = buildDailyBuckets(now, 7);
  assert.equal(keys.length, 7);
  assert.equal(keys[0], "2026-10-02");
  assert.equal(keys[6], "2026-10-08");
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i - 1] + "T00:00:00Z").getTime();
    const curr = new Date(keys[i] + "T00:00:00Z").getTime();
    assert.equal((curr - prev) / 86400000, 1, `bucket ${i} harus 1 hari setelah ${keys[i - 1]}`);
  }
  assert.equal(new Set(keys).size, keys.length, "tidak boleh ada hari duplikat");
});

test("WIB: buildDailyBuckets dari now=Senin subuh WIB tetap pakai hari ini sebagai anchor", () => {
  // 2026-10-05 01:00 WIB = 2026-10-04T18:00:00Z
  // Bug versi lama: getDate() lokal (UTC) = 4 → "hari ini" jadi 2026-10-04
  const now = new Date(Date.UTC(2026, 9, 4, 18, 0, 0));
  const keys = buildDailyBuckets(now, 7);
  assert.equal(keys[6], "2026-10-05", "hari ini versi WIB harus 2026-10-05");
});

test("buildDailyBuckets: menolak days < 1", () => {
  assert.throws(() => buildDailyBuckets(new Date(), 0), /days harus >= 1/);
  assert.throws(() => buildDailyBuckets(new Date(), -3), /days harus >= 1/);
  assert.throws(() => buildDailyBuckets(new Date(), Number.NaN), /days harus >= 1/);
});

// ── monthKey / buildMonthlyBuckets ────────────────────────────────────

test("monthKey: tx Senin 02:00 WIB masuk bulan Oktober (bukan September)", () => {
  // 2026-10-05 02:00 WIB = 2026-10-04T19:00:00Z
  // getMonth() lokal (UTC) = 9 (Okt) pada kasus ini kebetulan cocok, tapi
  // boundary akhir bulan akan mengungkap slip:
  // 2026-09-01 00:30 WIB = 2026-08-31T17:30:00Z → harus 2026-09, bukan 2026-08.
  const tx = new Date(Date.UTC(2026, 7, 31, 17, 30, 0));
  assert.equal(monthKey(tx), "2026-09");
});

test("buildMonthlyBuckets: 6 bulan inklusif bulan ini, urut naik", () => {
  // now = 2026-10-08 12:00 WIB = 2026-10-08T05:00:00Z
  const now = new Date(Date.UTC(2026, 9, 8, 5, 0, 0));
  const keys = buildMonthlyBuckets(now, 6);
  assert.deepEqual(keys, [
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
    "2026-09",
    "2026-10",
  ]);
});

test("buildMonthlyBuckets: melewati tahun baru (Des→Jan) tetap kontigu", () => {
  // now = 2026-02-15 12:00 WIB = 2026-02-15T05:00:00Z
  const now = new Date(Date.UTC(2026, 1, 15, 5, 0, 0));
  const keys = buildMonthlyBuckets(now, 4);
  assert.deepEqual(keys, ["2025-11", "2025-12", "2026-01", "2026-02"]);
});

test("buildMonthlyBuckets: menolak months < 1", () => {
  assert.throws(() => buildMonthlyBuckets(new Date(), 0), /months harus >= 1/);
  assert.throws(() => buildMonthlyBuckets(new Date(), -6), /months harus >= 1/);
});

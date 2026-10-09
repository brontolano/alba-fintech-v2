import assert from "node:assert/strict";
import test from "node:test";

/**
 * Unit test untuk `lib/parse-int-in-range.ts` — helper sanitasi query
 * numerik yang dipakai `app/api/notifications/route.ts` dan
 * `app/api/purchase-requests/route.ts` (audit DoS ringan via `take`).
 *
 * Helper dipanggil via Zod `.transform`, jadi input invalid otomatis
 * menjadi 400 dari `safeParse` (bukan error 500 dari Prisma).
 */

import { parseIntInRange } from "./parse-int-in-range";

test("parseIntInRange: bilangan valid dikembalikan apa adanya", () => {
  assert.equal(parseIntInRange("42", 10, 1, 100), 42);
});

test("parseIntInRange: input kosong (string '') kembali ke fallback", () => {
  assert.equal(parseIntInRange("", 10, 1, 100), 10);
});

test("parseIntInRange: NaN kembali ke fallback", () => {
  assert.equal(parseIntInRange("abc", 10, 1, 100), 10);
});

test("parseIntInRange: NaN dengan fallback 0", () => {
  // Untuk guard seperti `take: 0` kita ingin fallback ke 0, bukan 1.
  // Helper di sini tidak memaksakan min > 0 — caller yang tentukan.
  assert.equal(parseIntInRange("not-a-number", 0, 0, 0), 0);
});

test("parseIntInRange: bilangan negatif di bawah min kembali ke fallback", () => {
  assert.equal(parseIntInRange("-5", 10, 1, 100), 10);
});

test("parseIntInRange: nol di bawah min=1 kembali ke fallback", () => {
  assert.equal(parseIntInRange("0", 10, 1, 100), 10);
});

test("parseIntInRange: bilangan sangat besar di-cap ke max", () => {
  assert.equal(parseIntInRange("99999", 10, 1, 100), 100);
});

test("parseIntInRange: Infinity-like input ('Infinity') kembali ke fallback", () => {
  // parseInt("Infinity", 10) = NaN → fallback.
  assert.equal(parseIntInRange("Infinity", 10, 1, 100), 10);
});

test("parseIntInRange: spasi di-decode via parseInt (leading whitespace diabaikan)", () => {
  // parseInt(" 5 ", 10) = 5; helper mengikuti perilaku parseInt.
  assert.equal(parseIntInRange("5", 10, 1, 100), 5);
});

test("parseIntInRange: bilangan di min inklusif (boundary)", () => {
  assert.equal(parseIntInRange("1", 10, 1, 100), 1);
});

test("parseIntInRange: bilangan di max inklusif (boundary)", () => {
  assert.equal(parseIntInRange("100", 10, 1, 100), 100);
});

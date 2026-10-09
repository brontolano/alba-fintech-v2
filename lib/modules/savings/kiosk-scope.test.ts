/**
 * REGRESI — Scope lembaga/unit endpoint `GET /api/kiosk/savings`.
 *
 * Mitra: `kiosk-auth.test.ts` (yang mengunci wall authentication). Test
 * ini mengunci lapis kedua: setelah login, scope lembaga/unit harus
 * diterapkan (sama dengan `/api/savings/lookup`). Tanpa scope ini,
 * setiap pengguna terautentikasi dari lembaga A bisa membaca data
 * tabungan lembaga B — audit HIGH (info disclosure PII + finansial).
 *
 * Aturan scope:
 *   SUPERADMIN       -> tidak ada filter lembagaId
 *   PIMPINAN         -> { lembagaId: session.user.lembagaId }
 *   MANAGER / STAFF  -> { unitId: session.user.unitId }
 *   role lain        -> tolak 403 (bukan hasil kosong, supaya kebocoran tak disamarkan)
 *
 * Implementasi SOURCE-presence (tidak mengeksekusi route, tidak butuh DB).
 * Cukup grep string yang wajib ada di source route.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = "app/api/kiosk/savings/route.ts";

function readRoute(): string {
  return fs.readFileSync(path.join(ROOT, SRC), "utf8");
}

test("kiosk-scope: route ada dan readable", () => {
  assert.ok(fs.existsSync(path.join(ROOT, SRC)), `route hilang: ${SRC}`);
});

test("kiosk-scope: SUPERADMIN -> scope kosong (tidak ada filter lembaga)", () => {
  const src = readRoute();
  // Marker: branch SUPERADMIN tidak menambahkan filter lembaga.
  const superadminIdx = src.indexOf('role === "SUPERADMIN"');
  const lembagaInSuperadmin = src
    .slice(superadminIdx, src.indexOf("}", superadminIdx) + 1)
    .includes("lembagaId");
  assert.ok(superadminIdx > 0, "cabang SUPERADMIN tidak ditemukan");
  assert.ok(
    !lembagaInSuperadmin,
    "SUPERADMIN harusnya tidak memfilter lembagaId",
  );
});

test("kiosk-scope: PIMPINAN -> filter lembagaId == session.user.lembagaId", () => {
  const src = readRoute();
  assert.ok(
    /role\s*===\s*["']PIMPINAN["']/.test(src),
    "cabang role === 'PIMPINAN' hilang",
  );
  assert.ok(
    /lembagaId:\s*sessionLembagaId/.test(src),
    "filter { lembagaId: sessionLembagaId } pada PIMPINAN hilang",
  );
  // PIMPINAN tanpa lembagaId sesi -> 403 eksplisit, bukan hasil kosong.
  assert.ok(
    /sessionLembagaId[\s\S]{0,200}status:\s*403/.test(src),
    "PIMPINAN tanpa scope lembaga -> 403 tidak ditemukan",
  );
});

test("kiosk-scope: MANAGER / STAFF -> filter unitId == session.user.unitId", () => {
  const src = readRoute();
  assert.ok(
    /role\s*===\s*["']MANAGER["']/.test(src),
    "cabang role === 'MANAGER' hilang",
  );
  assert.ok(
    /role\s*===\s*["']STAFF["']/.test(src),
    "cabang role === 'STAFF' hilang",
  );
  assert.ok(
    /unitId:\s*sessionUnitId/.test(src),
    "filter { unitId: sessionUnitId } pada MANAGER/STAFF hilang",
  );
  // MANAGER/STAFF tanpa unitId sesi -> 403 eksplisit.
  assert.ok(
    /sessionUnitId[\s\S]{0,200}status:\s*403/.test(src),
    "MANAGER/STAFF tanpa scope unit -> 403 tidak ditemukan",
  );
});

test("kiosk-scope: role lain -> 403 fallback (bukan 404/empty)", () => {
  const src = readRoute();
  // Fallback role tak dikenal HARUS menolak eksplisit sebelum query DB.
  // Pesan spesifik mengidentifikasi ini sebagai gate role, bukan
  // "tidak ditemukan" — sehingga kebocoran tak disamarkan sebagai 404.
  assert.ok(
    /["']Role tidak berwenang/.test(src),
    "fallback 'Role tidak berwenang' hilang",
  );
  const guardIdx = src.search(/["']Role tidak berwenang/);
  const queryIdx = src.indexOf("prisma.student.findFirst");
  assert.ok(guardIdx > 0, "guard 403 tidak ditemukan");
  assert.ok(
    guardIdx < queryIdx,
    "fallback 403 harus muncul sebelum query DB",
  );
});

test("kiosk-scope: scopeFilter dipakai di where prisma.student.findFirst", () => {
  const src = readRoute();
  // Marker: antara where: { dan prisma.student.findFirst, scopeFilter harus
  // di-spread ke where clause (sama dengan pola `...scopeFilter`).
  const whereIdx = src.indexOf("where:");
  const spreadIdx = src.indexOf("...scopeFilter", whereIdx);
  assert.ok(whereIdx > 0, "where clause tidak ditemukan");
  assert.ok(
    spreadIdx > 0,
    "scopeFilter tidak di-spread ke where prisma.student.findFirst",
  );
});

test("kiosk-scope: scope dipasang SEBELUM query DB (defense-in-depth)", () => {
  const src = readRoute();
  // Blok if-else scope harus muncul sebelum baris `prisma.student.findFirst`.
  const scopeBlockIdx = src.indexOf("scopeFilter:");
  const queryIdx = src.indexOf("prisma.student.findFirst");
  assert.ok(scopeBlockIdx > 0, "blok scopeFilter tidak ditemukan");
  assert.ok(
    scopeBlockIdx < queryIdx,
    "scope filter harus di-resolve sebelum query DB",
  );
});

test("kiosk-scope: komentar header menyebut scope + test ini", () => {
  const src = readRoute();
  assert.ok(
    /scope lembaga\/unit/i.test(src),
    "komentar scope lembaga/unit hilang dari header",
  );
  assert.ok(
    /kiosk-scope\.test\.ts/.test(src),
    "referensi ke file test ini hilang dari komentar header",
  );
});

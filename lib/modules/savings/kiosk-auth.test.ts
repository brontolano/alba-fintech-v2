/**
 * REGRESI — Autentikasi endpoint `GET /api/kiosk/savings`.
 *
 * Audit (HIGH — info disclosure): endpoint tadinya TIDAK memeriksa sesi
 * sama sekali. Siapa pun yang memiliki URL bisa enumerasi studentNumber /
 * cardUid dan membaca nama + saldo + 10 mutasi terakhir (termasuk
 * deskripsi bebas yang sering berisi catatan pribadi seperti
 * "transfer dari orang tua" atau "tutup SPP Oktober"). Ini membocorkan
 * data pribadi + finansial lintas lembaga.
 *
 * Mitigasi yang dipasang di working tree:
 *   1. Endpoint mengimpor `getServerSession` + `authOptions`.
 *   2. Pemeriksaan `session?.user` WAJIB dilakukan SEBELUM query DB.
 *   3. Tanpa sesi -> 401 dengan pesan yang menyebut "Login".
 *
 * Test ini SOURCE-presence (tidak mengeksekusi route) agar ringan dan
 * deterministik: cukup grep string yang wajib ada. Bila ada refactor
 * yang menghapus salah satu penanda, test GAGAL dan perubahan harus
 * ditolak.
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

test("route /api/kiosk/savings ada dan readable", () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, SRC)),
    `route hilang: ${SRC}`,
  );
});

test("kiosk-auth: import getServerSession + authOptions", () => {
  const src = readRoute();
  assert.ok(
    src.includes("getServerSession"),
    "pemanggilan getServerSession hilang",
  );
  assert.ok(
    src.includes("authOptions"),
    "pemakaian authOptions hilang",
  );
});

test("kiosk-auth: ada pemeriksaan session?.user", () => {
  const src = readRoute();
  assert.ok(
    src.includes("session?.user"),
    "pengecekan session?.user hilang",
  );
});

test("kiosk-auth: tanpa sesi -> 401 dengan pesan Login", () => {
  const src = readRoute();
  assert.ok(
    src.includes("status: 401"),
    "respons 401 hilang",
  );
  assert.ok(
    /Login\s+diperlukan/.test(src),
    "pesan 'Login diperlukan' hilang",
  );
});

test("kiosk-auth: 401 terjadi SEBELUM query prisma.student", () => {
  const src = readRoute();
  // Urutan sumber: cek 401 muncul sebelum findFirst student.
  const guardIdx = src.indexOf("status: 401");
  const queryIdx = src.indexOf("prisma.student.findFirst");
  assert.ok(guardIdx > 0, "guard 401 tidak ditemukan");
  assert.ok(queryIdx > 0, "query student.findFirst tidak ditemukan");
  assert.ok(
    guardIdx < queryIdx,
    "guard 401 harus muncul sebelum query DB",
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI: endpoint /api/auth/forgot-password harus menandai mode
 * unavailable secara EKSPLISIT lewat HTTP 503 + header Retry-After, bukan
 * HTTP 200. Sebelumnya route mengembalikan 200 dengan `mode: 'unavailable'`
 * yang membuat UI menampilkan banner "sukses" walau tidak ada OTP yang
 * pernah dikirim. Audit MODUL 2026-10-05 merekomendasikan "tandai fitur
 * unavailable secara eksplisit" — header 503 + Retry-After adalah cara
 * standar agar middleware/proxy/UI dapat membedakannya dari sukses.
 */

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("forgot-password: mengembalikan HTTP 503 saat mode unavailable", () => {
  const src = read("app/api/auth/forgot-password/route.ts");
  assert.ok(
    /status:\s*503/.test(src),
    "endpoint harus mengembalikan HTTP 503 saat fitur belum tersedia",
  );
});

test("forgot-password: menambahkan header Retry-After saat mode unavailable", () => {
  const src = read("app/api/auth/forgot-password/route.ts");
  assert.ok(
    /["']Retry-After["']/.test(src),
    "header Retry-After wajib ada agar klien tahu menunggu sebelum coba lagi",
  );
});

test("forgot-password: mempertahankan mode 'unavailable' untuk konsumen UI", () => {
  const src = read("app/api/auth/forgot-password/route.ts");
  assert.ok(
    /mode:\s*['"]unavailable['"]/.test(src),
    "field mode='unavailable' harus tetap dikirim agar UI dapat menampilkan pesan yang tepat",
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI: sesi hantu pasca reset data (ERR_TOO_MANY_REDIRECTS).
 *
 * Setelah reset/seed ulang, cookie JWT lama (30 hari, secret tidak berubah)
 * tetap valid dan menunjuk user yang sudah tidak ada. Tanpa pengaman ini,
 * browser memantul /login ↔ /dashboard tanpa henti di perangkat yang
 * pernah login / PWA ter-install.
 */

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("jwt: user yang sudah dihapus dikupas identitasnya", () => {
  const src = read("app/api/auth/options.ts");
  assert.ok(
    src.includes("User sudah tidak ada di DB"),
    "penanda cabang user-terhapus hilang",
  );
  assert.ok(
    src.includes("token.id = undefined"),
    "pengupasan identitas sesi hantu hilang",
  );
});

test("jwt: gangguan DB tidak boleh memutus sesi semua orang", () => {
  const src = read("app/api/auth/options.ts");
  assert.ok(
    src.includes("DB unreachable during JWT refresh"),
    "graceful degradation DB hilang",
  );
});

test("login: hanya sesi aktif beridentitas yang di-redirect ke dashboard", () => {
  const src = read("app/login/page.tsx");
  assert.ok(
    src.includes("session?.user?.id"),
    "syarat id sesi di halaman login hilang — sesi hantu akan loop redirect",
  );
  assert.ok(
    src.includes("isActive !== false"),
    "cek isActive di halaman login hilang — sesi hantu akan loop redirect",
  );
});

test("middleware: token tanpa id / nonaktif dibuang ke login", () => {
  const src = read("middleware.ts");
  assert.ok(src.includes("!token?.id"), "penolakan token tanpa id hilang");
  assert.ok(src.includes("isActive === false"), "cek isActive hilang");
  assert.ok(src.includes("maxAge: 0"), "penghapusan eksplisit cookie hilang");
});

test("sw: aktivasi membersihkan cache versi lama", () => {
  const src = read("public/sw.js");
  assert.ok(src.includes("caches.delete(key)"), "pembersihan cache lama hilang");
});

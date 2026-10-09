import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI — tooling lint resmi (audit P2 docs/AUDIT-QC-2026-10-05.md).
 *
 * Temuan audit: ESLint 9 sudah terpasang tetapi tidak ada script `npm run
 * lint` di package.json. Sebelumnya konfigurasi masih .eslintrc.json
 * (legacy) walaupun eslint.config.mjs (flat config) sudah dibuat — kehadiran
 * dua-duanya membingungkan tooling downstream. Sprint ini:
 *
 *   1. Memasang script `lint` yang menjalankan ESLint flat config pada
 *      scope utama (`lib` + `app/api`) — cukup cepat untuk CI dan cukup
 *      luas untuk menangkap regresi izin/larangan.
 *   2. Menghapus `.eslintrc.json` legacy. Audit menunjukkan rules pada
 *      kedua file identik (react/react-in-jsx-scope: off, no-unused-vars:
 *      warn dengan argsIgnorePattern), sehingga删 除 legacy tidak
 *      mengubah perilakunya.
 *
 * Test ini mengunci SOURCE marker (script `lint` ada & legacy config
 * hilang) agar keputusan ini tidak regresi diam-diam.
 */

const ROOT = process.cwd();
const PKG = "package.json";
const LEGACY = ".eslintrc.json";
const FLAT = "eslint.config.mjs";

function readPkg(): unknown {
  const raw = fs.readFileSync(path.join(ROOT, PKG), "utf8");
  return JSON.parse(raw) as { scripts?: Record<string, string> };
}

test("package.json: script 'lint' tersedia untuk CI", () => {
  const pkg = readPkg() as { scripts?: Record<string, string> };
  const cmd = pkg.scripts?.lint;
  assert.ok(cmd, "script 'lint' hilang dari package.json");
  assert.ok(
    /\beslint\b/.test(cmd),
    `script 'lint' harus memanggil eslint, dapat: ${cmd}`,
  );
  // Scope minimum: lib (utilitas & modul) + app/api (route handlers).
  // app/components sengaja tidak dimasukkan agar CI tetap cepat; itu
  // akan menjadi iterasi berikutnya setelah stabilisasi scope ini.
  assert.ok(
    /\blib\b/.test(cmd) && /\bapp\/api\b/.test(cmd),
    `script 'lint' harus mencakup lib + app/api, dapat: ${cmd}`,
  );
});

test(".eslintrc.json: legacy config telah dihapus (ESLint 9 pakai flat)", () => {
  assert.ok(
    !fs.existsSync(path.join(ROOT, LEGACY)),
    `${LEGACY} masih ada; flat config eslint.config.mjs adalah satu-satunya sumber rules.`,
  );
});

test("eslint.config.mjs: flat config tetap menjadi sumber rules aktif", () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, FLAT)),
    `${FLAT} hilang; flat config wajib ada agar 'npm run lint' berjalan.`,
  );
  const src = fs.readFileSync(path.join(ROOT, FLAT), "utf8");
  assert.ok(
    src.includes("next/core-web-vitals") || src.includes("eslint-config-next"),
    "flat config harus tetap memakai preset next/core-web-vitals.",
  );
});
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI — Otorisasi upload bukti (`/api/upload?folder=bukti`).
 *
 * Audit HIGH-3 (docs/AUDIT-MODUL-2026-10-05.md): endpoint menerima SEMUA user
 * terautentikasi (role allowlist longgar) untuk folder `bukti`. Tidak ada
 * sinkronisasi scope (lembaga untuk PIMPINAN, unit untuk MANAGER/STAFF)
 * dengan route baca `/uploads/[...path]/route.ts`. Akibat: sesi tanpa
 * scope (mis. akun custom/sesi rusak) bisa menulis file bukti orphan,
 * yang kemudian ditolak 404 saat dibaca (lihat ownership.test.ts), tapi
 * tetap menghabiskan storage dan quota Drive.
 *
 * Guard yang dipasang di working tree:
 *   1. Folder bukti memakai allowlist role eksplisit.
 *   2. PIMPINAN wajib punya `lembagaId` di sesi.
 *   3. MANAGER/STAFF wajib punya `unitId` di sesi.
 *   4. Role lain (di luar SUPERADMIN/PIMPINAN/MANAGER/STAFF) → 403.
 *
 * Test ini SOURCE-presence agar refactor berikutnya yang menghapus atau
 * melemahkan guard segera gagal.
 */

const ROOT = process.cwd();
const UPLOAD_SRC = "app/api/upload/route.ts";

function readUpload(): string {
  return fs.readFileSync(path.join(ROOT, UPLOAD_SRC), "utf8");
}

/** Ambil blok `if (folder === "bukti") { ... }` penuh dari route upload. */
function buktiUploadBranch(): string {
  const src = readUpload();
  // Cari baris `if (folder === 'bukti')` — sumber memakai petik tunggal.
  const start = src.indexOf("if (folder === 'bukti')");
  assert.ok(start >= 0, "cabang folder === 'bukti' hilang dari route upload");
  // Cari kurung tutup '}' pertama setelah start, abaityang bersarang.
  let depth = 0;
  let end = -1;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  assert.ok(end > 0, "tidak menemukan akhir cabang bukti");
  return src.slice(start, end);
}

test("route upload ada dan readable", () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, UPLOAD_SRC)),
    `route hilang: ${UPLOAD_SRC}`,
  );
});

test("guard bukti-upload: cabang bukti-upload ada", () => {
  const branch = buktiUploadBranch();
  assert.ok(branch.length > 0, "cabang bukti-upload kosong");
  assert.ok(
    branch.startsWith("if (folder === 'bukti')"),
    "awalan cabang bukti-upload salah",
  );
});

test("guard bukti-upload: PIMPINAN wajib lembagaId", () => {
  const branch = buktiUploadBranch();
  assert.ok(
    branch.includes("role === 'PIMPINAN'"),
    "cabang PIMPINAN hilang",
  );
  assert.ok(
    branch.includes("lembagaId"),
    "pemeriksaan lembagaId untuk PIMPINAN hilang",
  );
});

test("guard bukti-upload: MANAGER/STAFF wajib unitId", () => {
  const branch = buktiUploadBranch();
  assert.ok(
    branch.includes("role === 'MANAGER'"),
    "cabang MANAGER hilang",
  );
  assert.ok(
    branch.includes("role === 'STAFF'"),
    "cabang STAFF hilang",
  );
  assert.ok(
    branch.includes("unitId"),
    "pemeriksaan unitId untuk MANAGER/STAFF hilang",
  );
});

test("guard bukti-upload: SUPERADMIN bypass eksplisit", () => {
  const branch = buktiUploadBranch();
  assert.ok(
    branch.includes("role === 'SUPERADMIN'"),
    "cabang SUPERADMIN hilang",
  );
});

test("guard bukti-upload: ada fallback role tak dikenal -> 403", () => {
  const branch = buktiUploadBranch();
  // Pastikan ada blok `else` di akhir rantai if/else if yang mengembalikan 403.
  assert.ok(
    branch.includes("Role tidak berwenang mengunggah bukti"),
    "fallback role tak dikenal (403) hilang",
  );
});
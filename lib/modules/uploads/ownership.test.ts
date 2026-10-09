import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI — Otorisasi akses bukti privat (`/uploads/bukti/...`).
 *
 * Audit HIGH-2 (docs/AUDIT-MODUL-2026-10-05.md): route /uploads/[...path]
 * untuk folder `bukti` sebelumnya hanya memeriksa session. Siapa pun yang
 * login dan tahu/tertebak nama file dapat membaca bukti transaksi unit lain.
 *
 * Guard yang dipasang di working tree:
 *   1. Wajib login.
 *   2. Resolve file ke record bisnis (Transaction.photoUrl ATAU
 *      SavingsTransaction.photoUrl). Orphan (file tanpa referensi) → 404.
 *   3. SUPERADMIN boleh; PIMPINAN dibatasi ke lembaganya; MANAGER/STAFF
 *      dibatasi ke unitnya. Lainnya → 403.
 *
 * Test ini mengunci SOURCE marker agar refactor berikutnya yang menghapus
 * atau melemahkan guard segera gagal.
 */

const ROOT = process.cwd();
const SRC = "app/uploads/[...path]/route.ts";
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

/** Ambil blok `if (folder === "bukti") { ... }` hingga sebelum resolve. */
function buktiBranch(): string {
  const src = read(SRC);
  const start = src.indexOf('if (folder === "bukti")');
  assert.ok(start >= 0, "cabang folder === 'bukti' hilang dari route uploads");
  // Batas atas: panggilan resolveStoredFile di luar cabang
  const stopMarkers = [
    "const data = await resolveStoredFile",
    "if (!data) {",
  ];
  let end = src.length;
  for (const m of stopMarkers) {
    const i = src.indexOf(m, start);
    if (i >= 0 && i < end) end = i;
  }
  return src.slice(start, end);
}

test("route uploads ada dan readable", () => {
  assert.ok(fs.existsSync(path.join(ROOT, SRC)), `route hilang: ${SRC}`);
});

test("guard bukti: hanya dicabangkan untuk folder 'bukti'", () => {
  const branch = buktiBranch();
  assert.ok(branch.length > 0, "cabang bukti kosong");
  assert.ok(branch.startsWith('if (folder === "bukti")'), "awalan cabang salah");
});

test("guard bukti: wajib session (401 tanpa login)", () => {
  const branch = buktiBranch();
  assert.ok(
    branch.includes("getServerSession"),
    "getServerSession tidak dipanggil di cabang bukti",
  );
  assert.ok(
    branch.includes("Unauthorized"),
    "respons 401 Unauthorized hilang",
  );
});

test("guard bukti: resolve file ke Transaction.photoUrl", () => {
  const branch = buktiBranch();
  assert.ok(
    branch.includes("prisma.transaction.findFirst"),
    "lookup Transaction.photoUrl hilang",
  );
  assert.ok(
    /photoUrl:\s*url/.test(branch),
    "where photoUrl: url (parameter pencarian) hilang",
  );
  assert.ok(
    /unitId:\s*true/.test(branch),
    "select unitId dari Transaction hilang",
  );
  assert.ok(
    /lembagaId:\s*true/.test(branch),
    "select lembagaId (via units) dari Transaction hilang",
  );
});

test("guard bukti: resolve file ke SavingsTransaction.photoUrl", () => {
  const branch = buktiBranch();
  assert.ok(
    branch.includes("prisma.savingsTransaction.findFirst"),
    "lookup SavingsTransaction.photoUrl hilang",
  );
  assert.ok(
    /account:\s*\{[\s\S]*?student:\s*\{[\s\S]*?lembagaId:\s*true/.test(branch),
    "routing lembaga via account.student.lembagaId hilang",
  );
});

test("guard bukti: orphan (tanpa referensi) ditolak 404", () => {
  const branch = buktiBranch();
  assert.ok(
    /!\s*transaction\s*&&\s*!\s*savingsTransaction/.test(branch) ||
      /\(!transaction\s*&&\s*!savingsTransaction\)/.test(branch),
    "cek orphan (kedua lookup null) hilang",
  );
  assert.ok(
    /["']Bukti tidak terkait transaksi["']/.test(branch),
    "respons 404 untuk orphan hilang",
  );
});

test("guard bukti: SUPERADMIN selalu diizinkan", () => {
  const branch = buktiBranch();
  assert.ok(
    /role\s*===\s*["']SUPERADMIN["']/.test(branch),
    "pengecualian SUPERADMIN hilang",
  );
});

test("guard bukti: PIMPINAN hanya untuk lembaga yang sama", () => {
  const branch = buktiBranch();
  assert.ok(
    /role\s*===\s*["']PIMPINAN["']/.test(branch),
    "cabang PIMPINAN hilang",
  );
  assert.ok(
    /session\.user\.lembagaId\s*===\s*lembagaId/.test(branch),
    "pengecekan lembagaId PIMPINAN hilang",
  );
});

test("guard bukti: MANAGER/STAFF hanya untuk unit yang sama", () => {
  const branch = buktiBranch();
  // MANAGER dan STAFF harus masuk scope yang sama
  assert.ok(
    /role\s*===\s*["']MANAGER["']/.test(branch),
    "cabang MANAGER hilang",
  );
  assert.ok(
    /role\s*===\s*["']STAFF["']/.test(branch),
    "cabang STAFF hilang",
  );
  assert.ok(
    /session\.user\.unitId\s*===\s*unitId/.test(branch),
    "pengecekan unitId MANAGER/STAFF hilang",
  );
});

test("guard bukti: cross-scope mengembalikan 403", () => {
  const branch = buktiBranch();
  assert.ok(
    /if\s*\(\s*!\s*allowed\s*\)/.test(branch),
    "penolakan !allowed hilang",
  );
  assert.ok(
    /["']Forbidden["']/.test(branch),
    "respons 403 Forbidden hilang",
  );
});

test("guard bukti: response ditandai private saat folder bukti", () => {
  const src = read(SRC);
  // Pasti header Cache-Control 'private' untuk folder bukti (bukan 'public')
  // sehingga CDN/proxy tidak men-serve ke pihak ketiga.
  assert.ok(
    /isPrivate\s*\?\s*["']private,\s*max-age=300["']\s*:\s*["']public,\s*max-age=86400["']/.test(
      src,
    ),
    "header Cache-Control private/public bercabang hilang",
  );
  assert.ok(
    /isPrivate\s*=\s*folder\s*===\s*["']bukti["']/.test(src),
    "penanda isPrivate hilang",
  );
});

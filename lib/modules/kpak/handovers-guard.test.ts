import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI — Otorisasi + timezone handover (`/api/handovers`).
 *
 * Audit HIGH-4 & HIGH-5 (docs/AUDIT-MODUL-2026-10-05.md): route handovers
 * POST sebelumnya mempercayai `unitId` dari request body tanpa validasi
 * database, dan seluruh query tanggal memakai `new Date(`${date}T00:00:00`)`
 * tanpa zona waktu sehingga bisa meleset satu hari pada transaksi
 * subuh WIB (server default = UTC).
 *
 * Perbaikan di working tree:
 *   1. POST resolve `unitId` ke record `prisma.unit` (404 bila tidak ada).
 *   2. POST + GET rentang tanggal memakai suffix `+07:00` (WIB) — konsisten
 *      dengan helper `lib/date-wib.ts` dan modul shift / rekonsiliasi.
 *
 * Test ini mengunci SOURCE marker agar refactor berikutnya yang menghapus
 * validasi unit atau mengembalikan suffix tanpa zona waktu segera terdeteksi.
 * Test HANYA mengecek source — tidak mengeksekusi route, tidak butuh DB.
 *
 * Catatan freeze: route ini termasuk APIS beku manager-freeze, tetapi
 * freeze hanya mengunci keberadaan file + beberapa label UI. Penanda
 * otorisasi + timezone yang dikunci di sini adalah perubahan keamanan
 * yang diizinkan (lihat audit); test manager-freeze tetap berlaku paralel.
 */

const ROOT = process.cwd();
const SRC = "app/api/handovers/route.ts";
const read = () => fs.readFileSync(path.join(ROOT, SRC), "utf8");

/** Ambil blok `export async function POST(...) { ... }` di route. */
function postBranch(): string {
  const src = read();
  const start = src.indexOf("export async function POST(");
  assert.ok(start >= 0, "fungsi POST hilang dari route handovers");
  const end = src.indexOf("export async function GET(", start);
  assert.ok(end > start, "fungsi GET hilang / urutan rusak");
  return src.slice(start, end);
}

/** Ambil blok `export async function GET(...) { ... }` di route. */
function getBranch(): string {
  const src = read();
  const start = src.indexOf("export async function GET(");
  assert.ok(start >= 0, "fungsi GET hilang dari route handovers");
  return src.slice(start);
}

test("route handovers ada dan readable", () => {
  assert.ok(fs.existsSync(path.join(ROOT, SRC)), `route hilang: ${SRC}`);
});

test("guard POST: resolve unitId ke record Unit sebelum proses", () => {
  // HIGH-4: jangan percaya unitId request tanpa lookup. Marker:
  //   prisma.unit.findUnique({ where: { id: unitId }, ... })
  const post = postBranch();
  assert.ok(
    post.includes("prisma.unit.findUnique"),
    "lookup prisma.unit.findUnique hilang dari POST",
  );
  assert.ok(
    /where:\s*\{\s*id:\s*unitId\s*\}/.test(post),
    "where: { id: unitId } hilang dari lookup POST",
  );
});

test("guard POST: 404 bila unit tidak ditemukan", () => {
  const post = postBranch();
  assert.ok(
    /if\s*\(\s*!\s*unit\s*\)/.test(post),
    "penolakan !unit (unit null) hilang dari POST",
  );
  assert.ok(
    /status:\s*404/.test(post),
    "respons 404 untuk unit hilang hilang",
  );
  assert.ok(
    /["']Unit tidak ditemukan["']/.test(post),
    "pesan error Unit tidak ditemukan hilang",
  );
});

test("guard POST: select lembagaId untuk potensi scope check", () => {
  // Working tree memilih lembagaId (siap untuk scope PIMPINAN); jangan
  // dibuang tanpa diskusi dengan pemilik modul (lihat audit HIGH-4).
  const post = postBranch();
  assert.ok(
    /select:\s*\{\s*id:\s*true,\s*lembagaId:\s*true\s*\}/.test(post),
    "select lembagaId pada unit lookup hilang",
  );
});

test("guard POST: MANAGER hanya untuk unit sendiri", () => {
  const post = postBranch();
  assert.ok(
    /role\s*===\s*["']MANAGER["']/.test(post),
    "cabang role === 'MANAGER' hilang",
  );
  assert.ok(
    /session\.user\.unitId\s*!==\s*unitId/.test(post),
    "pengecekan unitId MANAGER hilang",
  );
  assert.ok(
    /["']Forbidden["']/.test(post),
    "respons 403 Forbidden hilang",
  );
});

test("guard timezone POST: rentang tanggal WIB (+07:00)", () => {
  // HIGH-5: harus ada suffix +07:00 di startDate & endDate, bukan zona
  // default server (UTC).
  const post = postBranch();
  assert.ok(
    /new Date\(`\$\{date\}T00:00:00\+07:00`\)/.test(post),
    "startDate tanpa +07:00 (kembali ke UTC) terdeteksi",
  );
  assert.ok(
    /new Date\(`\$\{date\}T23:59:59\.999\+07:00`\)/.test(post),
    "endDate tanpa +07:00 (kembali ke UTC) terdeteksi",
  );
});

test("guard timezone GET: rentang tanggal WIB (+07:00) bila date diisi", () => {
  const get = getBranch();
  // GET hanya memakai +07:00 bila `date` di URL; regex pada blok if (date).
  assert.ok(
    /new Date\(`\$\{date\}T00:00:00\+07:00`\)/.test(get),
    "startDate GET tanpa +07:00 (kembali ke UTC) terdeteksi",
  );
  assert.ok(
    /new Date\(`\$\{date\}T23:59:59\.999\+07:00`\)/.test(get),
    "endDate GET tanpa +07:00 (kembali ke UTC) terdeteksi",
  );
});

test("guard timezone: tidak ada lagi new Date(`${date}T...`) polos (tanpa zona)", () => {
  // Pola lama: new Date(`${date}T00:00:00`) atau T23:59:59.999 tanpa
  // suffix zona. Marker regression: setiap konstruksi date dari variabel
  // `date` harus menyertakan +07:00 atau Z (konsisten).
  const src = read();
  const plainStart = new RegExp(
    "new Date\\(`\\$\\{date\\}T00:00:00`\\)",
  );
  const plainEnd = new RegExp(
    "new Date\\(`\\$\\{date\\}T23:59:59\\.999`\\)",
  );
  assert.ok(
    !plainStart.test(src),
    "new Date(`${date}T00:00:00`) tanpa zona masih ada — kembali ke UTC",
  );
  assert.ok(
    !plainEnd.test(src),
    "new Date(`${date}T23:59:59.999`) tanpa zona masih ada — kembali ke UTC",
  );
});

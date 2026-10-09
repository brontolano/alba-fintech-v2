/**
 * REGRESI — Validasi `recordId` opsional pada `POST /api/upload?folder=bukti`.
 *
 * Audit HIGH-3 (docs/AUDIT-MODUL-2026-10-05.md): endpoint menerima FormData
 * tanpa memvalidasi `recordId`. Bila ada client yang mengirim `recordId`,
 * route harus memverifikasi record tersebut ada DAN berada dalam scope
 * sesi. Tanpa validasi, sesi terautentikasi bisa "menempelkan" file bukti
 * ke transaksi orang lain dengan mengirim `recordId` valid + URL file
 * yang baru di-upload.
 *
 * Mitigasi yang dipasang di working tree:
 *   1. Route membaca `recordId` (string) dan `recordType` (`transaction` |
 *      `savings`) dari FormData. Bila `recordId` ADA, route WAJIB:
 *      a) menolak nilai kosong / non-string dengan 400.
 *      b) menolak `recordType` yang tidak dikenal dengan 400.
 *      c) mencari record di DB; bila tidak ditemukan -> 404.
 *      d) memverifikasi scope: PIMPINAN -> lembaga record harus sama
 *         dengan lembaga sesi; MANAGER/STAFF -> unit record harus sama
 *         dengan unit sesi; SUPERADMIN bypass.
 *      e) melakukan validasi scope SEBELUM menulis file (Drive / lokal).
 *   2. Bila `recordId` TIDAK dikirim (alur create), route tetap menerima
 *      upload — caller (dashboard) sering upload proof sebelum record
 *      dibuat. Perilaku ini sesuai pola saat ini.
 *
 * Test ini SOURCE-presence (tidak mengeksekusi route) agar ringan dan
 * deterministik, konsisten dengan `kiosk-auth.test.ts` &
 * `upload-scope.test.ts`. Setiap penanda wajib ada; bila hilang, test
 * GAGAL.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = "app/api/upload/route.ts";

function readRoute(): string {
  return fs.readFileSync(path.join(ROOT, SRC), "utf8");
}

test("route /api/upload ada dan readable", () => {
  assert.ok(fs.existsSync(path.join(ROOT, SRC)), `route hilang: ${SRC}`);
});

test("record-id: route membaca recordId dari FormData", () => {
  const src = readRoute();
  // Cari pola `formData.get('recordId')` atau `formData.get("recordId")`.
  const hasSingle = src.includes("formData.get('recordId')");
  const hasDouble = src.includes('formData.get("recordId")');
  assert.ok(
    hasSingle || hasDouble,
    "route tidak membaca field 'recordId' dari FormData",
  );
});

test("record-id: route membaca recordType dari FormData", () => {
  const src = readRoute();
  const hasSingle = src.includes("formData.get('recordType')");
  const hasDouble = src.includes('formData.get("recordType")');
  assert.ok(
    hasSingle || hasDouble,
    "route tidak membaca field 'recordType' dari FormData",
  );
});

test("record-id: recordType divalidasi ke transaction|savings", () => {
  const src = readRoute();
  // Whitelist: hanya 'transaction' dan 'savings' yang diterima.
  assert.ok(
    src.includes("'transaction'") || src.includes('"transaction"'),
    "nilai 'transaction' hilang dari whitelist recordType",
  );
  assert.ok(
    src.includes("'savings'") || src.includes('"savings"'),
    "nilai 'savings' hilang dari whitelist recordType",
  );
  // Dan harus ada respons 400 untuk nilai tak dikenal.
  assert.ok(
    src.includes("status: 400"),
    "respons 400 untuk recordType invalid hilang",
  );
});

test("record-id: route mencari record di DB saat recordId ada", () => {
  const src = readRoute();
  // Harus ada panggilan prisma untuk transaction atau savings.
  const hasTxLookup =
    src.includes("prisma.transaction.findUnique") ||
    src.includes("prisma.transaction.findFirst");
  const hasSvLookup =
    src.includes("prisma.savingsTransaction.findUnique") ||
    src.includes("prisma.savingsTransaction.findFirst");
  assert.ok(
    hasTxLookup || hasSvLookup,
    "route tidak mencari record DB (transaction / savingsTransaction) saat recordId diberikan",
  );
});

test("record-id: ada 404 untuk record tidak ditemukan", () => {
  const src = readRoute();
  // Respons 404 untuk record tidak ditemukan.
  assert.ok(
    src.includes("status: 404"),
    "respons 404 untuk recordId tidak ditemukan hilang",
  );
});

test("record-id: ada 403 untuk scope tidak sesuai", () => {
  const src = readRoute();
  // Harus ada 403 eksplisit untuk pelanggaran scope.
  assert.ok(
    src.includes("status: 403"),
    "respons 403 untuk scope recordId tidak sesuai hilang",
  );
});

test("record-id: validasi scope terjadi SEBELUM upload (Drive / saveImage)", () => {
  const src = readRoute();
  // Indeks sumber untuk panggilan storage aktual.
  const driveIdx = src.indexOf("uploadToDrive(");
  const saveIdx = src.indexOf("saveImage(");
  // Indeks untuk penanda scope validation.
  // Paling tidak satu dari: penolakan 400, 403, 404.
  const guard400 = src.indexOf("status: 400");
  const guard403 = src.indexOf("status: 403");
  const guard404 = src.indexOf("status: 404");
  // Bukti-bukti di blok bukti-upload.
  const branchStart = src.indexOf("if (folder === 'bukti')");
  assert.ok(branchStart > 0, "cabang bukti-upload hilang");
  // Ambil posisi relatif dalam cabang.
  const branch = src.slice(branchStart);
  const branchDriveIdx = branch.indexOf("uploadToDrive(");
  const branchSaveIdx = branch.indexOf("saveImage(");
  // Validasi scope (403) harus ada dalam cabang bukti-upload.
  const branchGuard403 = branch.indexOf("status: 403");
  assert.ok(branchGuard403 >= 0, "validasi scope (403) tidak ada di cabang bukti-upload");
  // Jika ada uploadToDrive atau saveImage di cabang, scope guard harus muncul lebih dulu.
  if (branchDriveIdx >= 0) {
    assert.ok(
      branchGuard403 < branchDriveIdx,
      "validasi scope harus terjadi SEBELUM uploadToDrive",
    );
  }
  if (branchSaveIdx >= 0) {
    assert.ok(
      branchGuard403 < branchSaveIdx,
      "validasi scope harus terjadi SEBELUM saveImage",
    );
  }
  // Sanitasi variabel untuk tsc / eslint.
  void driveIdx;
  void saveIdx;
  void guard400;
  void guard403;
  void guard404;
});

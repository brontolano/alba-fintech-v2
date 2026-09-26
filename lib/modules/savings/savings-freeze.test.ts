import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * KUNCI MODUL TABUNGAN (freeze regression test).
 *
 * Modul Tabungan lintas unit (alat pembayaran santri via SMART_CARD)
 * dinyatakan FIX. Test ini mengunci permukaan modul:
 * bila pengembangan lain menghapus/me-rename file, memutus integrasi
 * cross-unit, atau merusak penanda perilaku tabungan, test GAGAL dan
 * perubahan harus dibatalkan atau disetujui eksplisit oleh pemilik.
 *
 * Lihat: docs/DESAIN-SMARTCARD.md
 */

// Dijalankan dari root repo (npm test) — jangan pakai __dirname (ESM).
const ROOT = process.cwd();

const PAGES = [
  "app/dashboard/pos/page.tsx",
  "app/dashboard/savings/page.tsx",
  "app/dashboard/savings/limits/page.tsx",
  "app/dashboard/savings/cross-unit/page.tsx",
];

const APIS = [
  "app/api/smartpay/route.ts",
  "app/api/savings/cross-unit/route.ts",
  "app/api/savings/transactions/route.ts",
  "app/api/savings/limits/route.ts",
  "app/api/savings/lookup/route.ts",
  "app/api/kiosk/savings/route.ts",
];

const SHARED = [
  "lib/savings-limit.ts",
  "lib/print.ts",
  "prisma/schema.prisma",
];

const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("semua halaman tabungan ada", () => {
  for (const p of PAGES) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("semua API pendukung tabungan ada", () => {
  for (const p of APIS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("semua lib/schema bersama tabungan ada", () => {
  for (const p of SHARED) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("SmartPay hanya untuk unit retail + wajib sesi POS terbuka", () => {
  const smartpay = read("app/api/smartpay/route.ts");
  assert.ok(smartpay.includes("isRetail"), "guard unit retail hilang");
  assert.ok(smartpay.includes("posSessionId"), "gate sesi POS hilang");
  assert.ok(smartpay.includes("POS_BELUM_DIBUKA"), "kode sesi POS hilang");
});

test("SmartPay: pembayaran lintas unit hanya dalam SATU lembaga", () => {
  const smartpay = read("app/api/smartpay/route.ts");
  assert.ok(
    smartpay.includes("account.unitId !== unitId"),
    "deteksi lintas unit hilang",
  );
  assert.ok(
    smartpay.includes("accountUnit.lembagaId === unit.lembagaId"),
    "cek satu lembaga hilang",
  );
  assert.ok(
    smartpay.includes("Tabungan santri bukan milik unit ini"),
    "pesan lintas lembaga hilang",
  );
});

test("SmartPay: debit saldo + pembukuan + stok dalam SATU transaksi", () => {
  const smartpay = read("app/api/smartpay/route.ts");
  assert.ok(smartpay.includes("$transaction"), "transaksi atomik hilang");
  assert.ok(smartpay.includes("WITHDRAWAL"), "mutasi tabungan hilang");
  assert.ok(smartpay.includes("SMART_CARD"), "channel SMART_CARD hilang");
  assert.ok(smartpay.includes('type: "INCOME"'), "INCOME hilang");
  assert.ok(smartpay.includes("balance: { decrement"), "debit saldo hilang");
  assert.ok(smartpay.includes("currentStock: { decrement"), "kurangi stok hilang");
  assert.ok(smartpay.includes("reference: finTx.id"), "referensi silang hilang");
});

test("SmartPay: batas belanja harian zona WIB (default nol = tanpa batas)", () => {
  const smartpay = read("app/api/smartpay/route.ts");
  const limit = read("lib/savings-limit.ts");
  assert.ok(smartpay.includes("dailySpendLimit"), "batas harian hilang");
  assert.ok(smartpay.includes("startOfWibDay"), "startOfWibDay tidak dipakai");
  assert.ok(smartpay.includes("BATAS_BELANJA_HARIAN"), "kode batas harian hilang");
  assert.ok(limit.includes("startOfWibDay"), "util startOfWibDay hilang");
});

test("UID kartu ternormalisasi UPPERCASE di semua jalur", () => {
  const smartpay = read("app/api/smartpay/route.ts");
  assert.ok(smartpay.includes("toUpperCase"), "normalisasi UID SmartPay hilang");
  const transactions = read("app/api/savings/transactions/route.ts");
  assert.ok(transactions.includes("toUpperCase"), "normalisasi UID mutasi hilang");
});

test("POS menampilkan metode bayar Kartu Santri (pembayaran lintas unit)", () => {
  const pos = read("app/dashboard/pos/page.tsx");
  assert.ok(pos.includes("Kartu Santri"), "tombol Kartu Santri hilang");
  assert.ok(pos.includes("handleSmartPay"), "handler SmartPay hilang");
  assert.ok(pos.includes("smartCardUid"), "input UID SmartPay hilang");
});

test("Laporan lintas unit: hanya WITHDRAWAL SMART_CARD lintas unit", () => {
  const cross = read("app/api/savings/cross-unit/route.ts");
  assert.ok(cross.includes('type: "WITHDRAWAL"'), "filter WITHDRAWAL hilang");
  assert.ok(cross.includes('channel: "SMART_CARD"'), "filter SMART_CARD hilang");
  assert.ok(
    cross.includes("t.unitId !== t.account.unitId"),
    "deteksi lintas unit laporan hilang",
  );
  const page = read("app/dashboard/savings/cross-unit/page.tsx");
  assert.ok(page.includes("printData"), "cetak rekap hilang");
});

test("Mutasi tabungan KPAK diblok lintas unit (non-manager/non-pimpinan)", () => {
  const transactions = read("app/api/savings/transactions/route.ts");
  assert.ok(
    transactions.includes("account.unitId !== session.user.unitId"),
    "scope unit manager/staff hilang",
  );
  assert.ok(
    transactions.includes("Rekening di luar unit Anda"),
    "guard unit manager/staff hilang",
  );
  assert.ok(
    transactions.includes("Rekening di luar lembaga Anda"),
    "guard lembaga pimpinan hilang",
  );
});

test("Schema tabungan mendukung kartu unik + batas harian + channel", () => {
  const schema = read("prisma/schema.prisma");
  assert.ok(schema.includes("cardUid"), "kolom cardUid hilang");
  assert.ok(schema.includes("@unique(map: \"cardUid\")"), "unik cardUid hilang");
  assert.ok(schema.includes("dailySpendLimit"), "kolom dailySpendLimit hilang");
});
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * KUNCI MODUL RETAIL (freeze regression test).
 *
 * Modul POS/TOKO dinyatakan FIX. Test ini mengunci permukaan modul:
 * bila pengembangan lain menghapus/me-rename file atau merusak
 * penanda perilaku retail, test GAGAL dan perubahan harus dibatalkan
 * atau disetujui eksplisit oleh pemilik.
 *
 * Lihat: docs/RETAIL-FREEZE.md
 */

// Dijalankan dari root repo (npm test) — jangan pakai __dirname (ESM).
const ROOT = process.cwd();

const PAGES = [
  "app/dashboard/pos/page.tsx",
  "app/dashboard/pos/shift/page.tsx",
  "app/dashboard/inventory/page.tsx",
  "app/dashboard/inventory/create/page.tsx",
  "app/dashboard/inventory/[id]/edit/page.tsx",
];

const APIS = [
  "app/api/pos/shift/route.ts",
  "app/api/smartpay/route.ts",
  "app/api/inventory/route.ts",
  "app/api/inventory/[id]/route.ts",
];

const SHARED = [
  "lib/use-page-guard.ts",
  "components/layout/Sidebar.tsx",
  "components/layout/MobileNav.tsx",
];

const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("semua halaman retail ada", () => {
  for (const p of PAGES) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("semua API pendukung retail ada", () => {
  for (const p of APIS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("semua komponen/lib bersama retail ada", () => {
  for (const p of SHARED) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("POS halaman hanya untuk unit retail (MANAGER/STAFF)", () => {
  const pos = read("app/dashboard/pos/page.tsx");
  assert.ok(pos.includes("unitIsRetail"), "guard unit retail hilang");
  assert.ok(pos.includes('"MANAGER"'), "role MANAGER hilang");
  assert.ok(pos.includes('"STAFF"'), "role STAFF hilang");
  const shift = read("app/dashboard/pos/shift/page.tsx");
  assert.ok(shift.includes("unitIsRetail"), "guard shift unit retail hilang");
});

test("POS pakai UID kartu ternormalisasi UPPERCASE", () => {
  const smartpay = read("app/api/smartpay/route.ts");
  assert.ok(smartpay.includes("toUpperCase"), "normalisasi UID kartu hilang");
  assert.ok(smartpay.includes("cardUid"), "cardUid hilang");
});

test("SmartPay: debit saldo + INCOME + stok dalam SATU transaksi", () => {
  const smartpay = read("app/api/smartpay/route.ts");
  assert.ok(smartpay.includes("$transaction"), "transaksi atomik hilang");
  assert.ok(smartpay.includes("WITHDRAWAL"), "mutasi tabungan hilang");
  assert.ok(smartpay.includes("SMART_CARD"), "channel SMART_CARD hilang");
  assert.ok(smartpay.includes('type: "INCOME"'), "INCOME hilang");
  assert.ok(smartpay.includes("balance: { decrement"), "debit saldo hilang");
  assert.ok(smartpay.includes("currentStock: { decrement"), "kurangi stok hilang");
});
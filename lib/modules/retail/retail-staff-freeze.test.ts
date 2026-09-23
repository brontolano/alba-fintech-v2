import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * KUNCI MODUL RETAIL STAFF/MANAGER (freeze regression test).
 *
 * Mengunci permukaan baru modul konsinyasi/shift/inventory retail:
 * bila pengembangan lain menghapus file route, halaman, atau merusak
 * penanda perilaku retail staff, test GAGAL dan perubahan harus
 * dibatalkan atau disetujui eksplisit oleh pemilik.
 *
 * Lihat: docs/RETAIL-STAFF-FREEZE.md
 */

// Dijalankan dari root repo (npm test) — jangan pakai __dirname (ESM).
const ROOT = process.cwd();

const PAGES = [
  "app/dashboard/retail/shift/page.tsx",
  "app/dashboard/retail/inventory/page.tsx",
  "app/dashboard/retail/konsinyasi/page.tsx",
  "app/dashboard/retail/konsinyasi/laporan/page.tsx",
  "app/dashboard/retail/konsinyasi/serah-terima/page.tsx",
];

const COMPONENTS = [
  "components/retail/RetailStaffDashboard.tsx",
  "components/retail/RetailManagerDashboard.tsx",
];

const LIBS = [
  "lib/retail-phase.ts",
  "lib/retail-shift-gate.ts",
  "lib/retail-guard.ts",
];

const APIS = [
  "app/api/retail/shift/route.ts",
  "app/api/retail/inventory/route.ts",
  "app/api/retail/consignments/owners/route.ts",
  "app/api/retail/consignments/owners/[id]/route.ts",
  "app/api/retail/consignments/items/route.ts",
  "app/api/retail/consignments/items/[id]/route.ts",
  "app/api/retail/consignments/report/route.ts",
  "app/api/retail/consignments/payouts/route.ts",
  "app/api/retail/consignments/payouts/[id]/route.ts",
];

const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("semua halaman retail staff ada", () => {
  for (const p of PAGES) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("dashboard retail staff & manager ada", () => {
  for (const p of COMPONENTS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("lib pendukung retail staff ada", () => {
  for (const p of LIBS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("API konsinyasi/inventory/shift retail ada", () => {
  for (const p of APIS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("routing dashboard mengarahkan retail ke dashboard retail", () => {
  const page = read("app/dashboard/page.tsx");
  assert.ok(page.includes("isRetailStaff"), "isRetailStaff hilang");
  assert.ok(page.includes("isRetailManager"), "isRetailManager hilang");
  assert.ok(page.includes("RetailStaffDashboard"), "RetailStaffDashboard hilang");
  assert.ok(page.includes("RetailManagerDashboard"), "RetailManagerDashboard hilang");
});

test("guard retail mewajibkan unit retail untuk MANAGER/STAFF", () => {
  const guard = read("lib/retail-guard.ts");
  assert.ok(guard.includes("unitIsRetail"), "guard unitIsRetail hilang");
  assert.ok(guard.includes("guardRetail"), "guardRetail hilang");
});

test("shift retail memakai gate fase WIB (bukan gate KPAK)", () => {
  const gate = read("lib/retail-shift-gate.ts");
  assert.ok(gate.includes("retail"), "penanda retail hilang");
  assert.ok(gate.includes("shiftAttendance"), "ShiftAttendance hilang");
});

test("report konsinyasi: formula hakPemilik & komisi unit", () => {
  const report = read("app/api/retail/consignments/report/route.ts");
  assert.ok(report.includes("hakPemilik"), "hakPemilik hilang");
  assert.ok(report.includes("omzet"), "omzet hilang");
  assert.ok(report.includes("komisiUnit"), "komisiUnit hilang");
});

test("payout konsinyasi: draft dengan amount hakPemilik + cegah rentang rangkap", () => {
  const payouts = read("app/api/retail/consignments/payouts/route.ts");
  assert.ok(payouts.includes("hakPemilik"), "hakPemilik hilang");
  assert.ok(payouts.includes("omzet"), "omzet hilang");
  assert.ok(payouts.includes("CANCELLED"), "penanda cegah rangkap hilang (CANCELLED)");
  assert.ok(payouts.includes("createdAt: \"desc\""), "urutan terbaru hilang");
});

test("payout PAID mencatat expense dengan ref unik CONSIGN-PAYOUT", () => {
  const payoutId = read("app/api/retail/consignments/payouts/[id]/route.ts");
  assert.ok(payoutId.includes("CONSIGN-PAYOUT"), "unique ref hilang");
  assert.ok(payoutId.includes("EXPENSE"), "type EXPENSE hilang");
  assert.ok(payoutId.includes("PAID"), "status PAID hilang");
});

test("inventory retail POST-only dengan stock-in & stocktake, tidak ubah API beku", () => {
  const inv = read("app/api/retail/inventory/route.ts");
  assert.ok(inv.includes("action"), "param action hilang");
  assert.ok(inv.includes("stock-in"), "stock-in hilang");
  assert.ok(inv.includes("stocktake"), "stocktake hilang");
  assert.ok(inv.includes("export async function POST"), "handler POST hilang");
  assert.ok(
    !inv.includes("export async function GET"),
    "GET tidak seharusnya ada di route ini",
  );
});
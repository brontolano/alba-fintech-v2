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
  "app/dashboard/retail/inventory/tambah/page.tsx",
  "app/dashboard/retail/stok-masuk/page.tsx",
  "app/dashboard/retail/stok-masuk/review/page.tsx",
  "app/dashboard/retail/sisa/page.tsx",
  "app/dashboard/retail/konsinyasi/page.tsx",
  "app/dashboard/retail/konsinyasi/[ownerId]/page.tsx",
  "app/dashboard/retail/konsinyasi/laporan/page.tsx",
  "app/dashboard/retail/konsinyasi/serah-terima/page.tsx",
  "app/dashboard/retail/belanja/page.tsx",
  "app/dashboard/pos/page.tsx",
  "app/dashboard/transactions/page.tsx",
  "app/dashboard/reports/page.tsx",
];

const COMPONENTS = [
  "components/retail/RetailStaffDashboard.tsx",
  "components/retail/RetailManagerDashboard.tsx",
  "components/retail/RetailStaffLedger.tsx",
  "components/retail/RetailStaffReport.tsx",
  "components/retail/ImageUpload.tsx",
  "components/retail/RetailSidebar.tsx",
  "components/retail/RetailMobileNav.tsx",
  "components/retail/RetailPageHeader.tsx",
];

const LIBS = [
  "lib/retail-phase.ts",
  "lib/retail-shift-gate.ts",
  "lib/retail-guard.ts",
  "lib/retail/navigation.ts",
];

const APIS = [
  "app/api/retail/dashboard/route.ts",
  "app/api/retail/shift/route.ts",
  "app/api/retail/pos-session/route.ts",
  "app/api/retail/inventory/route.ts",
  "app/api/retail/batches/route.ts",
  "app/api/retail/batches/[id]/route.ts",
  "app/api/retail/sisa/route.ts",
  "app/api/retail/sisa/[id]/route.ts",
  "app/api/retail/consignments/owners/route.ts",
  "app/api/retail/consignments/owners/[id]/route.ts",
  "app/api/retail/consignments/items/route.ts",
  "app/api/retail/consignments/items/[id]/route.ts",
  "app/api/retail/consignments/report/route.ts",
  "app/api/retail/consignments/payouts/route.ts",
  "app/api/retail/consignments/payouts/[id]/route.ts",
  "app/api/retail/reorder/route.ts",
];

const MIGRATIONS = [
  "database-update-v3.sql",
  "database-update-v4.sql",
  "database-update-v5.sql",
  "database-update-v6.sql",
  "database-update-v7.sql",
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

test("file migrasi manual v3-v7 ada (tanpa db push)", () => {
  for (const p of MIGRATIONS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("sesi POS: open wajib check-in + modal, close wajib hitung fisik", () => {
  const pos = read("app/api/retail/pos-session/route.ts");
  assert.ok(pos.includes("BELUM_CHECKIN"), "gate check-in hilang");
  assert.ok(pos.includes("POS_SUDAH_TERBUKA"), "penanda sesi ganda hilang");
  assert.ok(pos.includes("discrepancy"), "selisih kas hilang");
  assert.ok(pos.includes("expectedCash"), "ekspektasi kas hilang");
});

test("transaksi retail wajib sesi POS milik kasir", () => {
  for (const p of ["app/api/transactions/route.ts", "app/api/smartpay/route.ts"]) {
    const src = read(p);
    assert.ok(src.includes("posSessionId"), `posSessionId hilang di ${p}`);
    assert.ok(src.includes("POS_BELUM_DIBUKA"), `gate POS hilang di ${p}`);
  }
});

test("check-out menolak POS terbuka, force auto-close + notifikasi", () => {
  const shift = read("app/api/retail/shift/route.ts");
  assert.ok(shift.includes("POS_MASIH_TERBUKA"), "penanda tolak hilang");
  assert.ok(shift.includes("autoClosePosSession"), "mitigasi auto-close hilang");
  assert.ok(shift.includes("shiftSession"), "segmen multi-session hilang");
});

test("stocktake & review hanya manager", () => {
  const inv = read("app/api/retail/inventory/route.ts");
  assert.ok(inv.includes("hanya boleh dilakukan Manager"), "gate stocktake hilang");
  const review = read("app/api/retail/batches/[id]/route.ts");
  assert.ok(review.includes('"MANAGER"'), "review manager hilang");
  assert.ok(review.includes("finalUnitCost"), "harga final hilang");
});

test("batch draf tanpa ubah stok, approve terapkan atomik", () => {
  const batches = read("app/api/retail/batches/route.ts");
  assert.ok(batches.includes("asDraft"), "mode draf hilang");
  assert.ok(batches.includes("DRAFT"), "status DRAFT hilang");
});

test("UMKM jalur titipan wajib WA aktif", () => {
  const owners = read("app/api/retail/consignments/owners/route.ts");
  assert.ok(owners.includes("whatsappVerified"), "flag WA hilang");
  assert.ok(owners.includes("628"), "normalisasi WA hilang");
});

test("halaman barang-titipan dihapus anti-duplikat", () => {
  assert.ok(
    !fs.existsSync(path.join(ROOT, "app/dashboard/retail/inventory/barang-titipan/page.tsx")),
    "halaman duplikat muncul kembali",
  );
});

test("nav staff retail: grup Retail Saya + Shift di bottom nav", () => {
  const sidebar = read("components/layout/Sidebar.tsx");
  assert.ok(sidebar.includes("Retail Saya"), "grup Retail Saya hilang");
  assert.ok(sidebar.includes("/dashboard/retail/stok-masuk"), "link stok-masuk hilang");
  assert.ok(sidebar.includes("/dashboard/retail/sisa"), "link sisa hilang");
  const mobile = read("components/layout/MobileNav.tsx");
  assert.ok(mobile.includes("/dashboard/retail/shift"), "shift di bottom nav hilang");
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
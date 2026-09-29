import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * KUNCI MODUL PIMPINAN (freeze regression test).
 *
 * Mengunci permukaan modul Pimpinan (dashboard eksekutif, persetujuan,
 * pengumuman/broadcast, papan pantau, scope laporan lembaga-wide):
 * bila pengembangan lain menghapus file route, halaman, atau merusak
 * penanda perilaku pimpinan, test GAGAL dan perubahan harus dibatalkan
 * atau disetujui eksplisit oleh pemilik.
 *
 * Lihat: docs/PIMPINAN-FREEZE.md
 */

// Dijalankan dari root repo (npm test) — jangan pakai __dirname (ESM).
const ROOT = process.cwd();

const PAGES = [
  "app/dashboard/approvals/page.tsx",
  "app/dashboard/approvals/audit/page.tsx",
  "app/dashboard/announcements/page.tsx",
  "app/dashboard/monitor/page.tsx",
];

const COMPONENTS = [
  "components/dashboard/PimpinanDashboard.tsx",
  "components/dashboard/PendingApprovalsWidget.tsx",
];

const LIBS = [
  "lib/modules/approvals/scope.ts",
  "lib/modules/reports/scope.ts",
];

const APIS = [
  "app/api/approvals/route.ts",
  "app/api/approvals/[id]/route.ts",
  "app/api/approvals/audit/route.ts",
  "app/api/broadcast/route.ts",
  "app/api/broadcast/[id]/route.ts",
  "app/api/monitor/route.ts",
];

const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("semua halaman modul pimpinan ada", () => {
  for (const p of PAGES) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("komponen dashboard pimpinan ada", () => {
  for (const p of COMPONENTS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("lib scope approvals & laporan ada", () => {
  for (const p of LIBS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("API approvals/broadcast/monitor ada", () => {
  for (const p of APIS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("routing dashboard: role PIMPINAN dirender ke PimpinanDashboard", () => {
  const page = read("app/dashboard/page.tsx");
  assert.ok(page.includes("PimpinanDashboard"), "PimpinanDashboard hilang di routing");
  assert.ok(page.includes('case "PIMPINAN"'), "cabang role PIMPINAN hilang");
});

test("dashboard pimpinan: quick access Belanja hijau ke /retail/belanja", () => {
  const db = read("components/dashboard/PimpinanDashboard.tsx");
  assert.ok(db.includes('label: "Belanja"'), "quick access Belanja hilang");
  assert.ok(db.includes('href: "/dashboard/retail/belanja"'), "link belanja hilang");
  assert.ok(db.includes('color: "green"'), "warna hijau hilang");
  assert.ok(db.includes("ShoppingBag"), "ikon ShoppingBag hilang");
  assert.ok(db.includes("PendingApprovalsWidget"), "widget persetujuan hilang");
  assert.ok(db.includes("/dashboard/reports?unit="), "detail per-unit ke laporan hilang");
});

test("nav pimpinan: grup Kelola dengan Belanja Stok + Persetujuan", () => {
  const sidebar = read("components/layout/Sidebar.tsx");
  assert.ok(sidebar.includes("PIMPINAN_GROUPS"), "grup PIMPINAN_GROUPS hilang");
  assert.ok(sidebar.includes('label: "Belanja Stok"'), "link Belanja Stok hilang");
  assert.ok(sidebar.includes('href: "/dashboard/approvals"'), "link Persetujuan hilang");
});

test("scope persetujuan: PIMPINAN lembaga-wide (unitId in lembaga)", () => {
  const scope = read("lib/modules/approvals/scope.ts");
  assert.ok(scope.includes('role === "PIMPINAN"'), "cabang PIMPINAN hilang");
  assert.ok(scope.includes("lembagaUnitIds"), "lembagaUnitIds hilang");
  assert.ok(scope.includes("unitId: { in:"), "scope unitId in hilang");
});

test("scope laporan: PIMPINAN melihat semua unit lembaga", () => {
  const scope = read("lib/modules/reports/scope.ts");
  assert.ok(scope.includes('role === "PIMPINAN"'), "cabang PIMPINAN hilang");
  assert.ok(scope.includes("unitFilter"), "unitFilter hilang");
});

test("persetujuan: PIMPINAN dapat approve/reject pengajuan lembaga", () => {
  const api = read("app/api/approvals/[id]/route.ts");
  assert.ok(api.includes("PIMPINAN"), "role PIMPINAN hilang");
  assert.ok(api.includes("lembagaId"), "scope lembaga hilang");
});

test("broadcast: hanya SUPERADMIN/PIMPINAN, PIMPINAN scoped ke lembaga", () => {
  for (const p of ["app/api/broadcast/route.ts", "app/api/broadcast/[id]/route.ts"]) {
    const src = read(p);
    assert.ok(src.includes("PIMPINAN"), `PIMPINAN hilang di ${p}`);
    assert.ok(src.includes("SUPERADMIN"), `SUPERADMIN hilang di ${p}`);
    assert.ok(src.includes("lembagaId"), `scope lembaga hilang di ${p}`);
  }
});

test("audit approvals: PIMPINAN hanya melihat lembaganya", () => {
  const audit = read("app/api/approvals/audit/route.ts");
  assert.ok(audit.includes("PIMPINAN"), "role PIMPINAN hilang");
  assert.ok(audit.includes('role === \'PIMPINAN\''), "cabang PIMPINAN hilang");
});

test("amandemen pemilik: PIMPINAN bisa buka serah terima (middleware tak blokir)", () => {
  const mw = read("middleware.ts");
  assert.ok(!mw.includes('"/dashboard/handovers"'), "handovers masih diblokir untuk PIMPINAN");
  const page = read("app/dashboard/handovers/page.tsx");
  assert.ok(page.includes('usePageGuard(["SUPERADMIN", "PIMPINAN", "MANAGER"])'), "guard handovers berubah");
});

test("amandemen pemilik: nav pimpinan ada Serah Terima + Anggaran", () => {
  const sidebar = read("components/layout/Sidebar.tsx");
  assert.ok(sidebar.includes('label: "Serah Terima"'), "link Serah Terima hilang");
  assert.ok(sidebar.includes('href: "/dashboard/handovers"'), "href handovers hilang");
  assert.ok(sidebar.includes('label: "Anggaran"'), "link Anggaran hilang");
  assert.ok(sidebar.includes('href: "/dashboard/budget"'), "href budget hilang");
});

test("amandemen pemilik: halaman anggaran pimpinan ada + pakai API alokasi", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "app/dashboard/budget/page.tsx")), "halaman budget hilang");
  const page = read("app/dashboard/budget/page.tsx");
  assert.ok(page.includes("/api/kpak/allocations"), "API alokasi hilang");
  assert.ok(page.includes('usePageGuard(["SUPERADMIN", "PIMPINAN"])'), "guard budget berubah");
  const api = read("app/api/kpak/allocations/route.ts");
  assert.ok(api.includes("PIMPINAN"), "role PIMPINAN hilang di API alokasi");
});

test("amandemen pemilik: manager bisa setor kas dari halaman handovers", () => {
  const page = read("app/dashboard/handovers/page.tsx");
  assert.ok(page.includes("Setor Kas ke Pimpinan"), "form setor hilang");
  assert.ok(page.includes('method: "POST"'), "POST setor hilang");
});
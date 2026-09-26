import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * KUNCI MODUL SUPERADMIN (freeze regression test).
 *
 * Mengunci permukaan modul Superadmin (dashboard eksekutif, manajemen
 * sistem: unit, pengguna, lembaga, pengaturan, agregat keuangan):
 * bila pengembangan lain menghapus file route, halaman, atau merusak
 * penanda perilaku superadmin, test GAGAL dan perubahan harus dibatalkan
 * atau disetujui eksplisit oleh pemilik.
 *
 * Lihat: docs/SUPERADMIN-FREEZE.md
 */

// Dijalankan dari root repo (npm test) — jangan pakai __dirname (ESM).
const ROOT = process.cwd();

const PAGES = [
  "app/dashboard/units/page.tsx",
  "app/dashboard/units/create/page.tsx",
  "app/dashboard/units/[id]/page.tsx",
  "app/dashboard/users/page.tsx",
  "app/dashboard/users/create/page.tsx",
  "app/dashboard/users/[id]/page.tsx",
  "app/dashboard/lembaga/page.tsx",
  "app/dashboard/settings/page.tsx",
];

const COMPONENTS = [
  "components/dashboard/SuperadminDashboard.tsx",
  "components/dashboard/useDashboardData.ts",
];

const APIS = [
  "app/api/dashboard/aggregates/route.ts",
  "app/api/units/route.ts",
  "app/api/units/[id]/route.ts",
  "app/api/users/route.ts",
  "app/api/users/[id]/route.ts",
  "app/api/lembaga/route.ts",
  "app/api/lembaga/[id]/route.ts",
  "app/api/lembaga/default/route.ts",
  "app/api/settings/route.ts",
];

const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("semua halaman admin superadmin ada", () => {
  for (const p of PAGES) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("komponen dashboard superadmin ada", () => {
  for (const p of COMPONENTS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("API sistem & agregat keuangan ada", () => {
  for (const p of APIS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("routing dashboard: role SUPERADMIN dirender ke SuperadminDashboard", () => {
  const page = read("app/dashboard/page.tsx");
  assert.ok(page.includes("SuperadminDashboard"), "SuperadminDashboard hilang di routing");
  assert.ok(page.includes('case "SUPERADMIN"'), "cabang role SUPERADMIN hilang");
});

test("dashboard superadmin: range switcher 4 periode via refetch", () => {
  const db = read("components/dashboard/SuperadminDashboard.tsx");
  assert.ok(db.includes("RANGE_OPTIONS"), "RANGE_OPTIONS hilang");
  assert.ok(db.includes('label: "Hari Ini"'), "periode Hari Ini hilang");
  assert.ok(db.includes('label: "7 Hari"'), "periode 7 Hari hilang");
  assert.ok(db.includes('label: "30 Hari"'), "periode 30 Hari hilang");
  assert.ok(db.includes('label: "90 Hari"'), "periode 90 Hari hilang");
  assert.ok(db.includes("refetch(opt.value)"), "tombol range tidak memanggil refetch");
});

test("dashboard superadmin: grafik global & komposisi pengeluaran", () => {
  const db = read("components/dashboard/SuperadminDashboard.tsx");
  assert.ok(db.includes("Arus Kas Global"), "baris Arus Kas Global hilang");
  assert.ok(db.includes("barChartOptions"), "barChartOptions hilang");
  assert.ok(db.includes("Komposisi Pengeluaran"), "Komposisi Pengeluaran hilang");
  assert.ok(db.includes("doughnutChartOptions"), "doughnutChartOptions hilang");
  assert.ok(db.includes("expenseByCategory"), "expenseByCategory hilang");
});

test("dashboard superadmin: widget persetujuan, hero saldo, ringkasan per unit", () => {
  const db = read("components/dashboard/SuperadminDashboard.tsx");
  assert.ok(db.includes("PendingApprovalsWidget"), "widget persetujuan hilang");
  assert.ok(db.includes("maxItems={5}"), "batas 5 item widget hilang");
  assert.ok(db.includes("Kartu Saldo Konsolidasi"), "hero saldo konsolidasi hilang");
  assert.ok(db.includes("Ringkasan per Unit"), "ringkasan per unit hilang");
  assert.ok(db.includes("UnitVirtualCard"), "UnitVirtualCard hilang");
});

test("dashboard superadmin: quick access modul sistem", () => {
  const db = read("components/dashboard/SuperadminDashboard.tsx");
  assert.ok(db.includes('href: "/dashboard/users"'), "link Pengguna hilang");
  assert.ok(db.includes('label: "Pengguna"'), "label Pengguna hilang");
  assert.ok(db.includes('href: "/dashboard/lembaga"'), "link Lembaga hilang");
  assert.ok(db.includes('label: "Lembaga"'), "label Lembaga hilang");
  assert.ok(db.includes('href: "/dashboard/settings"'), "link Pengaturan hilang");
  assert.ok(db.includes('label: "Pengaturan"'), "label Pengaturan hilang");
});

test("dashboard superadmin: skeleton loading + kartu error coba lagi", () => {
  const db = read("components/dashboard/SuperadminDashboard.tsx");
  assert.ok(db.includes("SuperadminDashboardSkeleton"), "skeleton hilang");
  assert.ok(db.includes("loading && !data"), "kondisi loading && !data hilang");
  assert.ok(db.includes("Coba Lagi"), "tombol Coba Lagi hilang");
  assert.ok(db.includes("onClick={() => refetch()}"), "refetch pada error hilang");
});

test("nav superadmin: grup Sistem hanya SUPERADMIN", () => {
  const sidebar = read("components/layout/Sidebar.tsx");
  assert.ok(sidebar.includes('title: "Sistem"'), "grup Sistem hilang");
  assert.ok(sidebar.includes('href: "/dashboard/units"'), "link Unit hilang");
  assert.ok(sidebar.includes('href: "/dashboard/users"'), "link Pengguna hilang");
  assert.ok(sidebar.includes('href: "/dashboard/lembaga"'), "link Lembaga hilang");
  assert.ok(sidebar.includes('href: "/dashboard/settings"'), "link Pengaturan hilang");
  const superadminOnly = sidebar.match(/roles: \["SUPERADMIN"\],/g)?.length ?? 0;
  assert.ok(superadminOnly >= 4, "kurang dari 4 item Sistem SUPERADMIN-only");
});

test("RBAC users: edit & hapus hanya SUPERADMIN", () => {
  const api = read("app/api/users/[id]/route.ts");
  assert.ok(api.includes("Hanya SUPERADMIN yang dapat mengedit pengguna"), "guard edit hilang");
  assert.ok(api.includes("Hanya SUPERADMIN yang dapat menghapus pengguna"), "guard hapus hilang");
});

test("RBAC lembaga: buat/ubah/hapus hanya SUPERADMIN", () => {
  const route = read("app/api/lembaga/route.ts");
  assert.ok(route.includes('role !== "SUPERADMIN"'), "guard POST lembaga hilang");
  const idRoute = read("app/api/lembaga/[id]/route.ts");
  assert.ok(idRoute.includes("RBAC: SUPERADMIN only"), "komentar RBAC lembaga hilang");
  assert.ok(idRoute.includes("role !== 'SUPERADMIN'"), "guard lembaga [id] hilang");
});

test("settings: hanya SUPERADMIN + fallback tabel belum ada (P2021)", () => {
  const settings = read("app/api/settings/route.ts");
  assert.ok(settings.includes('role !== "SUPERADMIN"'), "guard SUPERADMIN settings hilang");
  assert.ok(settings.includes('err?.code === "P2021"'), "fallback P2021 hilang");
});
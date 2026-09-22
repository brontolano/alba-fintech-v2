import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * KUNCI MODUL STAFF (freeze regression test).
 *
 * Modul STAFF dinyatakan FIX. Test ini mengunci permukaan modul:
 * bila pengembangan lain menghapus/me-rename file atau merusak
 * penanda perilaku staff, test GAGAL dan perubahan harus dibatalkan
 * atau disetujui eksplisit oleh pemilik.
 *
 * Lihat: docs/KPAK-STAFF-FREEZE.md
 */

// Dijalankan dari root repo (npm test) — jangan pakai __dirname (ESM).
const ROOT = process.cwd();

const PAGES = [
  "app/dashboard/page.tsx",
  "app/dashboard/kpak/students/page.tsx",
  "app/dashboard/kpak/students/new/page.tsx",
  "app/dashboard/kpak/students/[id]/page.tsx",
  "app/dashboard/savings/page.tsx",
  "app/dashboard/kpak/finance/page.tsx",
  "app/dashboard/kpak/internal/page.tsx",
  "app/dashboard/kpak/shift/page.tsx",
  "app/dashboard/kpak/reports/page.tsx",
  "app/dashboard/kpak/budget/page.tsx",
  "app/dashboard/profile/page.tsx",
];

const APIS = [
  "app/api/savings/students/route.ts",
  "app/api/savings/students/[id]/route.ts",
  "app/api/savings/transactions/route.ts",
  "app/api/savings/lookup/route.ts",
  "app/api/savings/balance/route.ts",
  "app/api/financial-categories/route.ts",
  "app/api/financial-categories/seed-kpak/route.ts",
  "app/api/kpak/pay-service/route.ts",
  "app/api/kpak/shift/route.ts",
  "app/api/kpak/shift-reports/route.ts",
  "app/api/kpak/reconcile/route.ts",
  "app/api/kpak/allocations/route.ts",
  "app/api/transactions/route.ts",
  "app/api/upload/route.ts",
  "app/api/bukti/[filename]/route.ts",
];

const SHARED = [
  "components/kpak/KpakStaffDashboard.tsx",
  "components/kpak/ShiftLock.tsx",
  "components/kpak/useShiftGate.ts",
  "components/layout/Sidebar.tsx",
  "components/layout/MobileNav.tsx",
  "lib/kpak-shift-gate.ts",
  "lib/upload-proof.ts",
  "lib/upload-drive.ts",
  "lib/use-page-guard.ts",
];

const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("semua halaman staff ada", () => {
  for (const p of PAGES) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("semua API pendukung staff ada", () => {
  for (const p of APIS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("semua komponen/lib bersama staff ada", () => {
  for (const p of SHARED) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("sidebar: grup Data KPAK + Layanan KPAK + Shift Saya", () => {
  const s = read("components/layout/Sidebar.tsx");
  assert.ok(s.includes("Data KPAK"), "grup Data KPAK hilang");
  assert.ok(s.includes("Layanan KPAK"), "grup Layanan KPAK hilang");
  assert.ok(s.includes("Shift Saya"), "menu Shift Saya hilang");
  assert.ok(s.includes("hideForKpak"), "mekanisme hideForKpak hilang");
});

test("sidebar: Pengajuan Anggaran BUKAN untuk staff", () => {
  const s = read("components/layout/Sidebar.tsx");
  const m = s.match(/Pengajuan Anggaran[\s\S]{0,300}?roles: \[([^\]]*)\]/);
  assert.ok(m, "menu Pengajuan Anggaran hilang");
  assert.ok(!m![1].includes("STAFF"), "STAFF masuk kembali ke Pengajuan Anggaran!");
});

test("mobile nav KPAK: Beranda Santri Shift Rekap Profil", () => {
  const s = read("components/layout/MobileNav.tsx");
  for (const label of ["Beranda", "Santri", "Shift Saya", "Rekap", "Profil"]) {
    assert.ok(s.includes(label), `mobile nav kehilangan: ${label}`);
  }
});

test("gate shift: staff KPAK dibatasi shift aktif", () => {
  const hook = read("components/kpak/useShiftGate.ts");
  assert.ok(hook.includes("STAFF"), "gate role STAFF hilang");
  assert.ok(hook.includes("KPAK"), "gate unit KPAK hilang");
  const lib = read("lib/kpak-shift-gate.ts");
  assert.ok(lib.includes("hasActiveShift"), "hasActiveShift hilang");
  assert.ok(
    read("app/api/kpak/pay-service/route.ts").includes("hasActiveShift"),
    "gate API pay-service hilang",
  );
  assert.ok(
    read("app/api/savings/transactions/route.ts").includes("hasActiveShift"),
    "gate API savings hilang",
  );
});

test("transactions generik BEBAS kasus khusus anggaran (lewat budget-submit)", () => {
  const t = read("app/api/transactions/route.ts");
  assert.ok(
    !t.includes("ANGGARAN"),
    "kasus khusus anggaran masuk file beku! pindahkan ke /api/kpak/budget-submit",
  );
  assert.ok(
    fs.existsSync(path.join(ROOT, "app/api/kpak/budget-submit/route.ts")),
    "endpoint budget-submit hilang",
  );
});

test("pembayaran dukung channel Cash/Bank/Tabungan", () => {
  const pay = read("app/api/kpak/pay-service/route.ts");
  assert.ok(pay.includes("TABUNGAN"), "channel TABUNGAN hilang");
  assert.ok(pay.includes("paymentMethod"), "paymentMethod hilang");
  const sav = read("app/api/savings/transactions/route.ts");
  assert.ok(sav.includes("channel"), "channel tabungan hilang");
  assert.ok(sav.includes("photoUrl"), "bukti foto tabungan hilang");
});

test("rekonsiliasi pisahkan cash vs bank", () => {
  const r = read("app/api/kpak/reconcile/route.ts");
  assert.ok(r.includes("bankIn"), "porsi bank hilang dari rekonsiliasi");
  assert.ok(r.includes("expected"), "angka expected hilang");
});

test("shift dukung set-service + check-in ulang", () => {
  const r = read("app/api/kpak/shift/route.ts");
  assert.ok(r.includes("set-service"), "ganti layanan mid-shift hilang");
});

test("seed bawaan: HER/SPP + Daftar Ulang + Transaksi Internal", () => {
  const s = read("app/api/financial-categories/seed-kpak/route.ts");
  for (const name of ["HER / SPP", "Daftar Ulang", "Transaksi Internal"]) {
    assert.ok(s.includes(name), `default hilang: ${name}`);
  }
});

test("schema: tabel & kolom SOP tetap ada", () => {
  const s = read("prisma/schema.prisma");
  for (const marker of [
    "model ShiftAttendance",
    "model ShiftReport",
    "model BudgetAllocation",
    "service",
    "photoUrl",
    "channel",
    "FROZEN",
    "periodType",
  ]) {
    assert.ok(s.includes(marker), `schema kehilangan: ${marker}`);
  }
});

test("dashboard staff KPAK terpasang di routing", () => {
  const d = read("app/dashboard/page.tsx");
  assert.ok(d.includes("KpakStaffDashboard"), "routing dashboard staff KPAK hilang");
  const s = read("components/kpak/KpakStaffDashboard.tsx");
  for (const marker of ["Saldo Unit", "HER", "Daftar Ulang", "Log Unit"]) {
    assert.ok(s.includes(marker), `dashboard staff kehilangan: ${marker}`);
  }
});

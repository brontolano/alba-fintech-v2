import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * KUNCI MODUL MANAGER KPAK (freeze regression test).
 *
 * Modul MANAGER KPAK dinyatakan FIX. Test ini mengunci permukaan modul:
 * bila pengembangan lain menghapus/me-rename file atau merusak
 * penanda perilaku manager, test GAGAL dan perubahan harus dibatalkan
 * atau disetujui eksplisit oleh pemilik.
 *
 * Lihat: docs/KPAK-MANAGER-FREEZE.md
 */

// Dijalankan dari root repo (npm test) — jangan pakai __dirname (ESM).
const ROOT = process.cwd();

const PAGES = [
  "app/dashboard/page.tsx",
  "app/dashboard/kpak/workflow/page.tsx",
  "app/dashboard/kpak/review/page.tsx",
  "app/dashboard/kpak/close-day/page.tsx",
  "app/dashboard/kpak/my-budget/page.tsx",
  "app/dashboard/kpak/crew/page.tsx",
  "app/dashboard/approvals/page.tsx",
  "app/dashboard/reconciliation/page.tsx",
  "app/dashboard/handovers/page.tsx",
];

const APIS = [
  "app/api/approvals/route.ts",
  "app/api/handovers/route.ts",
  "app/api/kpak/shift/route.ts",
  "app/api/kpak/shift-reports/route.ts",
  "app/api/kpak/reconcile/route.ts",
  "app/api/kpak/allocations/route.ts",
  "app/api/kpak/budget-submit/route.ts",
  "app/api/transactions/route.ts",
];

const SHARED = [
  "components/kpak/KpakManagerDashboard.tsx",
  "components/layout/Sidebar.tsx",
  "lib/kpak-phase.ts",
  "lib/use-page-guard.ts",
];

const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("semua halaman manager ada", () => {
  for (const p of PAGES) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("semua API pendukung manager ada", () => {
  for (const p of APIS) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("semua komponen/lib bersama manager ada", () => {
  for (const p of SHARED) assert.ok(fs.existsSync(path.join(ROOT, p)), `hilang: ${p}`);
});

test("sidebar: grup khusus Manager KPAK + badge pantau", () => {
  const s = read("components/layout/Sidebar.tsx");
  assert.ok(s.includes("MANAGER_KPAK_GROUPS"), "grup Manager KPAK hilang");
  assert.ok(s.includes("Kerja Harian"), "grup Kerja Harian hilang");
  assert.ok(s.includes("Kelola"), "grup Kelola hilang");
  assert.ok(s.includes("badgeKey"), "mekanisme badge pantau hilang");
  for (const label of [
    "Pusat Kerja",
    "Kru & Kinerja",
    "Perlu Keputusan",
    "Tutup Hari",
    "Anggaran Saya",
  ]) {
    assert.ok(s.includes(label), `menu manager kehilangan: ${label}`);
  }
});

test("sidebar: urutan linimasa (Kru sebelum Tutup Hari)", () => {
  const s = read("components/layout/Sidebar.tsx");
  const block = s.slice(s.indexOf("MANAGER_KPAK_GROUPS"));
  assert.ok(
    block.indexOf("Kru & Kinerja") < block.indexOf("Tutup Hari"),
    "urutan linimasa rusak: Kru harus di atas Tutup Hari",
  );
});

test("pusat kerja: fase + 1 aksi per langkah + akses cepat", () => {
  const w = read("app/dashboard/kpak/workflow/page.tsx");
  assert.ok(w.includes("getKpakPhase"), "linimasa fase hilang");
  assert.ok(w.includes("PHASE_META"), "grup fase hilang");
  assert.ok(w.includes("QuickAccessGrid"), "akses cepat hilang");
  assert.ok(w.includes("Tugas berikutnya"), "kartu tugas berikutnya hilang");
});

test("review: satu antrean + badge anggaran + umur tunggu", () => {
  const r = read("app/dashboard/kpak/review/page.tsx");
  assert.ok(r.includes("ANGGARAN:"), "deteksi pengajuan anggaran hilang");
  assert.ok(r.includes("Operasional"), "badge Operasional hilang");
  assert.ok(r.includes("menunggu"), "umur antrean hilang");
});

test("tutup hari: wizard + konfirmasi dua ketuk", () => {
  const c = read("app/dashboard/kpak/close-day/page.tsx");
  assert.ok(c.includes("/api/kpak/reconcile"), "rekonsiliasi hilang");
  assert.ok(c.includes("Ketuk lagi"), "konfirmasi dua ketuk hilang");
});

test("anggaran saya: sisa alokasi + sumber dana", () => {
  const m = read("app/dashboard/kpak/my-budget/page.tsx");
  assert.ok(m.includes("Kas Lembaga"), "badge Kas Lembaga hilang");
  assert.ok(m.includes("Kas KPAK"), "badge Kas KPAK hilang");
});

test("kru: daftar + kinerja per staff", () => {
  const k = read("app/dashboard/kpak/crew/page.tsx");
  assert.ok(k.includes("Bertugas"), "status bertugas hilang");
  assert.ok(k.includes("Laporan"), "status laporan hilang");
});

test("expense KPAK selalu auto-approve", () => {
  const t = read("app/api/transactions/route.ts");
  assert.ok(t.includes("isKpakUnit"), "pengecualian KPAK hilang");
  assert.ok(
    !t.includes("ANGGARAN"),
    "kasus khusus anggaran masuk file beku! pindahkan ke /api/kpak/budget-submit",
  );
});

test("alokasi punya sumber dana KPAK/LEMBAGA", () => {
  const a = read("app/api/kpak/allocations/route.ts");
  assert.ok(a.includes("LEMBAGA"), "sumber Kas Lembaga hilang");
  const s = read("prisma/schema.prisma");
  assert.ok(s.includes("source"), "kolom source hilang dari schema");
});

test("dashboard manager KPAK terpasang di routing", () => {
  const d = read("app/dashboard/page.tsx");
  assert.ok(d.includes("KpakManagerDashboard"), "routing dashboard manager hilang");
  const m = read("components/kpak/KpakManagerDashboard.tsx");
  assert.ok(m.includes("/dashboard/kpak/workflow"), "tautan Pusat Kerja hilang");
  assert.ok(m.includes("/dashboard/kpak/review"), "tautan Perlu Keputusan hilang");
});

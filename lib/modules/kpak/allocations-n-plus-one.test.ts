import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

/**
 * REGRESI: GET /api/kpak/allocations TIDAK BOLEH jadi N+1.
 *
 * Audit MODUL 2026-10-05 (MEDIUM — "Budget GET N+1 dan filter overlap")
 * menandai handler GET di `app/api/kpak/allocations/route.ts` yang
 * melakukan `Promise.all(overlapping.map(... prisma.transaction.aggregate))`.
 * Untuk unit dengan N alokasi = 1 findMany + N aggregate (paralel tapi
 * tetap N+1 round-trips).
 *
 * Strategi yang dipakai: ganti dengan SATU `prisma.transaction.findMany`
 * yang memfilter `categoryId IN [overlappingCategoryIds]` dan date dalam
 * rentang lihat, lalu distribusi `amount` ke setiap alokasi in-memory
 * dengan uji `date BETWEEN alloc.start AND alloc.end`. Hasil `used`
 * persis sama dengan kode lama untuk kasus non-overlap (umum), dan
 * tetap konsisten untuk kasus overlap (transaksi yang masuk beberapa
 * alokasi akan dihitung ke semuanya — sama dengan aggregate per-alokasi).
 *
 * Test ini SOURCE-presence agar refactor yang mengembalikan ke pola
 * N aggregate segera terdeteksi.
 */

const ROOT = process.cwd();
const SRC = "app/api/kpak/allocations/route.ts";
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("kpak/allocations: GET handler tidak lagi melakukan N aggregate per alokasi (anti N+1)", () => {
  const src = read(SRC);
  // Pola lama: Promise.all(overlapping.map(... aggregate ...)) harus hilang.
  const oldN1 = /Promise\.all\(\s*\n?\s*overlapping\.map\s*\([\s\S]*?prisma\.transaction\.aggregate/.test(
    src,
  );
  assert.ok(
    !oldN1,
    "GET handler tidak boleh lagi memakai Promise.all(... overlapping.map(... aggregate)) — itu N+1",
  );
  // Pola umum: aggregate di dalam .map( dari allocations/overlapping.
  const mapAggregate =
    /(allocations|overlapping)\.map\s*\([\s\S]{0,200}?prisma\.transaction\.aggregate/.test(
      src,
    );
  assert.ok(
    !mapAggregate,
    "Tidak boleh ada allocations/overlapping.map(... aggregate) — N+1 smell",
  );
});

test("kpak/allocations: GET handler melakukan SATU findMany transaksi dengan categoryId IN overlappingCategoryIds", () => {
  const src = read(SRC);
  // Pastikan ada satu call findMany ke transaction dengan filter
  // categoryId IN ( ...overlapping...).
  // Pola: di dalam GET, ada prisma.transaction.findMany({...categoryId: { in: ...overlapping... }})
  const inFilter =
    /prisma\.transaction\.findMany\s*\(\s*\{[\s\S]{0,400}?categoryId\s*:\s*\{\s*in\s*:\s*[\s\S]{0,200}?overlapping[\s\S]{0,40}?\}\s*,/.test(
      src,
    );
  assert.ok(
    inFilter,
    "Harus ada satu prisma.transaction.findMany dengan categoryId: { in: ...overlapping... } untuk agregasi in-memory",
  );
});

test("kpak/allocations: GET handler mendistribusi amount transaksi ke alokasi via loop in-memory", () => {
  const src = read(SRC);
  // Distribusi in-memory: ada loop `for (const tx of transactions)` (atau
  // similar) yang di dalamnya cek rentang alokasi dan akumulasi ke Map.
  // Pola minimal: sebuah `used` Map (atau array accumulator) di-update
  // dari `tx.amount` / `transactions[i].amount` di dalam body.
  const hasTxLoop =
    /for\s*\(\s*const\s+tx\s+of\s+transactions\s*\)|for\s*\(\s*const\s+\{[^}]+\}\s+of\s+transactions\s*\)/.test(
      src,
    );
  assert.ok(
    hasTxLoop,
    "Harus ada loop `for (const tx of transactions)` untuk distribusi in-memory ke alokasi",
  );
  // Filter rentang alokasi: ada pembanding tx.date (atau alias txDate)
  // dengan start/end alokasi.
  const hasRangeCheck =
    /tx\.date\s*(>=|<=)|txDate\s*(>=|<=)/.test(src);
  assert.ok(
    hasRangeCheck,
    "Distribusi harus membandingkan tx.date/txDate dengan start/end alokasi",
  );
});

test("kpak/allocations: total round-trip DB untuk agregasi realisasi tetap 1 (findMany tunggal)", () => {
  const src = read(SRC);
  // Hitung jumlah `prisma.transaction.aggregate` di file. Harus 0 atau
  // 1 — dan kalau ada 1, harus di luar loop (mis. validasi total). Untuk
  //保守, kita terima 0 saja di file ini (alokasi pakai findMany).
  const aggregateCount = (src.match(/prisma\.transaction\.aggregate/g) || [])
    .length;
  assert.ok(
    aggregateCount === 0,
    `prisma.transaction.aggregate tidak boleh dipakai di route ini lagi (ditemukan ${aggregateCount})`,
  );
});

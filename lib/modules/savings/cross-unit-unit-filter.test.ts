/**
 * Regression test: query param `unitId` di `GET /api/savings/cross-unit`
 * dulu hanya di-echo di response tanpa dipakai di where clause. Auditor
 * menemukan (audit-MODUL MEDIUM) bahwa PIMPINAN bisa meminta `unitId` dari
 * lembaga lain karena filter placeholder tidak dipasang. Fix: pakai
 * `unitId` sebagai filter pada mutasi (`t.unitId === requestedUnitId`)
 * dengan validasi scope — MANAGER hanya unit sendiri, PIMPINAN unit
 * harus dalam lembaganya, SUPERADMIN bebas.
 *
 * Test menyalin snippet route (TS) dan memeriksa kehadiran string
 * tertentu yang mengunci perilaku.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const ROUTE =
  "/opt/data/home/workspace/dev/alba-finance/app/api/savings/cross-unit/route.ts";

const src = () => readFileSync(ROUTE, "utf8");

test("cross-unit: route ada dan readable", () => {
  const s = src();
  assert.ok(s.length > 0, "route source kosong");
  assert.match(s, /GET\s+function\s+GET|export\s+async\s+function\s+GET/);
});

test("cross-unit: unitId difilter dengan requestedUnitId pada mutasi (bukan hanya echo)", () => {
  const s = src();
  // requestedUnitId diinisialisasi dari query
  assert.match(
    s,
    /requestedUnitId\s*=\s*unitIdFilter\.trim\(\)/,
    "diharapkan inisialisasi requestedUnitId dari query",
  );
  // Filter mutasi lintas unit: kalau requestedUnitId ada, harus
  // membatasi t.unitId.
  assert.match(
    s,
    /requestedUnitId\s*&&\s*t\.unitId\s*!==\s*requestedUnitId/,
    "diharapkan filter mutasi memakai requestedUnitId",
  );
});

test("cross-unit: MANAGER wajib unitId sama dengan session", () => {
  const s = src();
  assert.match(
    s,
    /role\s*===\s*['"]MANAGER['"][\s\S]{0,200}session\.user\.unitId\s*!==\s*requestedUnitId/,
    "MANAGER harus ditolak bila requestedUnitId != session.user.unitId",
  );
});

test("cross-unit: PIMPINAN validasi unit dalam lembaganya", () => {
  const s = src();
  assert.match(
    s,
    /role\s*===\s*['"]PIMPINAN['"][\s\S]{0,400}unit\.lembagaId\s*!==\s*session\.user\.lembagaId/,
    "PIMPINAN harus cek lembagaId unit via prisma.unit.findUnique",
  );
});

test("cross-unit: SUPERADMIN bebas (tidak ada blokir eksplisit)", () => {
  const s = src();
  // Cari blok if unitIdFilter dan pastikan SUPERADMIN bukan masuk ke
  // MANAGER/PIMPINAN branch
  const block = s.match(/if\s*\(unitIdFilter[\s\S]*?\n\s*\}/);
  assert.ok(block, "diharapkan blok validasi unitIdFilter");
  const body = block![0];
  assert.ok(
    !body.includes('role === "SUPERADMIN"'),
    "SUPERADMIN tidak masuk ke branch MAN/SUP blok filter unit",
  );
});

test("cross-unit: requestedUnitId dipakai dalam filter cross, bukan echo saja", () => {
  const s = src();
  // Baris echo filters.unitId tetap ada (responsiveness) — itu tidak masalah.
  // Yang penting: filter `cross` benar-benar memakai requestedUnitId.
  const crossBlock = s.match(
    /const\s+cross\s*=\s*txs\.filter\([\s\S]*?\);/,
  );
  assert.ok(crossBlock, "diharapkan ada assignment const cross");
  assert.ok(
    crossBlock![0].includes("requestedUnitId"),
    "filter cross harus memeriksa requestedUnitId",
  );
});

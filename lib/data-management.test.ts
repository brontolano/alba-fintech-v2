/**
 * Regression: filename backup server harus mengikuti WIB, bukan UTC.
 *
 * Sebelumnya stamp memakai `new Date().toISOString().replace(...)` sehingga
 * file backup yang dijadwalkan 00:00–07:00 WIB (yaitu sore/malam UTC hari
 * sebelumnya) terbubuhi nama "hari kemarin" di mata operator pesantren.
 * Setelah perbaikan, komponen tanggal di nama file memakai `wibDateStr()`.
 *
 * Lihat: app/api/data/route.ts (GET) & lib/data-management.ts (createServerBackup).
 */
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

// Backup ditulis ke folder temp; pakai DIRECTORY override agar tidak
// mengotori direktori kerja.
const tmpDir = path.join(os.tmpdir(), `alba-backup-${Date.now()}`);
process.env.BACKUP_DIRECTORY = tmpDir;
process.env.BACKUP_RETENTION_DAYS = "1";

// Cek WIB vs UTC: pilih waktu yang PASTI berbeda antara UTC dan WIB.
// 2026-10-08T19:00:00.000Z = 2026-10-09T02:00 WIB → WIB date = 2026-10-09.
const FAKE_NOW = Date.UTC(2026, 9, 8, 19, 0, 0);
const REAL_DATE = Date;
const realToIso = (d: Date) => d.toISOString();

before(() => {
  // Ganti Date.now() & new Date() agar deterministik tanpa freeze time lib.
  // toISOString() tetap dipakai, jadi stamp waktu di filename tetap presisi.
  (globalThis as any).Date.now = () => FAKE_NOW;
  // new Date() dengan/tanpa argumen akan mememanggil now() — kita override
  // konstruktor dengan wrapper yang me-resolve ke Date dgn epoch FAKE_NOW.
  // Cara paling aman: pakai class wrapper yang override static now().
  class FrozenDate extends REAL_DATE {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(FAKE_NOW);
      } else {
        // @ts-expect-error spread ke Date constructor
        super(...args);
      }
    }
    static now() {
      return FAKE_NOW;
    }
  }
  (globalThis as any).Date = FrozenDate;
});

after(async () => {
  (globalThis as any).Date = REAL_DATE;
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// Stub prisma minimal: setiap delegate.findMany() → [] agar exportDatabase
// menghasilkan JSON kosong tanpa query beneran.
function stubPrisma() {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "$transaction") {
        return async (fn: (tx: any) => Promise<any>) => fn(stubPrisma());
      }
      if (prop === "findMany" || prop === "findFirst") {
        return async () => [];
      }
      if (prop === "create" || prop === "createMany") {
        return async () => ({});
      }
      if (prop === "update" || prop === "updateMany" || prop === "deleteMany") {
        return async () => ({ count: 0 });
      }
      if (prop === "aggregate" || prop === "count") {
        return async () => ({ _sum: { balance: 0 }, _count: 0 });
      }
      return new Proxy(() => {}, handler);
    },
  };
  return new Proxy({}, handler);
}

// Import dinamis SETELAH env & Date teroverride — lib/data-management
// hanya membaca env saat pemanggilan createServerBackup.
async function loadDataManagement() {
  return import("./data-management.js");
}

test("createServerBackup: filename date component pakai WIB, bukan UTC", async () => {
  const { createServerBackup } = await loadDataManagement();
  const result = await createServerBackup(stubPrisma() as any);
  const fileName = String(result.fileName ?? "");
  assert.ok(
    fileName.startsWith("alba-backup-2026-10-09_"),
    `filename harus ber-prefix tanggal WIB (2026-10-09), dapat: ${fileName}`,
  );
  assert.ok(
    !fileName.includes("alba-backup-2026-10-08_2026-10-08T"),
    `filename tidak boleh pakai UTC date (2026-10-08) padahal waktu = 02:00 WIB: ${fileName}`,
  );
  // Komponen waktu setelah underscore tetap ISO UTC untuk keunikan.
  assert.ok(
    /_2026-10-08T19-00-00-000Z\.json$/.test(fileName),
    `waktu ISO UTC harus dipertahankan setelah tanggal WIB: ${fileName}`,
  );
});

test("createServerBackup: file benar-benar ditulis di direktori target", async () => {
  const { createServerBackup } = await loadDataManagement();
  const result = await createServerBackup(stubPrisma() as any);
  const filePath = path.join(tmpDir, String(result.fileName));
  const stat = await fs.stat(filePath);
  assert.ok(stat.isFile(), `file backup tidak ditemukan: ${filePath}`);
  const content = await fs.readFile(filePath, "utf8");
  assert.ok(content.length > 0, "file backup kosong");
  // exportedAt masih UTC ISO (presisi timestamp) — tidak ikut konversi WIB.
  const parsed = JSON.parse(content);
  assert.equal(parsed.exportedAt, "2026-10-08T19:00:00.000Z");
});

// Sanity check: realToIso dipakai agar test bisa cross-check Date.toISOString
// bekerja seperti biasa. (Hanya referensi; tidak ada assertion.)
test("sanity: helper realToIso tersedia", () => {
  assert.equal(typeof realToIso, "function");
});

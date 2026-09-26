import assert from "node:assert/strict";
import test, { after } from "node:test";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

// Arahkan penyimpanan ke folder temp SEBELUM modul storage dimuat (STORAGE_ROOT
// dibaca saat module load), supaya test tidak menulis ke data/uploads di repo.
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `alba-storage-${Date.now()}`);
const tmpRoot = process.env.UPLOAD_DIR!;

after(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

// tsx (output CJS) tidak mendukung top-level await; import dinamis di perkasus.
// Modul ter-cache setelah dipanggil pertama — saat itu env sudah terset.
async function loadStorage() {
  return import("./storage");
}

test("store root mengikuti UPLOAD_DIR", async () => {
  const storage = await loadStorage();
  assert.equal(storage.STORAGE_ROOT, tmpRoot);
});

test("saveImage menolak folder tidak dikenal", async () => {
  const storage = await loadStorage();
  await assert.rejects(
    storage.saveImage({
      bytes: new Uint8Array([1]),
      mimeType: "image/png",
      folder: "hack",
    }),
    /Folder upload tidak dikenali/,
  );
});

test("saveImage menolak tipe non-gambar", async () => {
  const storage = await loadStorage();
  await assert.rejects(
    storage.saveImage({
      bytes: new Uint8Array([1]),
      mimeType: "text/html",
      folder: "inventory",
    }),
    /Tipe file tidak didukung/,
  );
});

test("saveImage menolak gambar terlalu besar (maks 5MB)", async () => {
  const storage = await loadStorage();
  await assert.rejects(
    storage.saveImage({
      bytes: new Uint8Array(6 * 1024 * 1024),
      mimeType: "image/png",
      folder: "inventory",
    }),
    /Ukuran file terlalu besar/,
  );
});

test("saveImage menulis file & menghasilkan URL /uploads/<folder>/<file>", async () => {
  const storage = await loadStorage();
  const stored = await storage.saveImage({
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: "image/webp",
    folder: "inventory",
  });
  assert.match(
    stored.url,
    /^\/uploads\/inventory\/inventory-\d+-[0-9a-f-]{36}\.webp$/,
  );
  const data = await fs.readFile(
    path.join(storage.STORAGE_ROOT, "inventory", stored.filename),
  );
  assert.deepEqual([...data], [1, 2, 3]);
});

test("saveImage→resolveStoredFile round-trip di folder bukti", async () => {
  const storage = await loadStorage();
  const stored = await storage.saveImage({
    bytes: new Uint8Array([9, 8]),
    mimeType: "image/jpeg",
    folder: "bukti",
  });
  const data = await storage.resolveStoredFile("bukti", stored.filename);
  assert.ok(data);
  assert.deepEqual([...data], [9, 8]);
  await storage.deleteStoredFile(stored.url);
  assert.equal(await storage.resolveStoredFile("bukti", stored.filename), null);
});

test("deleteStoredFile mengabaikan URL eksternal & URL legasi tanpa error", async () => {
  const storage = await loadStorage();
  await storage.deleteStoredFile("https://example.com/a.png");
  await storage.deleteStoredFile("/api/bukti/legacy.jpg");
});

test("resolveStoredFile menolak path traversal", async () => {
  const storage = await loadStorage();
  assert.equal(await storage.resolveStoredFile("inventory", "../../secret.txt"), null);
});
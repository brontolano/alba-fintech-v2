import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, normalize } from "node:path";
import { normalizeUid, parseAscDump } from "../../nfc";

// Dijalankan dari root repo (npm test) — ikut pola freeze lain.
const root = process.cwd();

function read(relative: string): string {
  return readFileSync(join(root, normalize(relative)), "utf8");
}

// File inti modul NFC wajib ada
for (const p of [
  "lib/nfc.ts",
  "components/nfc/NfcUidInput.tsx",
  "app/dashboard/nfc/page.tsx",
]) {
  test(`[NFC] file ${p} ada`, () => assert.doesNotThrow(() => read(p)));
}

// UID kanonik + deteksi Web NFC
test("[NFC] lib/nfc.ts menyediakan normalizeUid (UPPERCASE + strip separator)", () => {
  const source = read("lib/nfc.ts");
  assert.ok(source.includes("normalizeUid"), "normalizeUid hilang");
  assert.ok(source.includes("toUpperCase"), "normalisasi UID hilang");
  assert.ok(source.includes("replace"), "strip separator hilang");
  assert.ok(
    source.includes("isWebNfcSupported"),
    "deteksi dukungan Web NFC hilang",
  );
  assert.ok(source.includes("scanNfcUid"), "pembaca Web NFC hilang");
});

// Komponen reusable mendukung tempel kartu + input manual
test("[NFC] NfcUidInput mendukung Tempel Kartu + input manual", () => {
  const source = read("components/nfc/NfcUidInput.tsx");
  assert.ok(source.includes('"use client"'), "client component wajib");
  assert.ok(source.includes("scanNfcUid"), "pembacaan NFC hilang");
  assert.ok(source.includes("normalizeUid"), "normalisasi UID hilang");
  assert.ok(source.includes("isWebNfcSupported"), "deteksi dukungan hilang");
  assert.ok(source.includes("onKeyDown"), "Enter keyboard-wedge hilang");
  assert.ok(source.includes("onEnter"), "handler Enter hilang");
});

// Terpasang di POS (SmartPay)
test("[NFC] Modul NFC terpasang di POS (SmartPay)", () => {
  const pos = read("app/dashboard/pos/page.tsx");
  assert.ok(pos.includes("NfcUidInput"), "komponen NFC belum di POS");
  assert.ok(pos.includes("normalizeUid"), "normalisasi UID belum di POS");
  assert.ok(pos.includes("smartCardUid"), "input SmartPay hilang");
});

// Terpasang di Tabungan (register + lookup)
test("[NFC] Modul NFC terpasang di Tabungan (register + lookup)", () => {
  const savings = read("app/dashboard/savings/page.tsx");
  assert.ok(savings.includes("NfcUidInput"), "komponen NFC belum di register tabungan");
  assert.ok(savings.includes("normalizeUid"), "normalisasi UID belum di tabungan");
  assert.ok(savings.includes("lookup"), "lookup tabungan hilang");
});

// Terpasang di Data Santri KPAK (tambah + edit)
test("[NFC] Modul NFC terpasang di Data Santri KPAK", () => {
  const kpakNew = read("app/dashboard/kpak/students/new/page.tsx");
  const kpakEdit = read("app/dashboard/kpak/students/[id]/page.tsx");
  assert.ok(kpakNew.includes("NfcUidInput"), "NFC belum di form santri baru");
  assert.ok(kpakNew.includes("normalizeUid"), "normalisasi belum di form santri baru");
  assert.ok(kpakEdit.includes("NfcUidInput"), "NFC belum di edit santri");
  assert.ok(kpakEdit.includes("normalizeUid"), "normalisasi belum di edit santri");
});

// Sidebar hub
test("[NFC] Halaman Modul NFC ada di navigasi Sidebar", () => {
  const sidebar = read("components/layout/Sidebar.tsx");
  assert.ok(sidebar.includes("/dashboard/nfc"), "link Modul NFC hilang");
});

// Server fallback: UID dengan separator tetap bisa dibaca (tanpa menghapus toUpperCase)
test("[NFC] smartpay masih menemukan kartu UID dengan separator", () => {
  const smartpay = read("app/api/smartpay/route.ts");
  assert.ok(smartpay.includes("toUpperCase"), "normalisasi UID SmartPay hilang");
  assert.ok(smartpay.includes("cardUid"), "cardUid hilang");
  assert.ok(smartpay.includes("replace"), "fallback strip separator hilang");
});

test("[NFC] lookup tabungan mendukung UID dengan separator", () => {
  const lookup = read("app/api/savings/lookup/route.ts");
  assert.ok(lookup.includes("toUpperCase"), "normalisasi UID lookup hilang");
  assert.ok(lookup.includes("replace"), "fallback strip separator lookup hilang");
  assert.ok(lookup.includes("studentNumber"), "lookup by NIS hilang");
});

// Parser dump kartu ASC (MIFARE Classic 1K, nfc.txt dari software writer)
const SAMPLE_DUMP = [
  "[ AF:C2:99:E7:13:08:04:00:62:63:64:65:66:67:68:69 ] Alamat 00 : UID0-UID3 / MANUFACTURER",
  "[ 00:00:00:00:00:00:FF:07:80:69:FF:FF:FF:FF:FF:FF ] Alamat 03 : KEYA / ACCESS / KEYB",
  "[ 32:30:32:36:30:37:32:34:31:37:33:33:32:38:00:00 ] Alamat 08 : DATA",
  "[ 4D:51:3D:3D:00:00:00:00:00:00:00:00:00:00:00:00 ] Alamat 09 : DATA",
  "[ 4D:6A:41:79:4E:69:30:77:4F:53:30:79:4F:51:3D:3D ] Alamat 0C : DATA",
  "[ 4D:54:49:7A:4E:44:55:32:00:00:00:00:00:00:00:00 ] Alamat 0E : DATA",
  "[ 4D:54:51:31:4D:6A:59:77:4E:44:63:3D:00:00:00:00 ] Alamat 14 : DATA",
  "[ 4D:55:48:41:4D:4D:41:44:20:53:48:41:46:41:20:4D ] Alamat 15 : DATA",
  "[ 4D:6A:4D:33:4E:54:41:77:4D:41:3D:3D:00:00:00:00 ] Alamat 1E : DATA",
].join("\n");

test("[NFC] parseAscDump membaca UID + jenis kartu MIFARE Classic 1K", () => {
  const card = parseAscDump(SAMPLE_DUMP);
  assert.ok(card, "dump valid gagal diurai");
  assert.equal(card.uid, "AFC299E7");
  assert.equal(card.uid, normalizeUid("af:c2:99:e7"));
  assert.equal(card.cardKind, "MIFARE Classic 1K");
});

test("[NFC] parseAscDump melewati trailer dan mengurai field base64", () => {
  const card = parseAscDump(SAMPLE_DUMP);
  assert.ok(card, "dump valid gagal diurai");
  assert.ok(
    card.blocks.every((b) => b.block % 4 !== 3),
    "blok trailer ikut terurai",
  );
  assert.equal(card.name, "MUHAMMAD SHAFA M");
  assert.equal(card.studentId, "14526047");
  assert.ok(card.amounts.includes("2375000"), "nominal hilang");
  assert.ok(card.dates.includes("2026-09-29"), "tanggal hilang");
  assert.equal(card.timestamp, "20260724173328");
});

test("[NFC] parseAscDump menolak teks sampah", () => {
  assert.equal(parseAscDump(""), null);
  assert.equal(parseAscDump("halo dunia"), null);
});
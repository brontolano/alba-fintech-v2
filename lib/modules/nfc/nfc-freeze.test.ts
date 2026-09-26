import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, normalize } from "node:path";

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
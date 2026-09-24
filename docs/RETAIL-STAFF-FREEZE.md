# KUNCI MODUL UNIT TYPE RETAIL – STAFF — JANGAN UBAH TANPA PERSETUJUAN PEMILIK

Status: **FIX / FINAL** per instruksi pemilik (baseline: modul Staff selesai QA).
Referensi desain: `docs/DESAIN-RETAIL-STAFF.md`,
`docs/RETAIL-CHECKIN-POS-SPEC.md`, `docs/RETAIL-BATCH-POS-SPEC.md`,
`docs/RETAIL-STOKMASUK-SPEC.md`.

Prinsip template: satu kode untuk semua unit `isRetail` (Koperasi Buku,
Kantin Umi, Kantin Baru, dst). Data mandiri per `unitId` session — tidak ada
nama unit di-hardcode dalam logika.

## Aturan penguncian
1. File di bawah adalah permukaan final modul RETAIL STAFF. Pengembangan
   lain **dilarang** mengubah perilakunya.
2. Bila perubahan tak terhindarkan, wajib:
   - Minta persetujuan eksplisit pemilik TERLEBIH DULU, dan
   - Pastikan `npm test` tetap hijau (test `retail-staff-freeze.test.ts`
     gagal = perubahan DITOLAK otomatis).
3. Kebutuhan baru = file/route BARU — jangan ubah yang beku.
4. File retail lama tetap dikunci `docs/RETAIL-FREEZE.md`; file KPAK tetap
   dikunci `docs/KPAK-STAFF-FREEZE.md` & `docs/KPAK-MANAGER-FREEZE.md`.

## Permukaan beku (retail staff)
Halaman:
- app/dashboard/retail/shift (Ringkasan + Kontrol POS + Timeline)
- app/dashboard/retail/inventory (KPI + grid, view Staff)
- app/dashboard/retail/inventory/tambah (redirect → stok-masuk)
- app/dashboard/retail/stok-masuk (+review untuk Manager)
- app/dashboard/retail/sisa
- app/dashboard/retail/konsinyasi (+[ownerId], +laporan, +serah-terima)
- app/dashboard/retail/belanja
- app/dashboard/pos (wizard 4-langkah), app/dashboard/transactions
  (varian ledger Staff), app/dashboard/reports (varian ringkas Staff)
Komponen: components/retail/RetailStaffDashboard.tsx,
RetailManagerDashboard.tsx, RetailStaffLedger.tsx, RetailStaffReport.tsx,
ImageUpload.tsx, RetailSidebar.tsx, RetailMobileNav.tsx, RetailPageHeader.tsx.
Lib: lib/retail-guard.ts, lib/retail-phase.ts, lib/retail-shift-gate.ts,
lib/retail/navigation.ts.
API: retail/dashboard, retail/shift, retail/pos-session, retail/inventory
(POST-only), retail/batches (+[id]), retail/sisa (+[id]),
retail/consignments (owners, items, report, payouts), retail/reorder,
smartpay, transactions, inventory.
Migrasi: database-update-v3.sql … database-update-v7.sql (manual, TANPA
`prisma db push`).

## Perilaku yang dikunci
- Scope unit: MANAGER/STAFF selalu dipaksa unit sendiri (`resolveUnitId`,
  `unitIsRetail`); SUPERADMIN/PIMPINAN monitor.
- Shift multi-session (`shift_sessions`): check-in berkali-kali/hari,
  tolak bila segmen terbuka; check-out tolak 409 `POS_MASIH_TERBUKA`
  kecuali force + alasan → auto-close tercatat + notifikasi WARNING manager.
- Sesi POS: open wajib check-in + modal > 0; close wajib hitung fisik,
  selisih tersimpan; satu sesi terbuka per kasir.
- Transaksi retail (tunai & smartcard) wajib `posSessionId` valid milik
  kasir, else 409 `POS_BELUM_DIBUKA`. Atribusi `createdById` + sesi.
- Batch: `asDraft` tanpa ubah stok; approve Manager terapkan atomik
  (stok, modal final, link titipan); reject wajib alasan.
- Stocktake & review batch & payout bayar & persetujuan sisa: MANAGER saja
  (403 untuk lainnya). Stock-in manual: MANAGER saja di halaman inventory;
  Staff lewat Stok Masuk.
- UMKM jalur titipan wajib No WA aktif (format 08…/628…, auto-normalisasi).
- Konsinyasi: `hakPemilik = qty × costPrice`, `komisiUnit = omzet − hak`;
  payout cegah rentang rangkap; PAID catat EXPENSE ref `CONSIGN-PAYOUT-<id>`.
- Halaman `barang-titipan` DIHAPUS anti-duplikat (input di tambah/batch,
  list di inventory tab Titipan, pemilik di konsinyasi).
- Nav Staff: MobileNav (Beranda, Shift, POS, Inventori, Laporan) + grup
  Sidebar "Retail Saya" (Shift, Stok, Stok Masuk, Hitung Sisa, Titipan UMKM).

## Skema DB (tidak dimigrasi otomatis)
- v3: `purchase_items`, `savings_accounts.dailySpendLimit`.
- v4: `shift_sessions`, `pos_sessions`, `transactions.posSessionId`.
- v5: `stock_batches`, `stock_batch_items`.
- v6: batch `status/review*`, `finalUnitCost`, `whatsappVerified`.
- v7: `stock_counts`.

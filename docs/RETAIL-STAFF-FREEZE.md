# KUNCI MODUL RETAIL STAFF/MANAGER (KONSIYASI + SHIFT + INVENTORY) — JANGAN UBAH TANPA PERSETUJUAN PEMILIK

Status: **FIX / FINAL** per keputusan implementasi retail staff.
Referensi desain: `docs/DESAIN-RETAIL-STAFF.md`.

## Aturan penguncian
1. File di bawah adalah permukaan baru modul RETAIL STAFF/MANAGER yang
   sudah stabil. Pengembangan lain **dilarang** mengubah perilakunya.
2. Bila perubahan tak terhindarkan, wajib:
   - Minta persetujuan eksplisit pemilik TERLEBIH DULU, dan
   - Pastikan `npm test` tetap hijau (test `retail-staff-freeze.test.ts`
     gagal = perubahan DITOLAK otomatis).
3. Kebutuhan baru = file/route BARU — jangan ubah yang beku.
4. File retail lama tetap dikunci oleh `docs/RETAIL-FREEZE.md`; file KPAK
   tetap dikunci oleh `docs/KPAK-STAFF-FREEZE.md` & `docs/KPAK-MANAGER-FREEZE.md`.

## Permukaan beku (retail staff/manager)
Halaman: app/dashboard/retail/shift, app/dashboard/retail/inventory,
app/dashboard/retail/konsinyasi (+laporan, +serah-terima).
Komponen: components/retail/RetailStaffDashboard.tsx,
components/retail/RetailManagerDashboard.tsx.
Lib: lib/retail-phase.ts, lib/retail-shift-gate.ts, lib/retail-guard.ts.
API: retail/shift, retail/inventory, retail/consignments (owners, items,
report, payouts).
Routing: app/dashboard/page.tsx (hanya bagian isRetailStaff/isRetailManager
— izin khusus tertuang di DESAIN-RETAIL-STAFF.md).

## Skema DB (tidak dimigrasi otomatis)
- `ConsignmentOwner`, `ConsignmentItem`, `ConsignmentPayout`,
  enum `MarginType`, `PayoutStatus` — di-apply manual via
  `database-update-retail-staff.sql` (remote MySQL). TIDAK pakai
  `prisma db push` ke remote.

## Perilaku yang dikunci
- Shift retail: buka/tutup per hari WIB, satu baris per [unitId, userId, date],
  stage gate LAYANI/PENERIMAAN dari `lib/retail-phase.ts` — SAMA seperti gate
  KPAK tanpa mengubah tabel/shift KPAK.
- Konsinyasi: owner unik per unit; item titipan menambah stok inventori &
  mencatat `currentStock`; formula `hakPemilik = qty * costPrice`,
  `komisiUnit = omzet - hakPemilik`.
- Payout konsinyasi: draft UNPAID → PENDING → PAID; saat PAID dibuat
  `Transaction` EXPENSE (unique ref `CONSIGN-PAYOUT-<id>`); PENDING diblokir
  dari payout ganda; hanya MANAGER (atau role atas) yang melakukan serah terima.
- Inventory retail: stock-in & stocktake via `/api/retail/inventory`
  (POST-only) — TIDAK mengubah perilaku `/api/inventory` yang beku,
  stok tak boleh negatif.
- Guard: MANAGER/STAFF wajib `unitIsRetail === true`; SUPERADMIN/PIMPINAN
  hanya monitor (bukan operasi).

## Catatan integrasi
- Sidebar/MobileNav dikunci (RETAIL-FREEZE + KPAK freeze) — akses halaman
  retail via QuickAccess di dashboard retail.
- `ShiftAttendance` dipakai bersama KPAK — jangan ubah skema atau gate-nya.
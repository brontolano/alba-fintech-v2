# Findings — Modul Retail STAFF & Konsinyasi

## Pola modul KPAK yang ditiru (jangan diubah, dijadikan referensi)

| Pola | File | Fungsi |
|------|------|--------|
| Fase harian WIB | `lib/kpak-phase.ts` | `getKpakPhase(at?)` → pagi/operasi/tutup/selesai; `nowWib()` Asia/Jakarta |
| Gate shift | `lib/kpak-shift-gate.ts` | `hasActiveShift(unitId, userId, service?)` (ShiftAttendance [unitId,userId,date] checkOutAt null); `isStaffKpak` |
| API shift | `app/api/kpak/shift/route.ts` | action check-in/check-out/set-service; service `TABUNGAN/KEUANGAN`; `resolveUnitId`; role SUPERADMIN/PIMPINAN/MANAGER/STAFF |
| Dashboard routing | `app/dashboard/page.tsx` | isKpakStaff → KpakStaffDashboard; isKpakManager → KpakManagerDashboard; else switch role |
| Dashboard staff | `components/kpak/KpakStaffDashboard.tsx` | status shift, quick akses, ringkasan, dll |
| Freeze doc | `docs/KPAK-STAFF-FREEZE.md` | daftar permukaan beku + aturan |
| Dashboard manager | `components/kpak/KpakManagerDashboard.tsx` | fase WIB + statistik |

## Kondisi retail saat ini (FROZEN — baseline `9005f8a`, commit `ec18290`)

- `RETAIL-FREEZE.md` beku: PAGES (pos, pos/shift, inventory → dashboard/pos/**, dashboard/inventory/**), API (`app/api/pos/shift`, `app/api/smartpay`, `app/api/inventory/**`), SHARED (`components/layout/Sidebar.tsx`, `MobileNav.tsx`, `lib/use-page-guard.ts`, dll).
- Shift kasir retail: `app/api/pos/shift/route.ts` (action check-in/check-out, TANPA service), `app/dashboard/pos/shift/page.tsx`.
- `guardRetail(session)` di dalam `app/api/pos/shift/route.ts`: MANAGER/STAFF wajib `unitIsRetail === true`.
- `resolveUnitId`: MANAGER/STAFF → `session.user.unitId`.
- Auth: `options.ts` menyuntik `unitIsRetail`, `unitType`, `lembagaId`, `role`, `isActive` ke session; pola JWT `roleCheckedAt` = 60s refresh.
- `InventoryItem` roles API: GET SUPERADMIN/PIMPINAN/MANAGER/STAFF, POST/DELETE hanya SUPERADMIN/MANAGER. **Staff TIDAK bisa create/delete inventory** saat ini — penerimaan stock staf butuh route baru.

## Rutinitas operasional retail (dari pemilik) → dipetakan ke fase

| Jam WIB | Aktivitas | Keterangan layanan |
|---------|-----------|--------------------|
| <06:00 | Check-in staff/manager | Shift absen |
| 06:00–06:30 | Setelah qiraat: ahlu syirkah rolling lapor ke Direktur Keuangan; lain siapkan buka syirkah | Persiapan |
| 06:30–19:00 | Layani santri idam/jajan; terima barang dagangan; terima stock gudang | POS + penerimaan |
| 08:30–11:30 | Terima dagangan & bon dari pedagang | Penerimaan (konsinyasi/supplier) |
| 09:00–11:30 | Ahlu syirkah Ummi rolling: buka & layani santri putri di syirkah Amin | POS (rolling) |
| 17:00 | Hitung jajanan sisa | Opname/hitung sisa |
| 19:00–22:00 | Pembukuan, isi stok syirkah, menandzifkan syirkah | Penutupan + pengisian stok |
| 06:00–22:00 | Jam operasional | — |

## Keputusan desain (dikonfirmasi pemilik)

1. Output sekarang: **desain dokumen dulu** (docs/DESAIN-RETAIL-STAFF.md).
2. Konsinyasi: **entitas terpisah** — model baru (Pemilik/Barang titipan/Serah terima), bukan field tambahan di InventoryItem.
3. Layanan shift staf retail: **POS & INVENTORY** — saat check-in staff memilih layanan (perlu `service` di ShiftAttendance — kolom sudah ada via freeze KPAK, `service String?`).
4. Konsinyasi: **alur lengkap** — terima barang + tentukan margin → jual via POS → laporan penjualan per pemilik → serah terima uang kas kembali ke pemilik.

## Kekosongan yang harus diisi

- Tidak ada model konsinyasi di schema (efisiensi: brand new model).
- Shift kasir retail tidak punya `service` (pos/shift beku — perlu route BARU untuk shift staf dengan service, jangan ubah `app/api/pos/shift/route.ts`).
- Staff tidak bisa kelola inventory (route beku) — perlu `app/api/retail/inventory` untuk penerimaan/hitung sisa.
- Tidak ada dashboard khusus staff retail (routing dashboard berdasar `unitType === "KPAK"` saja).
- Kolom `service` di ShiftAttendance ada (`VarChar(20)`); perlu pastikan nilai `POS`/`INVENTORY` tidak bentrok dengan KPAK (`TABUNGAN`/`KEUANGAN`) dan gate KPAK tidak terpengaruh.

## Constraints

- Hanya `npx prisma generate` (TIDAK `prisma db push` ke remote; drift error 150). Tabel konsinyasi baru via SQL manual + schema.prisma.
- `npm test` = daftar eksplisit di package.json; test baru wajib ditambahkan.
- JANGAN ubah file/route beku; JANGAN module staff KPAK; JANGAN ubah perilaku default (Sidebar/MobileNav KPAK 5 item).
- Commit selektif + push ke remote `brontolano/alba-fintech-v2`.
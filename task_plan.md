# Rencana Modul UNIT TYPE RETAIL — STAFF (POS + Inventory) & Konsinyasi UMKM

## Tujuan

Mempersiapkan modul PERAN STAFF untuk unit retail (Koperasi Buku, Kantin Umi,
Kantin Baru) dengan pendekatan rapi ala modul KPAK, fokus ke:

1. **Layanan POS** — kasir melayani santri (jual tunai/kartu).
2. **Layanan Management Inventory** — staff menerima barang dagangan & stock
   gudang, hitung sisa jajanan, isi stok syirkah.
3. **Titipan UMKM (konsinyasi)** — barang dititipkan, dicatat, ditentukan margin,
   laporan penjualan per pemilik, uang kas diserahterimakan ke pemilik.

Tidak ada perubahan perilaku file beku (`RETAIL-FREEZE.md`, `KPAK-*FREEZE.md`).
Semua kemampuan baru lewat file/route/schema baru. `npm test` wajib hijau.

## Keputusan Pemilik

- Output sekarang: **desain dokumen dulu** (docs/DESAIN-RETAIL-STAFF.md).
- Data konsinyasi: **entitas terpisah** (bukan tambahan field InventoryItem).
- Layanan shift staff retail: **POS & INVENTORY** (seperti KPAK TABUNGAN/KEUANGAN).
- Fokus konsinyasi: **alur lengkap** (terima → margin → jual → laporan → serah terima cash).

## Fase

- [in-progress] Susun docs/DESAIN-RETAIL-STAFF.md + planning files (task_plan/findings/progress)
- [ ] Review desain oleh pemilik
- [ ] Schema: tambah model konsinyasi + enum (schema.prisma) → prisma generate
- [ ] SQL manual remote (database-update-retail-staff.sql): CREATE TABLE IF NOT EXISTS
- [ ] lib/retail-phase.ts (fase operasional 06:00–22:00 WIB ala kpak-phase)
- [ ] lib/retail-shift-gate.ts (gate shift dengan service POS/INVENTORY)
- [ ] app/api/retail/shift/route.ts (check-in/out + set-service; TIDAK menyentuh pos/shift)
- [ ] app/api/retail/inventory/route.ts (penerimaan barang/stock-in untuk staff)
- [ ] app/api/consignments/owners/route.ts + items CRUD
- [ ] app/api/consignments/checkout/route.ts (POS konsinyasi atomik)
- [ ] app/api/consignments/sales/route.ts (laporan penjualan per pemilik)
- [ ] app/api/consignments/handovers/route.ts (serah terima cash ke pemilik)
- [ ] components/retail/RetailStaffDashboard.tsx + routing app/dashboard/page.tsx
- [ ] Halaman retail (dashboard, layanan, konsinyasi, laporan, serah terima)
- [ ] lib/modules/retail/retail-staff-freeze.test.ts + npm test hijau
- [ ] docs/RETAIL-STAFF-FREEZE.md (freeze setelah stabil)
- [ ] Validasi tsc, build, smoke test; commit selektif + push

## Result

(Belum selesai — desain sedang disusun.)

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| (kosong) | – | – |
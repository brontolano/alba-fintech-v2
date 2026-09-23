# Desain Modul UNIT TYPE RETAIL — STAFF (Layanan POS & Inventory) + Konsinyasi UMKM

Status: **Rancangan (belum implementasi)** — untuk direview pemilik sebelum ngoding.
Pendekatan: mengikuti **modul KPAK** (fase operasional WIB, shift dengan layanan,
dashboard khusus peran, freeze doc + regression test). File/route beku TIDAK diubah;
semua kemampuan baru lewat file/route BARU.

---

## 1. Latar Belakang

Unit retail (Koperasi Buku, Kantin Umi, Kantin Baru) beroperasi **06:00–22:00 WIB**.
Staf harian menjalankan rutinitas: layani santri, terima barang dagangan & stock
gudang, terima dagangan & bon dari pedagang, hitung jajanan sisa, pembukuan malam.
Selain itu ada model **titipan UMKM (konsinyasi)**: pedagang/UMKM menitipkan barang,
kantin menjualnya, margin ditentukan bersama, hasil penjualan dicatat, lalu **uang
kas diserahterimakan kembali ke pemilik barang**.

### Pembagian peran (klarifikasi pemilik)

| Pihak | Fokus | Di modul ini |
|-------|-------|--------------|
| **STAFF** | Pelayanan: kasir POS, inventory, menerima dari UMKM, penjualan & pengelolaan konsinyasi | Shift dengan layanan `POS`/`INVENTORY`, penerimaan stock, stocktake, kelola/titip & jual barang UMKM |
| **MANAGER** | Management & keuangan: LPJ, stor uang cash ke pimpinan, pengajuan pembelanjaan stok ke pimpinan | Dashboard manager retail + **reuse** sistem yang sudah ada: `handovers` (stor cash) & `approvals` (pengajuan belanja) |

> Sistem `app/api/handovers` (MANAGER → PIMPINAN, hitung otomatis dari transaksi
> APPROVED harian) dan `app/api/approvals` (`resolveApprover`, pengajuan belanja/
> pembelian) **sudah ada & berfungsi** — modul ini TIDAK membuat duplikat; manager
> retail memakai halaman/flow yang sama (sudah ride on subsystem lama).

Tujuan desain:

| No | Tujuan | Cara |
|----|--------|------|
| 1 | Staff retail punya identitas & layanan jelas ala KPAK | Check-in shift dengan pilihan layanan `POS` / `INVENTORY` |
| 2 | Dashboard khusus staff retail | Fase operasional WIB + quick akses sesuai layanan aktif |
| 3 | Penerimaan barang/stock oleh staff | Route baru `app/api/retail/inventory` (staff saat ini TIDAK bisa POST inventory) |
| 4 | Konsinyasi tercatat rapi & terpisah | Tabel baru: pemilik, barang titipan (dengan margin), serah terima uang |
| 5 | Laporan penjualan per pemilik + serah terima cash | Route laporan + payout; saat payout tercatat transaksi EXPENSE |
| 6 | Manager: LPJ & stor cash ke pimpinan & pengajuan belanja stok | **Reuse** `handovers` + `approvals` yang sudah ada (bukti: terverifikasi) |

### Keputusan desain (konfirmasi pemilik)
- Output sekarang = **dokumen desain**; implementasi menyusul setelah review.
- Konsinyasi = **entitas terpisah** (bukan tambahan field InventoryItem).
- Layanan shift staf retail = **POS & INVENTORY** (seperti KPAK `TABUNGAN/KEUANGAN`).
- Konsinyasi prioritas = **alur lengkap** (terima → margin → jual → laporan → serah terima cash).

---

## 2. Fase Operasional Retail (WIB)

Dibuat sebagai `lib/retail-phase.ts` (pola: `lib/kpak-phase.ts`), memakai helper WIB
(`+7*3600*1000`, `nowWib()` timeZone Asia/Jakarta).

| Fase | Rentang WIB | Aktivitas rutin yang dipetakan |
|------|-------------|--------------------------------|
| `PERSIAPAN` | 06:00–06:30 | Setelah qiraat: ahlu syirkah rolling lapor Direktur Keuangan; sisanya siapkan buka syirkah |
| `OPERASI` | 06:30–08:30 | Buka & layani santri idam/jajan; terima barang dagangan & stock gudang |
| `PENERIMAAN` | 08:30–11:30 | Terima dagangan & bon dari pedagang (konsinyasi/supplier); rolling syirkah Ummi buka syirkah Amin 09:00–11:30 |
| `LAYANI` | 11:30–17:00 | Layani santri; persiapan hitung sisa |
| `HITUNG` | 17:00–19:00 | Hitung jajanan sisa |
| `PENUTUPAN` | 19:00–22:00 | Pembukuan, isi stok syirkah, menandzifkan syirkah |
| `TUTUP` | 22:00–06:00 | Di luar jam operasional |

`getRetailPhase(at?)` mengembalikan fase saat ini; dipakai dashboard staff &
(opsional) penanda visual. Catatan: KPAK punya fase sendiri; **tidak menyentuh**
`kpak-phase.ts`.

---

## 3. Shift Staff dengan Layanan (POS / INVENTORY)

Kolom `service String?` sudah ada di `shift_attendances` (dipakai KPAK:
`TABUNGAN`/`KEUANGAN`). Retail memakai nilai **`POS`** / **`INVENTORY`** — tidak
mengganggu KPAK (per-unit & per-user).

### `GET /api/retail/shift`
- Guard: `role ∈ {SUPERADMIN,PIMPINAN,MANAGER,STAFF}`; MANAGER/STAFF wajib `unitIsRetail`.
- Unit scope: `resolveUnitId` (MANAGER/STAFF → `session.user.unitId`).
- Response: `{ date, nowWib, phase, mine, crew[], myTxToday, lowStock[]? }`.

### `POST /api/retail/shift`
Body: `{ action: "check-in"|"check-out"|"set-service", service?: "POS"|"INVENTORY", note? }`
- `check-in`: buat `ShiftAttendance` (via unique `[unitId,userId,date]`). Boleh
  check-in ulang setelah checkout (pola KPAK/pos).
- `set-service`: hanya jika shift aktif; set `service` (staff hlm shift/dashboard).
- `check-out`: wajib sudah check-in & belum checkout.
- Detil ala `app/api/pos/shift/route.ts` (WIB, guard retail, P2002 handling).

> Alasan route BARU: `app/api/pos/shift` FROZEN (tidak boleh ubah).
> `service` diperbolehkan kosong → shift kasir "umum" (kompatibel dengan yang lama).

---

## 4. Konsinyasi UMKM — Model Data (entitas terpisah)

Tabel baru (manual SQL remote + `schema.prisma`), semua `unitId` untuk scope:

### `ConsignmentOwner` — pemilik barang titipan (pedagang/UMKM)
| Kolom | Tipe | Catatan |
|-------|------|---------|
| id | cuid | PK |
| unitId | FK→Unit | scope |
| name | String | wajib |
| phone / address | String? | kontak |
| isActive | Boolean | default true |
| createdAt / updatedAt | DateTime | |

### `ConsignmentItem` — barang titipan
| Kolom | Tipe | Catatan |
|-------|------|---------|
| id | cuid | PK |
| unitId | FK→Unit | scope |
| ownerId | FK→ConsignmentOwner | pemilik barang |
| inventoryItemId | FK→InventoryItem @unique | barang fisik yang dijual via POS |
| marginType | enum `PERCENT`/`FIXED` | cara hitung margin |
| marginValue | Decimal | % atau nominal/unit |
| costPrice | Decimal | modal/modal dipakai (harga dari pemilik) |
| agreedPrice | Decimal | harga jual di rak (cost + margin) |
| isActive | Boolean | default true |
| createdAt / updatedAt | DateTime | |

> Hubungan **1 barang = 1 InventoryItem**: POS/smartpay tetap jalan tanpa ubah
> perilaku — `OrderItem` menunjuk `InventoryItem`, lalu kita lacak pemilik lewat
> `ConsignmentItem`. Stok, SKU, barcode konsisten.

### `ConsignmentPayout` — serah terima uang ke pemilik
| Kolom | Tipe | Catatan |
|-------|------|---------|
| id | cuid | PK |
| unitId | FK→Unit | scope |
| ownerId | FK→ConsignmentOwner | penerima uang |
| amount | Decimal | uang yang diserahkan (hak pemilik) |
| fromDate / toDate | DateTime | periode penjualan yang dihitung |
| status | enum `PENDING`/`PAID`/`CANCELLED` | |
| transactionId | FK→Transaction? | transaksi EXPENSE saat dibayar |
| paidById | FK→User? | siapa yang serah terima |
| note | String? | |
| createdAt | DateTime | |

### Enum tambahan
- `MarginType { PERCENT, FIXED }`
- `PayoutStatus { PENDING, PAID, CANCELLED }`

---

## 5. Desain Endpoint (semua BARU)

### Konsinyasi
| Method | Endpoint | Fungsi | Role |
|--------|----------|--------|------|
| GET | `/api/retail/consignments/owners` | List pemilik (+saldo hak periode)? | SUPERADMIN/PIMPINAN/MANAGER/STAFF |
| POST | `/api/retail/consignments/owners` | Buat pemilik | MANAGER/STAFF/SUPERADMIN/PIMPINAN |
| PATCH | `/api/retail/consignments/owners/[id]` | Ubah/nonaktifkan pemilik | MANAGER/SUPERADMIN |
| GET | `/api/retail/consignments/items` | List barang titipan (join inventori) | semua di atas |
| POST | `/api/retail/consignments/items` | Terima barang titipan → buat `InventoryItem` + `ConsignmentItem`; hitung `agreedPrice = cost + (PERCENT/FIXED) margin` | MANAGER/STAFF/SUPERADMIN/PIMPINAN |
| PATCH | `/api/retail/consignments/items/[id]` | Ubah margin/stok/aktivasi | MANAGER/SUPERADMIN |
| GET | `/api/retail/consignments/report?ownerId=&from=&to=` | Laporan penjualan per pemilik (total terjual, modal, komisi unit, **hak pemilik = modal × qty**) | PIMPINAN/MANAGER/STAFF/SUPERADMIN |
| GET | `/api/retail/consignments/payouts?ownerId=&status=` | List serah terima uang | PIMPINAN/MANAGER/STAFF/SUPERADMIN |
| POST | `/api/retail/consignments/payouts` | Buat payout (hitung dari laporan, periode) → status PENDING | MANAGER/STAFF/SUPERADMIN/PIMPINAN |
| PATCH | `/api/retail/consignments/payouts/[id]` | Konfirmasi PAID → buat `Transaction` EXPENSE (kategori "Titipan UMKM" / kas) + isi `transactionId`/`paidById` | MANAGER/SUPERADMIN/PIMPINAN |

### Register penerimaan staff (Inventory)
| Method | Endpoint | Fungsi | Role |
|--------|----------|--------|------|
| POST | `/api/retail/inventory/stock-in` | Penerimaan barang/stock gudang (naikkan `currentStock`, log via `note`/audit) | MANAGER/STAFF |
| POST | `/api/retail/inventory/stocktake` | Hasil hitung sisa lintas item (17:00) → set stok + catat selisih | MANAGER/STAFF |

> `app/api/inventory/**` FROZEN — tidak diubah; route baru di atas memakai
> model/skema yang sama (hanya tambah data stok), sehingga tidak ada konflik.

### Cara hitung laporan vs payout
- Per item: `hakPemilik = quantity_terjual × costPrice` (modal yang harus dikembalikan).
- `komisiUnit = quantity_terjual × (agreedPrice − costPrice)`.
- `payout.amount = Σ hakPemilik` pada rentang periode.
- Saat PAID: buat `Transaction` EXPENSE amount = `payout.amount` (kas keluar).

---

## 6. Struktur UI

| File | Fungsi |
|------|--------|
| `components/retail/RetailStaffDashboard.tsx` | Dashboard staf retail: fase WIB, status shift + layanan, quick akses POS/Inventory/Konsinyasi, ringkasan (penjualan hari ini, stok menipis, payout pending) |
| `components/retail/RetailManagerDashboard.tsx` | Dashboard manager retail: fase WIB, ringkasan keuangan unit, link **LPJ/laporan**, **stor cash → PIMPINAN** (`/dashboard/handovers`), **pengajuan belanja stok** (`/dashboard/approvals`), pending approvals |
| `app/dashboard/page.tsx` (EDIT — izin khusus) | Tambah `isRetailStaff = role==="STAFF" && unitIsRetail` → `RetailStaffDashboard`, `isRetailManager = role==="MANAGER" && unitIsRetail` → `RetailManagerDashboard` (sebelum switch biasa) |
| `app/dashboard/retail/konsinyasi/page.tsx` | Kelola pemilik & barang titipan |
| `app/dashboard/retail/konsinyasi/laporan/page.tsx` | Laporan penjualan per pemilik + aksi payout |
| `app/dashboard/retail/konsinyasi/serah-terima/page.tsx` | Halaman payout/konfirmasi |
| `app/dashboard/retail/inventory/page.tsx` | Penerimaan stock + stocktake staff |
| `app/dashboard/retail/shift/page.tsx` | Shift + pilih layanan |

> Navigasi via tombol/link di dashboard (Sidebar/MobileNav beku);
> tidak menyentuh file layout beku.

---

## 7. SQL Manual (remote) — ringkasan

File: `database-update-retail-staff.sql` (pola `database-update-kpak-source.sql`,
`scripts/create-handover-table.sql`): `CREATE TABLE IF NOT EXISTS` untuk
`consignment_owners`, `consignment_items`, `consignment_payouts`; `ALTER ... CONVERT
utf8mb4_uca1400_ai_ci`; `ADD CONSTRAINT FK` unit/owner/user/transaction. TIDAK pakai
`prisma db push`.

---

## 8. Freeze & Regression

- `docs/RETAIL-STAFF-FREEZE.md`: permukaan baru (dashboard retail,
  halaman retail, API retail, schema konsinyasi) + aturan.
- `lib/modules/retail/retail-staff-freeze.test.ts` → sudah masuk script
  `test` di `package.json`; memastikan file beku lama tetap utuh +
  endpoint baru ada + routing dashboard retail terpasang.
- `npm test` wajib hijau (regresi: `retail-freeze.test.ts`,
  `staff-freeze.test.ts`, `manager-freeze.test.ts`, `retail-staff-freeze.test.ts`).

---

## 9. Roadmap Implementasi

1. Schema + SQL manual → `prisma generate`.
2. `lib/retail-phase.ts` + `lib/retail-shift-gate.ts`.
3. `app/api/retail/shift` (shift + service).
4. Konsinyasi: owners → items → report → payouts.
5. `app/api/retail/inventory` (stock-in, stocktake).
6. UI: `RetailStaffDashboard` + `RetailManagerDashboard` + halaman konsinyasi/inventory/shift.
7. Freeze doc + regression test; `tsc`, build, smoke test; commit selektif.

### Catatan reuse (tidak dibuat baru)
- **Stor cash Manager → PIMPINAN**: sistem `app/api/handovers` + halaman `/dashboard/handovers` (MANAGER, hitung dari transaksi APPROVED, status PENDING→ACCEPTED).
- **Pengajuan belanja stok → PIMPINAN**: sistem `app/api/approvals` + `lib/approvalRouting.ts` + halaman `/dashboard/approvals` (transaksi EXPENSE + status PENDING approval oleh `resolveApprover`).

## Referensi modul KPAK yang ditiru (jangan diubah)
`lib/kpak-phase.ts`, `lib/kpak-shift-gate.ts`, `app/api/kpak/shift/route.ts`,
`components/kpak/KpakStaffDashboard.tsx`, `docs/KPAK-STAFF-FREEZE.md`.
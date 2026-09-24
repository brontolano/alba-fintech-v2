# Riset & Arsitektur Ulang: Stok Masuk + Konsinyasi — Unit Type Retail

Status: **Riset + rancangan — build bertahap setelah review.**
Fokus UI: STAFF (input) & MANAGER (review/approve). Template reusable per unit.

---

## 1. Temuan riset (existing vs kebutuhan)

| Kebutuhan | Existing | Gap |
|---|---|---|
| Stok Masuk Pondok → draft → review modal → approve | `tambah` langsung apply stok via `POST /api/inventory` + `POST /api/retail/batches` langsung apply | **Belum ada**: tidak ada status draft/review/approve di batch |
| Stok Masuk Titipan → nota → jajanan sisa → review → approve | `consignments/items` langsung aktif; nota tidak ada; sisa tidak ada | **Belum ada**: nota titipan (cetak/WA), hitung sisa, review bayar modal |
| UMKM wajib No WA aktif | `phone` opsional, tanpa validasi | Validasi wajib di alur titipan |
| Inventory: Staff lihat, Manager CRUD | Staff masih bisa stock-in manual + tombol stocktake disembunyikan saja | Pertegas RBAC + pisahkan halaman input |
| Laporan otomatis per UMKM | `report` (omzet, hak, komisi) ✅ | Sudah ada — dipakai ulang |
| Serah terima ke pemilik | `payouts` draft → PAID + `serah-terima` page ✅ | Sudah ada — dipakai ulang |
| Nota titipan cetak/WA | Hanya struk POS + WA POS | Pola dicopy ke nota titipan |

Keputusan: **pakai ulang** report/payout/serah-terima (sudah benar), **bangun baru**:
`stok-masuk` wizard, status batch + review/approve API, nota titipan,
hitung sisa, validasi WA, RBAC inventory.

---

## 2. Arsitektur halaman baru

```
/dashboard/retail/inventory            VIEW (Staff: lihat + search/filter/tab/grid)
  └─ shortcut → /dashboard/retail/stok-masuk
/dashboard/retail/stok-masuk           WIZARD INPUT (Staff)
/dashboard/retail/stok-masuk/review    REVIEW + APPROVE (Manager)
/dashboard/retail/konsinyasi           PEMILIK + payout + laporan (existing, dipertahankan)
/dashboard/retail/konsinyasi/laporan   LAPORAN OTOMATIS per UMKM (existing)
/dashboard/retail/konsinyasi/serah-terima  SERAH TERIMA (existing)
```

### 2.1 Wizard Stok Masuk — Step 1: pilih jenis

```
[Pondok (milik unit)]   [Titipan UMKM]
```

### 2.2 Jalur Pondok

```
Input batch (tanggal auto, sumber=PEMBELIAN + ref pengajuan, baris existing/baru)
  → Draf Laporan Stok Masuk (preview modal Σqty×harga)
  → Submit → status DRAFT
  → REVIEW MANAGER: ubah harga modal per baris → Approve
  → stok += qty, purchasePrice = modal final, batch APPROVED
  → Reject (dengan alasan) → batch REJECTED, stok tak berubah
```

### 2.3 Jalur Titipan

```
Pilih UMKM (dropdown) / Buat baru (nama + NO WA AKTIF wajib + alamat)
  → Input titipan (item, qty, harga modal, margin, stok awal)
  → NOTA TITIPAN: preview + cetak + kirim WA ke no pemilik
  → Submit batch (status DRAFT)
  → HITUNG JAJANAN SISA: input sisa fisik per item → sistem hitung
     terjual = stok tercatat − sisa; tampilkan estimasi hak pemilik
  → REVIEW MANAGER: laporan penjualan periode + bayar harga modal
     (buat payout) → Approve → payout PAID + stok/payout tercatat
```

### 2.4 Matriks RBAC

| Aksi | STAFF | MANAGER |
|---|---|---|
| Lihat inventory | ✅ | ✅ |
| Input stok-masuk (draft) | ✅ | ✅ |
| Review + ubah modal + Approve/Reject batch | ❌ | ✅ |
| Nota titipan + kirim WA | ✅ | ✅ |
| Hitung jajanan sisa (input) | ✅ | ✅ |
| Setujui selisih sisa | ❌ | ✅ |
| Stocktake | ❌ (403) | ✅ |
| CRUD master barang (nama/SKU/harga jual) | ❌ | ✅ |
| Payout bayar | ❌ (lihat) | ✅ |

---

## 3. Perubahan data (migrasi v6, manual — tanpa db push)

```sql
-- stock_batches: tambah alur persetujuan
ALTER TABLE `stock_batches`
  ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED' AFTER `kind`,
  ADD COLUMN `reviewedById` VARCHAR(36) DEFAULT NULL AFTER `createdById`,
  ADD COLUMN `reviewedAt` DATETIME DEFAULT NULL AFTER `reviewedById`,
  ADD COLUMN `reviewNote` TEXT DEFAULT NULL AFTER `reviewedAt`,
  ADD INDEX `stock_batches_status_idx` (`unitId`, `status`);

-- stock_batch_items: harga final hasil review manager
ALTER TABLE `stock_batch_items`
  ADD COLUMN `finalUnitCost` DECIMAL(15,2) DEFAULT NULL AFTER `unitCost`;

-- consignment_owners: tandai WA terverifikasi (phone tetap kolomnya)
ALTER TABLE `consignment_owners`
  ADD COLUMN `whatsappVerified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `phone`;
```

Aturan:
- Batch baru dari wizard → `status = DRAFT`, **stok belum berubah**.
- Approve manager → terapkan efek stok dalam SATU transaksi
  (logika apply dipindah dari POST ke fungsi `applyBatch()` yang dipakai
  saat approve; `finalUnitCost` default = `unitCost` bila tak diubah).
- Batch lama (existing) → `status = APPROVED` (default) — riwayat aman.
- Validasi WA: format Indonesia (`08…` 10–14 digit atau `628…`);
  checkbox "WA aktif & terhubung" wajib dicentang saat buat/pilih UMKM
  di jalur titipan (`whatsappVerified = true`).

---

## 4. API baru / ubah (additive)

| Endpoint | Fungsi |
|---|---|
| `POST /api/retail/batches` (ubah) | Terima `asDraft: true` → simpan DRAFT tanpa ubah stok/konsinyasi |
| `GET /api/retail/batches?status=` | Filter DRAFT/APPROVED/REJECTED + ringkasan |
| `PATCH /api/retail/batches/[id]` (baru) | Manager: ubah `finalUnitCost` per baris + `approve`/`reject`; approve = apply atomik |
| `GET /api/retail/batches/[id]` (baru) | Detail batch + baris + histori review (nota) |
| `POST /api/retail/consignments/owners` (ubah) | Wajib `phone` format WA bila `whatsappVerified: true` |
| `POST /api/retail/sisa` (baru, tahap akhir) | Hitung sisa titipan: input sisa fisik → terjual, estimasi hak; selisih butuh approve manager |

Nota titipan: client-side (template cetak + link `wa.me/<noHp>?text=…`,
konversi `08…` → `628…`), tanpa backend baru — sama pola struk POS.

---

## 5. Rencana build bertahap

| Tahap | Isi | Status |
|---|---|---|
| 1 | Spec ini | ← sekarang |
| 2 | Migrasi v6 + model Prisma (`status`, `finalUnitCost`, `whatsappVerified`) | berikut |
| 3 | API: draft batch + review/approve + validasi WA | berikut |
| 4 | Halaman `stok-masuk` wizard (Pondok + Titipan + nota) | berikut |
| 5 | Halaman `stok-masuk/review` (Manager) | berikut |
| 6 | Inventory view-only Staff + CRUD Manager + shortcut Stok Masuk | berikut |
| 7 | Hitung jajanan sisa + integrasi payout | berikut |
| 8 | Verifikasi penuh + push | tiap tahap |

Kriteria tiap tahap: `tsc` 0 error, `npm test` 67/67 hijau,
`next build` sukses, file/marker beku utuh.

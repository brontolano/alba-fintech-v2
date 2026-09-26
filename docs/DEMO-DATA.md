# Demo Data — Dataset Modul Operasional

> Endpoint: `POST /api/data` dengan payload `{"action":"demo"}` — hanya role `SUPERADMIN`.
> Akses UI: **Pengaturan > Manajemen Data > Demo Data**.

Dokumen ini menjelaskan isi dataset edukasi yang dibuat oleh aksi **Demo Data**,
termasuk modul operasional: transaksi, POS, shift kerja, penyerahan kas,
konsinyasi, stock batch & stok opname, anggaran KPAK, dan permintaan pembelian.

## Ringkasan

Demo Data **mengganti seluruh data operasional** dengan dataset edukasi yang
konsisten dan relatif terhadap hari ini (transaksi ada yang ber-tanggal
**kemarin** dan **hari ini**). Semua data diberi penanda `[DEMO]` pada deskripsi,
referensi, atau catatan agar mudah dibedakan dari data asli. Akun `SUPERADMIN`
**dipertahankan** dan hanya di-relink ke lembaga demo.

Password demo (`DEMO_PASSWORD`) dikembalikan oleh API **hanya sekali** pada
respons operasi. Ganti kredensial demo sebelum dipakai di lingkungan
non-development.

## Apa yang Diganti & Dipertahankan

Aksi demo memanggil `clearAllData(tx, true)` yang menghapus tabel operasional
berikut (urutan aman relasi FK), lalu membuat ulang dataset:

`savingsTransaction`, `savingsAccount`, `student`, `notification`,
`broadcastRecipient`, `approval`, `purchaseRequestItem`, `purchaseItem`,
`stockBatchItem`, `consignmentItem`, `consignmentPayout`, `consignmentOwner`,
`stockCount`, `stockBatch`, `purchaseRequest`, `budgetAllocation`,
`cashHandover`, `shiftReport`, `shiftAttendance`, `shiftSession`, `posSession`,
`orderItem`, `transaction`, `financialNote`, `broadcastMessage`,
`inventoryItem`, `bankAccount`, `audit_logs`, `push_subscriptions`,
`systemSetting`, `unitSetting`, `financialCategory`.

- User non-SUPERADMIN dihapus; user `SUPERADMIN` dipertahankan dan di-relink.
- Unit, lembaga lama, dan settings dihapus dan dibuat ulang.

## Akun Demo

Semua akun demo memakai satu password bersama (`Bismillah123!` pada HEAD).

| Email                           | Nama                          | Role         | Unit           |
| ------------------------------- | ----------------------------- | ------------ | -------------- |
| `pimpinan.demo@alba.local`      | Ust. Ahmad (Pimpinan)         | `PIMPINAN`   | — (lembaga)    |
| `manager.kpak.demo@alba.local`  | Ali (Manager KPAK)            | `MANAGER`    | KPAK           |
| `manager.kantinbaru.demo@alba.local` | Manager Kantin Baru       | `MANAGER`    | Kantin Baru    |
| `manager.kantinumi.demo@alba.local`  | Manager Kantin Umi        | `MANAGER`    | Kantin Umi     |
| `manager.koperasi.demo@alba.local`   | Manager Koperasi Buku     | `MANAGER`    | Koperasi Buku  |
| `staff.kpak.demo@alba.local`    | Staff KPAK                    | `STAFF`      | KPAK           |
| `staff.kantinbaru.demo@alba.local`   | Staff Kantin Baru         | `STAFF`      | Kantin Baru    |
| `staff.kantinumi.demo@alba.local`    | Staff Kantin Umi          | `STAFF`      | Kantin Umi     |
| `staff.koperasi.demo@alba.local`     | Staff Koperasi Buku       | `STAFF`      | Koperasi Buku  |

## Dataset per Modul

### Lembaga & Unit

Satu lembaga **Pondok Pesantren Al-Basyariyah** dengan 4 unit:
KPAK (`KPK-01`), Kantin Baru (`KNT-02`), Kantin Umi (`KNT-01`), dan
Koperasi Buku (`KOP-01`). `unitSetting` dibuat per unit dengan
`posEnabled`/`inventoryEnabled` aktif untuk unit retail.

### Rekening Kas

| Code             | Unit        | Nama Kas             | Balance   |
| ---------------- | ----------- | -------------------- | --------- |
| `DEMO-KPK-KAS`   | KPAK        | Kas KPAK             | 50.000.000|
| `DEMO-KNT02-KAS` | Kantin Baru | Kas Kantin Baru      | 3.200.000 |
| `DEMO-KNT01-KAS` | Kantin Umi  | Kas Kantin Umi       | 2.500.000 |
| `DEMO-KOP-KAS`   | Koperasi    | Kas Koperasi Buku    | 8.500.000 |

### Kategori & Transaksi Harian

- Kategori keuangan standar (pemasukan/pengeluaran lembaga & unit).
- Transaksi per unit dengan status `APPROVED` dan `PENDING` (mis. setoran kas
  KPAK 12.000.000 APPROVED, pembayaran listrik 2.500.000 PENDING, dan beberapa
  transaksi retail). Setiap transaksi `PENDING` mendapat `approval` dengan
  approver = manager unit bersangkutan (dibuat oleh STAFF) atau pimpinan.

### POS Retail — 4 Sesi (1 Closed, 3 Open)

Semua transaksi POS terikat `posSessionId` dan berisi `orderItem`.

| Unit | Ref transaksi       | Tanggal | Sesi        | Total        | Rincian item |
| ---- | ------------------- | ------- | ----------- | ------------ | ------------ |
| KNT-02 | `DEMO-POS-KNT02-01` | kemarin | **closed**  | 380.000      | Nasi Uduk 15×12.000 + Es Campur 20×10.000 |
| KNT-02 | `DEMO-POS-KNT02-02` | hari ini| open        | 150.000      | Nasi Uduk 10×12.000 + Es Campur 3×10.000  |
| KNT-01 | `DEMO-POS-KNT01-01` | hari ini| open        | 190.000      | Nasi Goreng 10×15.000 + Es Teh 5×8.000    |
| KOP-01 | `DEMO-POS-KOP01-01` | hari ini| open        | 160.000      | Buku Tulis 20×5.000 + Pensil 2B 20×3.000  |

Sesi closed kemarin (KNT-02): `openingCash` 300.000, `expectedCash` =
`countedCash` = 680.000, `discrepancy` 0, dengan catatan penutupan kasir.

### Cash Handover

Dibuat 3 record `PENDING` untuk hari ini, satu per unit retail, dengan
`variance` 0 (total transaksi approved sesi ≡ kas diserahkan):

| Unit        | totalIncome | cashHanded |
| ----------- | ----------- | ---------- |
| Kantin Baru | 150.000     | 150.000    |
| Kantin Umi  | 190.000     | 190.000    |
| Koperasi    | 160.000     | 160.000    |

### Shift Kerja (Kantin Baru)

Untuk Staff Kantin Baru, tanggal hari ini:

- `shiftSession`: check-in 06:30, check-out 14:30.
- `shiftAttendance`: hadir, `late: false`, catatan `[DEMO]`.
- `shiftReport`: status `SUBMITTED`, `cashIncomeCounted` 150.000,
  `cashExpenseCounted` 0 (selaras transaksi POS KNT-02 hari ini).

### Konsinyasi (Barang Titipan UMKM)

- **Owner Toko Barokah** (`KNT-02`), kontak 0813-xxxx-3344, aktif.
- **Item titipan**: Es Campur (inventory `DEMO-EC-KNT02`), `marginType`
  `PERCENT` 20%, `costPrice` 6.000, `agreedPrice` 10.000.
- **Payout** 350.000 status `PENDING` (periode 7–1 hari lalu).

### Stock Batch & Stok Opname

- **Batch `BT-DEMO-001`** (KNT-02, tanggal kemarin): kind `CAMPURAN`, status
  `APPROVED`, `sourceType` `PEMBELIAN`, `sourceRef` `PR-DEMO-001`. Total
  qty 90, total cost 640.000, dibuat manager, direview pimpinan.
  - Nasi Uduk: 50 × 8.000 = 400.000
  - Es Campur (konsinyasi): 40 × 6.000 = 240.000, terikat `ownerId` +
    `marginType`/`marginValue` item konsinyasi.
- **`stockCount`** (tanggal hari ini, status `DRAFT`): stok opname konsinyasi —
  Nasi Uduk 45 & Es Campur 30, `totalSold` 12, `totalHak` 120.000.

### Anggaran KPAK

- Kategori baru **Operasional Kantor KPAK** (`EXP-OPR-KPAK`, EXPENSE, unit KPAK).
- **`budgetAllocation`** `MONTHLY` untuk bulan berjalan (start tanggal 1 s/d
  akhir bulan): KPAK 5.000.000, `source` `KPAK`, dibuat Manager KPAK.

### Permintaan Pembelian

- **`PR-DEMO-001`** (KNT-02): "Belanja Bahan Baku Mingguan Kantin Baru",
  status `REQUESTED`, `estimatedTotal` 450.000, supplier "Pasar Al-Basyariyah".
  - Nasi Uduk: 50 × 8.000 (item inventory terhubung)
  - Saus Sambal (Baru): 10 × 5.000 (`isNewItem`)

### Tabungan Santri & Inventori

- Inventori retail 6 SKU dengan stok, `minStock`, harga jual, dan harga beli:
  `DEMO-NU-KNT02` Nasi Uduk, `DEMO-EC-KNT02` Es Campur, `DEMO-NG-KNT01`
  Nasi Goreng, `DEMO-ET-KNT01` Es Teh Manis, `DEMO-BT-KOP01` Buku Tulis,
  `DEMO-P2B-KOP01` Pensil 2B.
- Tabungan santri (untuk kiosk): beberapa `student` + `savingsAccount` dengan
  riwayat `savingsTransaction` setoran/penarikan bereferensi `DEMO-SETORAN`
  / `DEMO-PENARIKAN` dan saldo akhir konsisten.

### Lainnya

- `financialNote` lembaga: donasi operasional santri 1.500.000 (INCOME,
  reconciled) dan kegiatan sosial 2.500.000 (EXPENSE) beberapa hari lalu.
- `notification` informasi demo untuk Pimpinan dan `systemSetting` default.

## Konsistensi & Relasi

- Transaksi POS terikat `posSessionId`; `orderItem` terikat `transactionId` dan
  `inventoryItemId`.
- `cashHandover.totalIncome` ≡ total transaksi APPROVED sesi hari itu
  (`variance` 0).
- Transaksi `PENDING` selalu memiliki `approval` aktif dengan approver yang
  sesuai role workflow.
- `stockBatchItem` barang konsinyasi memakai `ownerId` + margin yang sama
  dengan `consignmentItem`.
- `budgetAllocation` terikat kategori unit KPAK, periode bulan berjalan.

## Implementasi & File Terkait

| Aspek        | Lokasi                                             |
| ------------ | -------------------------------------------------- |
| Seed & reset | `lib/data-management.ts` — `seedDemoData`, `clearAllData`, `DATA_MODELS`, `importDatabase` |
| Endpoint     | `app/api/data/route.ts` (POST `{"action":"demo"}`) |
| Model        | `prisma/schema.prisma` — `PosSession`, `OrderItem`, `ShiftSession`, `ShiftAttendance`, `ShiftReport`, `CashHandover`, `ConsignmentOwner`, `ConsignmentItem`, `ConsignmentPayout`, `StockBatch`, `StockBatchItem`, `StockCount`, `PurchaseRequest`, `PurchaseRequestItem`, `BudgetAllocation`, `FinancialNote` |

## Verifikasi

```bash
npm test          # 132 tes, wajib hijau
npx tsc --noEmit  # 0 error
npm run build     # sukses
```

Perubahan pada seed demo wajib menjaga konsistensi nominal transaksi↔cash
handover↔laporan shift agar dataset tetap realistis untuk demo dan pelatihan.
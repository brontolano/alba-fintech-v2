# Spesifikasi Inventaris Berbasis Batch + POS 4-Langkah — Unit Type Retail

Status: **Rancangan bertahap — implementasi per tahap setelah review.**
Scope: unit retail (Koperasi Buku, Kantin Umi, Kantin Baru; template reusable
untuk unit retail baru), role STAFF & MANAGER. Fokus UI: STAFF.
Bagian Computer Vision / AI = **catatan dulu** (hook arsitektur saja).

Alur uang yang disepakati pemilik:
pembelian stok **diajukan ke pimpinan** (Approval existing) → barang datang
dicatat per **batch kedatangan** → `total modal masuk = SUM(qty × harga_beli)`
dibukukan sebagai penambahan modal berjalan unit.

---

## 1. Skema basis data relational

### 1.1 Tabel baru

```sql
stock_batches
  id            VARCHAR(36) PK
  unitId        VARCHAR(36) NOT NULL → units(id)
  batchNo       VARCHAR(50) NOT NULL            -- cth: B-KOP-20260924-001
  date          DATETIME NOT NULL               -- tanggal kedatangan (auto: hari ini WIB, bisa diubah)
  kind          VARCHAR(20) NOT NULL            -- PONDOK | TITIPAN | CAMPURAN
  totalQty      INT NOT NULL DEFAULT 0          -- SUM(qty) baris
  totalCost     DECIMAL(15,2) NOT NULL          -- SUM(qty × unitCost) = modal masuk batch
  sourceType    VARCHAR(20) NULL                -- PEMBELIAN | TITIPAN | LAIN
  sourceRef     VARCHAR(36) NULL                -- id approval/transaksi pembelian (opsional)
  note          TEXT NULL
  createdById   VARCHAR(36) NOT NULL → users(id)  -- staf pencatat (akuntabilitas)
  createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP
  UNIQUE (unitId, batchNo)
  INDEX (unitId, date)

stock_batch_items
  id              VARCHAR(36) PK
  batchId         VARCHAR(36) NOT NULL → stock_batches(id) ON DELETE CASCADE
  inventoryItemId VARCHAR(36) NOT NULL → inventory_items(id)
  qty             INT NOT NULL              -- qty datang (> 0)
  unitCost        DECIMAL(15,2) NOT NULL     -- harga beli/modal per biji saat datang
  lineTotal       DECIMAL(15,2) NOT NULL     -- qty × unitCost (snapshot)
  ownerId         VARCHAR(36) NULL → consignment_owners(id)  -- baris titipan
  marginType      VARCHAR(10) NULL          -- PERCENT | FIXED (snapshot titipan)
  marginValue     DECIMAL(12,2) NULL        -- snapshot titipan
  INDEX (batchId), INDEX (inventoryItemId)
```

Relasi ringkas (ERD tekstual):

```
units 1───* stock_batches 1───* stock_batch_items *───1 inventory_items
users 1───* stock_batches (createdById, relasi "batchCreator")
consignment_owners 1───* stock_batch_items (ownerId, nullable)
```

### 1.2 Aturan bisnis batch (server-side, atomik)

1. Satu request `POST /api/retail/batches` = **satu batch**, dijalankan dalam
   **satu transaksi Prisma**. Gagal di satu baris → seluruh batch rollback.
2. Per baris, dua mode:
   - **Pilih dari database**: `inventoryItemId` milik unit + `qty` + `unitCost`.
     Validasi: item aktif & milik unit; `qty ≥ 1`; `unitCost ≥ 0`.
   - **Barang baru**: `name` + `sku` (+ kategori/foto opsional) + `qty` +
     `unitCost`. SKU unik global (aturan beku) → konflik = 409 + pesan jelas.
3. Efek stok per baris: `currentStock += qty`; `purchasePrice = unitCost`
   (harga modal terakhir). Untuk baris titipan: buat/update
   `ConsignmentItem` (`ownerId`, margin, `agreedPrice` dihitung server)
   persis formula existing.
4. `lineTotal = qty × unitCost` (pembulatan 2 desimal); `totalCost = Σ
   lineTotal`; `totalQty = Σ qty`. `kind` dihitung: semua baris titipan →
   TITIPAN; tanpa baris titipan → PONDOK; campuran → CAMPURAN.
5. `batchNo` digenerate server: `B-{unitCode}-{YYYYMMDD}-{seq3}` dengan
   `seq` = jumlah batch unit hari itu + 1, dihitung **di dalam transaksi**
   (hindari duplikat).
6. Modal berjalan unit = Σ `totalCost` seluruh batch unit (query agregat,
   bukan kolom tersimpan — anti drift).

### 1.3 RBAC batch & stocktake

| Aksi | STAFF | MANAGER |
|---|---|---|
| Input batch kedatangan (`POST /api/retail/batches`) | ✅ | ✅ |
| Lihat batch & stok | ✅ | ✅ |
| Stocktake (`POST /api/retail/inventory?action=stocktake`) | ❌ 403 | ✅ |
| Stock-in manual | ✅ | ✅ |

UI: tombol/form Stocktake **hanya render untuk MANAGER**; server tetap
menolak STAFF (403) agar tak bisa diakali via API langsung.

---

## 2. State machine transaksi kasir (POS 4 langkah)

```
Step 1: KATALOG & SHIFT
┌────────────┐  check-in   ┌────────────┐  open-pos   ┌────────────┐
│ BELUM      ├────────────►│ SIAP       ├────────────►│ KASIR      │
│ CHECK-IN   │             │ (checked-  │  (modal)    │ TERBUKA    │
└────────────┘             │  in, POS   │             └─────┬──────┘
                           │  closed)   │                   │ scan/grid/
                           └────────────┘                   │ pilih produk
                                                            ▼
Step 2: CART & CHECKOUT                         ┌────────────────────┐
┌────────────┐  bayar tunai / kartu             │ KERANJANG          │
│ KASIR      ├─────────────────────────────────►│ + METODE BAYAR     │
│ TERBUKA    │                                  └─────────┬──────────┘
└────────────┘                                            │ bayar OK
                                                          ▼
Step 3: FULFILLMENT                             ┌────────────────────┐
                                                │ STRUK: cetak       │
                                                │ thermal / WA       │
                                                └─────────┬──────────┘
                                                          │ selesai
                                                          ▼
Step 4: CLOSING                                 ┌────────────────────┐
                                                │ PREVIEW + RESET    │
                                                │ → kembali Step 1   │
                                                │ (shift tetap aktif)│
                                                └────────────────────┘

Transisi paksa / edge:
- Tanpa check-in → redirect halaman Shift (R1, sudah live).
- Tanpa sesi POS terbuka → checkout ditolak 409 POS_BELUM_DIBUKA (R2, sudah live).
- Saldo kartu tak cukup / limit harian → 409 + pesan rupiah, cart UTUH (tidak di-clear).
- Stok berubah saat checkout → 409 STOK_BERUBAH, refresh katalog, cart utuh.
- Check-out saat POS open → 409 POS_MASIH_TERBUKA (R4, sudah live).
```

Hook Computer Vision / AI (catatan — placeholder arsitektur):
`useProductVision()` di Step 1 — interface `{ scanImage(file): Promise<{sku,qty}[]> }`
yang hari ini melempar `NOT_IMPLEMENTED`; kelak diisi Image Retrieval /
Object Recognition tanpa mengubah alur POS.

---

## 3. API contract utama

### 3.1 `POST /api/retail/batches` — catat kedatangan (STAFF/MANAGER)

```jsonc
// Request
{ "date": "2026-09-24",                       // opsional, default hari ini WIB
  "sourceType": "PEMBELIAN",                  // PEMBELIAN | TITIPAN | LAIN
  "sourceRef": "<approvalId|transactionId>",  // opsional
  "note": "Pengiriman supplier Senin",
  "lines": [
    { "inventoryItemId": "<id>", "qty": 20, "unitCost": 3500 },
    { "name": "Roti Baru", "sku": "ROTI-09", "category": "Makanan",
      "qty": 10, "unitCost": 4000, "minStock": 5 },
    { "name": "Kerupuk Titipan", "sku": "KRPK-01", "qty": 15,
      "unitPrice": 0, "unitCost": 5000,
      "ownerId": "<ownerId>", "marginType": "PERCENT", "marginValue": 30 }
  ] }
// unitPrice pada baris titipan-baru DIABAIKAN (harga jual = agreed server).
// Response 201
{ "data": { "id": "<batchId>", "batchNo": "B-KOP-20260924-001",
  "totalQty": 45, "totalCost": 185000, "kind": "CAMPURAN", "lines": 3 } }
// Error: 400 validasi | 404 item/pemilik bukan milik unit |
//        409 SKU duplikat | 403 stocktake bukan di sini
```

### 3.2 `GET /api/retail/batches?from=&to=&limit=` — riwayat batch unit

```jsonc
{ "data": [ { "id": "<batchId>", "batchNo": "…", "date": "…",
  "kind": "PONDOK", "totalQty": 30, "totalCost": 120000,
  "sourceType": "PEMBELIAN", "by": "Nama Staff", "lines": 2 } ],
  "summary": { "batchCount": 12, "modalMasuk": 1450000 } }
```

### 3.3 `GET /api/inventory` — perluasan summary (additive)

```jsonc
// Response.data[].* tetap; summary ditambah:
{ "summary": { "total": 120, "pages": 12,
  "pondokCount": 95, "titipanCount": 25,
  "modalValuation": 8750000 } }
// modalValuation = Σ(currentStock × purchasePrice) item aktif unit.
```

### 3.4 POS 4-langkah — endpoint yang dipakai ulang (sudah live)

| Step | Endpoint | Catatan |
|---|---|---|
| 1 | `GET /api/retail/dashboard` (shift.mine), `GET /api/inventory` (katalog) | + hook `useProductVision()` (placeholder) |
| 2 | `POST /api/transactions` (tunai, +`posSessionId`), `POST /api/smartpay` (kartu, +`posSessionId`) | validasi saldo & limit real-time |
| 3 | client-side: `window.print()` template ESC/POS 58/80mm + link `wa.me` | tanpa backend baru |
| 4 | — (state lokal) | preview + reset ke Step 1 |

---

## 4. Komponen UI utama (cuplikan pola)

### 4.1 Halaman Inventory — 4 KPI + search + filter + tab + grid

```
[Total Item 120] [Pondok 95] [Titipan 25] [Modal Rp 8.750.000]
[search........] [kategori ▾] [vendor ▾]
[Semua|Pondok|Titipan]
┌──────┐ ┌──────┐ ┌──────┐
│ foto │ │ foto │ │ foto │   card: foto | nama | harga | stok (+badge UMKM/menipis)
│ nama │ │ nama │ │ nama │
│harga │ │harga │ │harga │
│ stok │ │ stok │ │ stok │
└──────┘ └──────┘ └──────┘
```

State: `filter {q, category, ownerId, tab}` → satu `GET /api/inventory`
dengan debounce search 300ms; grid responsif 2→3→4 kolom.

### 4.2 Form Tambah (batch) — tab Pondok/Titipan, baris dinamis

- Header batch: tanggal auto (editable), sumber (PEMBELIAN/TITIPAN/LAIN),
  ref pengajuan (opsional, dropdown approval APPROVED), catatan.
- Tiap baris: mode `[Pilih dari database|Barang baru]`; bila pilih:
  dropdown item unit (search) + qty + harga beli; bila baru: field item
  lengkap (+owner & margin bila titipan).
- Footer live: `totalQty`, `totalCost = Σ qty×harga` (update tiap ketik),
  tombol Simpan Batch (disabled bila 0 baris valid).
- Edge: SKU duplikat → error per baris + sorot field; qty ≤ 0 ditolak
  client & server; submit ganda dicegah (`busy` flag).

### 4.3 POS wizard — `step: 1|2|3|4` + state mesin di satu komponen

```tsx
// Pola (bukan kode final):
const [step, setStep] = useState<1|2|3|4>(1);
const [cart, setCart] = useState<CartItem[]>([]);
const [payMethod, setPayMethod] = useState<"cash"|"smartcard">("cash");
const [receipt, setReceipt] = useState<ReceiptData|null>(null);
// Step 1: katalog + guard check-in/POS (banner bila belum).
// Step 2: cart + bayar → simpan receipt(txId, items, total, paid, change,
//   method, cardBalanceAfter?) → setStep(3).
// Step 3: tombol Cetak (window.print template struk) + WA (wa.me link) → setStep(4).
// Step 4: preview struk + [Kembali ke Kasir] → reset cart/receipt, setStep(1).
```

Edge cases wajib:
- **Saldo kartu tak cukup / limit harian** (409 dari `/api/smartpay`):
  toast pesan rupiah, **cart tidak di-clear**, tetap Step 2, sorot field UID.
- **UID tak dikenal / akun nonaktif**: sama — tetap Step 2 + pesan.
- **Stok berubah** (409): refresh katalog otomatis, tandai item bermasalah,
  cart utuh.
- **POS_BELUM_DIBUKA** (409): redirect halaman Shift, cart disimpan
  (state lokal, tidak hilang).
- **Kembalian negatif / bayar kurang** (tunai): blokir client-side sebelum fetch.

---

## 5. Rencana implementasi bertahap

| Tahap | Isi | Status |
|---|---|---|
| 1 | Spec ini + migrasi v5 + model Prisma | ← sekarang |
| 2 | API batches + summary inventory + gate stocktake MANAGER | berikut |
| 3 | Inventory page baru (KPI + grid) | berikut |
| 4 | Form Tambah batch (tab Pondok/Titipan) | berikut |
| 5 | POS wizard 4-langkah (marker freeze dipertahankan) | berikut |
| 6 | Verifikasi penuh + push | tiap tahap |

Kriteria terima tiap tahap: `tsc` 0 error, `npm test` 67/67 hijau,
`next build` sukses, file/marker beku utuh.

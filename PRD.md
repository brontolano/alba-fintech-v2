# PRD.md — ALBA Finance v4

> **Product Requirements Document**
>
> **Nama Produk:** ALBA Finance
> **Versi:** 4.0
> **Tanggal Pembuatan:** 2025-01-20
> **Berdasarkan Analisis:** `C:\AI\alba-fintech-v3` (Next.js 16.3, Prisma 14 models, MySQL, NextAuth.js)
> **Status Dokumen:** Final

---

## 1. Ringkasan Eksekutif (Executive Summary)

ALBA Finance adalah sistem manajemen keuangan berbasis web untuk unit-unit organisasi dengan struktur multi-unit (Unit Kerja / Unit Retail / KPAK). Sistem mendukung transaksi keuangan, poin-of-sale (POS), inventori, persetujuan transaksi, rekonsiliasi, laporan, notifikasi, dan pengelolaan pengguna.

Proyek v4 bertujuan memperbaiki semua bug, gap keamanan, dan kekurangan fitur yang teridentifikasi pada v3, sekaligus menyusun fondasi yang stabil untuk pengembangan bertahap.

---

## 2. Latar Belakang (Background)

Pondok Pesantren Al-Basyariyah (pondok pesantren di Cipatat, Kabupaten Bandung) mengelola keuangan melalui sistem yang tersebar dan tidak terintegrasi. Sistem keuangan sederhana dibutuhkan untuk:

1. **Mencatat pemasukan dan pengeluaran** per unit.
2. **Mendukung transaksi harian** ( kasir/POS untuk barang retail).
3. **Mengontrol alur persetujuan** transaksi besar.
4. **Menghasilkan laporan** untuk pimpinan (PIMPINAN).
5. **Mengelola stok barang** untuk unit retail.
6. **Mendukung auditor dan rekonsiliasi** harian.

v3 telah berjalan tetapi memiliki **20+ bug dan gap fitur** yang perlu diperbaiki. v4 adalah proyek restrukturisasi dan perbaikan berdasarkan temuan tersebut.

---

## 3. Tujuan dan Sasaran (Objectives)

| # | Tujuan | SASARAN |
| --- | -------- | --------- |
| 1 | Memperbaiki semua bug API yang mengganggu operasional | 0 bug blocker pada release v4.0 |
| 2 | Mengisi gap RBAC dan middleware | Semua endpoint memiliki otorisasi berbasis role+unit+lembaga |
| 3 | Melengkapi API endpoint yang hilang | Semua resource memiliki endpoint CRUD lengkap |
| 4 | Memperbaiki UI/UX | Session role tersedia di client, logout berfungsi, form valid |
| 5 | Meningkatkan performa query | Eliminasi N+1 query |
| 6 | Audit trail lengkap | Semua operasi sensitif tercatat di `AuditLog` |
| 7 | Deployment yang dapat diandalkan | Deploy script stabil, environment siap produksi |

---

## 4. Cakupan (Scope)

### 4.1 Fitur yang Termasuk (In Scope)

- **Master Data:** Lembaga, Unit, Pengguna, Kategori Keuangan, Akun Bank
- **Transaksi:** CRUD transaksi, upload bukti, multipart/form-data support
- **POS (Point of Sale):** Penjualan barang retail, integrasi stok, integrasi akun bank
- **Inventori:** CRUD barang, update stok otomatis pada penjualan, stok minimum
- **Persetujuan:** Alur persetujuan transaksi, otorisasi berbasis unit
- **Catatan Keuangan:** Catatan cepat pimpinan, rekonsiliasi
- **Laporan:** Dashboard agregat, laporan bulanan, distribusi unit
- **Notifikasi:** Web push, notifikasi dalam aplikasi
- **Pengguna & Autentikasi:** Login, profil, ganti password, upload foto, reset pengguna
- **Pengaturan:** Sistem, tema, keamanan (2FA, session timeout), notifikasi
- **Audit Log:** Pencatatan semua operasi sensi

### 4.2 Fitur yang Tidak Termasuk (Out of Scope)

- Mobile app (React Native / PWA) — fokus web dulu
- Multi-language — fokus Bahasa Indonesia dulu
- Integrasi akun eksternal (bank API, payment gateway)
- Export laporan ke Excel/PDF — hanya export JSON di v4.0

---

## 5. Peran Pengguna (User Roles & RBAC)

Sistem menggunakan **4 peran utama** yang didefinisikan di Prisma schema:

| Role | Kode | Deskripsi | Akses |
| ------ | ------ | ----------- | ------- |
| **Super Admin** | `SUPERADMIN` | Administrator paling atas — mengelola seluruh lembaga | Akses penuh semua data |
| **Pimpinan** | `PIMPINAN` | Pimpinan lembaga — melihat seluruh unit di lembaganya | Read semua unit di lembaganya, approve semua |
| **Manager** | `MANAGER` | Manager unit — mengelola transaksi & staf unitnya | Akses terbatas ke unitnya saja |
| **Staff** | `STAFF` | Staf operasional — input transaksi harian | Create transaksi, input POS |

### 5.1 Matrix RBAC Rencana (v4)

Setiap endpoint harus memvalidasi:

1. **Otentikasi** — pengguna terautentikasi
2. **Role** — peran pengguna diizinkan untuk operasi ini
3. **Unit/Lembaga Scope** — data yang diakses berada dalam lingkup unit/lembaga pengguna

| Fitur | SUPERADMIN | PIMPINAN | MANAGER | STAFF |
| ------- | :----------: | :--------: | :-------: | :-----: |
| Kelola Lembaga | CRUD | - | - | - |
| Kelola Unit | CRUD | Read all | Read unit sendiri | - |
| Kelola Pengguna | CRUD | - | Create unit sendiri | - |
| Transaksi (semua unit) | CRUD | Read all lembaga | Read unit sendiri | Create unit sendiri |
| Persetujuan Transaksi | - | Approve all lembaga | Approve unit sendiri | Submit |
| Inventori | CRUD | Read all lembaga | CRUD unit sendiri | Read/unit input |
| POS | - | - | - | Can sell |
| Catatan Keuangan | CRUD | Read all lembaga | CRUD unit sendiri | - |
| Laporan | Full | Lembaga-wide | Unit only | - |
| Pengaturan | Full | - | - | - |
| Rekonsiliasi | Full | Lembaga-wide | Unit sendiri | - |
| Audit Log | Read all | - | Unit sendiri | - |

---

## 6. Spesifikasi Fitur (Feature Specifications)

### 6.1 Transaksi (Transactions)

#### Deskripsi

Transaksi mencatat semua aliran keuangan: pemasukan, pengeluaran, dan transfer antar-akun.

#### Status Transaksi

- `DRAFT` — Belum disubmit
- `PENDING` — Menunggu persetujuan (untuk MANAGER yang perlu approval)
- `APPROVED` — Disetujui
- `REJECTED` — Ditolak

#### Field Schema

| Field | Tipe | Required | Deskripsi |
| ------- | ------ | ---------- | ----------- |
| id | String (UUID) | Auto | Primary key |
| type | Enum | Ya | INCOME, EXPENSE, TRANSFER |
| amount | Decimal | Ya | Jumlah |
| description | String | Ya | Deskripsi transaksi |
| date | DateTime | Ya | Tanggal transaksi |
| status | Enum | Auto | DRAFT/PENDING/APPROVED/REJECTED |
| unitId | String (UUID) | Ya | Unit pemilik |
| categoryId | String (UUID) | Ya | Kategori |
| accountId | String (UUID) | Opsional | Akun bank |
| reference | String | Opsional | No. referensi |
| photoUrl | String | Opsional | URL bukti transfer/foto |
| orderItems | JSON | Opsional | Item order (untuk POS) |
| createdById | String (UUID) | Auto | Pembuat |
| approvedById | String (UUID) | Opsional | Yang menyetujui |
| approvedAt | DateTime | Opsional | Waktu approve |

#### Bug v3 yang Perlu Diperbaiki

| Bug # | Deskripsi | Solusi |
| ------- | ----------- | -------- |
| TX-01 | POST multipart/form-data konflik — memanggil `request.json()` lalu `formData()`, `orderItems` tidak tersedia dari `formData` | Gunakan `FormData` secara konsisten; parse `orderItems` dari JSON string di FormData |
| TX-02 | Error P2002 (duplicate) mengembalikan pesan "Email sudah terdaftar" — pesan salah | Kembalikan pesan yang sesuai dengan field yang duplikat |
| TX-03 | GET tidak memfilter berdasarkan unit untuk STAFF | Tambahkan filter unitId untuk role STAFF |
| TX-04 | TRANSFER tidak memerlukan `accountId` | Validasi `accountId` wajib untuk type TRANSFER |

#### Endpoint API

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/transactions` | ✓ Implement | Dengan role-unit filter |
| POST | `/api/transactions` | ✓ Fix v4 | Multipart/form-data konsisten |
| GET | `/api/transactions/[id]` | ⚠️ Missing | Perlu dibuat |
| PATCH | `/api/transactions/[id]` | ⚠️ Missing | Perlu dibuat |
| DELETE | `/api/transactions/[id]` | ⚠️ Missing | Perlu dibuat |

---

### 6.2 Point of Sale (POS)

#### Deskripsi

Sistem kasir sederhana untuk unit retail yang menerjual barang.

#### Fitur

- Scan/barang item dengan autocomplete
- Chart belanja (keranjang belanja)
- Perhitungan pajak otomatis (10%)
- Checkout ke sistem transaksi (INCOME)
- Integrasi stok inventori (kurangi stok on checkout)

#### Bug v3 yang Perlu Diperbaiki

| Bug # | Deskripsi | Solusi |
| ------- | ----------- | -------- |
| POS-01 | Category filter selalu `true` — filter tidak berfungsi | Perbaiki logika filter |
| POS-02 | Tidak mengirim `unitId`, `accountId`, `categoryId` | Tambahkan field wajib pada checkout |
| POS-03 | Tidak mengurangi stok inventari pada penjualan | Trigger update stok setelah transaksi berhasil |

---

### 6.3 Inventori (Inventory)

#### Deskripsi

Manajemen stok barang untuk unit retail.

#### Schema Item

| Field | Tipe | Required | Deskripsi |
| ------- | ------ | ---------- | ----------- |
| id | String (UUID) | Auto | |
| name | String | Ya | Nama barang |
| sku | String | Opsional | Kode unik |
| category | String | Opsional | Kategori barang |
| unitPrice | Decimal | Ya | Harga beli |
| sellPrice | Decimal | Ya | Harga jual |
| currentStock | Int | Auto | Stok saat ini |
| minStock | Int | Ya | Stok minimum |
| unitId | String (UUID) | Ya | Unit pemilik |

#### Bug v3 yang Perlu Diperbaiki

| Bug # | Deskripsi | Solusi |
| ------- | ----------- | -------- |
| INV-01 | Tidak ada endpoint DELETE | Tambahkan endpoint |
| INV-02 | Tidak ada PATCH untuk update stok | Tambahkan endpoint stock adjustment |
| INV-03 | Tombol hapus hanya menampilkan `toast.info` | Implementasikan endpoint DELETE |
| INV-04 | POS tidak mengurangi stok otomatis | Tambahkan integrasi stock decrement |

#### Endpoint API

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/inventory` | ✓ Implement | |
| POST | `/api/inventory` | ✓ Implement | |
| GET | `/api/inventory/[id]` | ⚠️ Missing | |
| PATCH | `/api/inventory/[id]` | ⚠️ Missing | Termasuk stock adjustment |
| DELETE | `/api/inventory/[id]` | ⚠️ Missing | |

---

### 6.4 Persetujuan Transaksi (Approvals)

#### Deskripsi

Alur persetujuan untuk transaksi yang memerlukan persetujuan (misal: pengeluaran > jumlah tertentu).

#### Flow

```
Staff → create Transaction (PENDING) → Approval created
MANAGER → review Approval → approve/reject
```

#### Bug v3 yang Perlu Diperbaiki

| Bug # | Deskripsi | Solusi |
| ------- | ----------- | -------- |
| APP-01 | PIMPINAN/MANAGER dapat menyetujui transaksi unit lain | Validasi bahwa transaksi `unitId` berada dalam lingkup user |
| APP-02 | GET hanya filter PENDING — tidak ada tab Approved/Rejected | Tambahkan filter status query param |
| APP-03 | PIMPINAN dapat approve semua — perlu validasi lembaga | Validasi lembaga juga |

#### Endpoint API

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/approvals` | ✓ Implement | Tambahkan filter status param |
| POST | `/api/approvals` | ✓ Implement | |
| PATCH | `/api/approvals/[id]` | ✓ Fix v4 | Tambahkan unit+lembaga authority check |
| DELETE | `/api/approvals/[id]` | ✓ Implement | Hanya SUPERADMIN/PIMPINAN |

---

### 6.5 Catatan Keuangan (Financial Notes)

#### Deskrippsi

Catatan cepat pemasukan/pengeluaran untuk pimpinan — tidak memerlukan approval.

#### Bug v3 yang Perlu Diperbaiki

| Bug # | Deskripsi | Solusi |
|-------|-----------|--------|
| FNB-01 | Response tidak mengembalikan `unit` field ketika null | Selalu sertakan unit field |
| FNB-02 | Tidak ada PATCH/DELETE pada main route (hanya `[id]`) | Tutup — `[id]` sudah ada |

#### Endpoint API

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/financial-notes` | ✓ Implement | |
| POST | `/api/financial-notes` | ✓ Implement | |
| GET | `/api/financial-notes/[id]` | ✓ Implement | |
| PATCH | `/api/financial-notes/[id]` | ✓ Implement | |
| DELETE | `/api/financial-notes/[id]` | ✓ Implement | |

---

### 6.6 Laporan & Dashboard (Reports & Dashboard)

#### Deskripsi

Dashboard agregat dan laporan grafik untuk PIMPINAN dan MANAGER.

#### Endpoints

| Method | Path | Status | Catatan |
|--------|------|--------|---------|
| GET | `/api/dashboard/aggregates` | ✓ Implement | |
| GET | `/api/reports/aggregations` | ✓ Implement | |

#### Bug v3 yang Perlu Diperbaiki

| Bug # | Deskripsi | Solusi |
| ------- | ----------- | -------- |
| DASH-01 | TRANSFER menghitung dua kali pada total transaksi | Hitung TRANSFER hanya sekali |
| DASH-02 | Balance tidak memperhitungkan transfer antar-akun | Akomodasi `accountId` |
| DASH-03 | Total selisih (variance) selalu 0 | Hitung cash on hand manual input |
| REP-01 | Role STAFF/MANAGER tidak dapat filter unitId di query params | Validasi unitId milik user |
| REP-02 | `monthlyData` untuk TRANSFER tidak dihitung di `typeDistribution` dengan benar | Perbaiki akumulasi |

---

### 6.7 Akun Bank (Bank Accounts)

#### Deskripsi

Manajemen akun bank untuk unit, termasuk transfer antar-akun.

#### Schema

| Field | Tipe | Required | Deskripsi |
| ------- | ------ | ---------- | ----------- |
| id | String (UUID) | Auto | |
| name | String | Ya | Nama akun |
| accountNumber | String | Ya | No. rekening |
| bankName | String | Opsional | Nama bank |
| balance | Decimal | Auto | Saldo akhir |
| unitId | String (UUID) | Ya | Unit pemilik |
| type | Enum | Ya | CASH, BANK |

#### Endpoint API

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/bank-accounts` | ⚠️ Missing | Perlu dibuat |
| POST | `/api/bank-accounts` | ⚠️ Missing | Perlu dibuat |
| PATCH | `/api/bank-accounts/[id]` | ⚠️ Missing | Perlu dibuat |
| DELETE | `/api/bank-accounts/[id]` | ⚠️ Missing | Perlu dibuat |

---

### 6.8 Notifikasi (Notifications)

#### Deskripsi

Notifikasi web push dan notifikasi dalam aplikasi.

#### Bug v3 yang Perlu Diperbaiki

| Bug # | Deskripsi | Solusi |
|-------|-----------|--------|
| NOT-01 | Tidak ada endpoint POST untuk mengirim notifikasi | Tambahkan endpoint |
| NOT-02 | PushSubscription tidak digunakan untuk push notifications | Integrasikan dengan endpoint push |

#### Endpoint API

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/notifications` | ✓ Implement | |
| PATCH | `/api/notifications/[id]` | ✓ Implement | Mark read |
| POST | `/api/notifications` | ⚠️ Missing | Kirim notifikasi |
| DELETE | `/api/notifications/[id]` | ⚠️ Missing | Hapus notifikasi |

---

### 6.9 Broadcast Messages

#### Deskripsi

Pesan terbroadcast ke pengguna/unit tertentu (misal: pengumuman sistem).

#### Endpoint API

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/broadcast-messages` | ⚠️ Missing | Cek apakah ada |
| POST | `/api/broadcast-messages` | ⚠️ Missing | |
| PATCH | `/api/broadcast-messages/[id]` | ⚠️ Missing | |
| DELETE | `/api/broadcast-messages/[id]` | ⚠️ Missing | |

---

### 6.10 Pengguna (Users)

#### Bug v3 yang Perlu Diperbaiki

| Bug # | Deskripsi | Solusi |
| ------- | ----------- | -------- |
| USR-01 | N+1 query pattern — fetch unit dan lembaga per user | Gunakan `include` di Prisma |
| USR-02 | Halaman users logout ke `/login` bukan `signOut` | Ganti ke `signOut()` dari NextAuth |
| USR-03 | Sidebar logout juga ke `/login` — tidak clear session | Ganti ke `signOut()` |
| USR-04 | Profile image upload endpoint `/api/users/profile/upload` referenced di UI tapi tidak ada | Buat endpoint ini |

#### Endpoint API

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/users` | ✓ Implement | Fix N+1 |
| POST | `/api/users` | ✓ Implement | SUPERADMIN only |
| GET | `/api/users/profile` | ✓ Implement | |
| PATCH | `/api/users/profile` | ✓ Implement | |
| POST | `/api/users/change-password` | ✓ Implement | |
| POST | `/api/users/profile/upload` | ⚠️ Missing | Diperlukan UI |
| POST | `/api/reset-users` | ✓ Implement | SUPERADMIN only |

---

### 6.11 Unit & Lembaga

#### Bug v3 yang Perlu Diperbaiki

| Bug # | Deskripsi | Solusi |
|-------|-----------|--------|
| UNI-01 | Tidak ada PATCH/DELETE untuk unit | Tambahkan endpoint |
| UNI-02 | Tidak ada PATCH/DELETE untuk lembaga | Tambahkan endpoint |

#### Endpoint API — Unit

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/units` | ✓ Implement | |
| POST | `/api/units` | ✓ Implement | SUPERADMIN |
| PATCH | `/api/units/[id]` | ⚠️ Missing | |
| DELETE | `/api/units/[id]` | ⚠️ Missing | |

#### Endpoint API — Lembaga

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/lembaga` | ✓ Implement | |
| POST | `/api/lembaga` | ✓ Implement | SUPERADMIN |
| PATCH | `/api/lembaga/[id]` | ⚠️ Missing | |
| DELETE | `/api/lembaga/[id]` | ⚠️ Missing | |

---

### 6.12 Kategori Keuangan (Financial Categories)

#### Endpoint API

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/financial-categories` | ✓ Implement | |
| POST | `/api/financial-categories` | ✓ Implement | SUPERADMIN |
| PATCH | `/api/financial-categories/[id]` | ⚠️ Missing | |
| DELETE | `/api/financial-categories/[id]` | ⚠️ Missing | |

---

### 6.13 Pengaturan (Settings)

#### Endpoint API

| Method | Path | Status | Catatan |
| -------- | ------ | -------- | --------- |
| GET | `/api/settings` | ✓ Implement | SUPERADMIN, PIMPINAN |
| POST | `/api/settings` | ✓ Implement | SUPERADMIN only |
| PATCH | `/api/settings` | ✓ Implement | Batch update |

#### Bug v3

| Bug # | Deskripsi | Solusi |
|-------|-----------|--------|
| SET-01 | `handleImport` hanya simulasi — tidak upload file sebenarnya | Implementasi import JSON |
| SET-02 | `handleExport` hanya export settings — seharusnya semua data | Luasakan scope export |

---

### 6.14 Middleware / Proxy (proxy.ts)

#### Bug v3 yang Perlu Diperbaiki

| Bug # | Deskripsi | Solusi |
|-------|-----------|--------|
| MID-01 | PIMPINAN dapat akses semua transaksi via `unit.lembagaId` — tapi tidak ada pembatasan unit-level | Periksa middleware — hanya lindungi halaman, bukan data |
| MID-02 | Session role tidak tersedia di client components — hardcoded "Pengguna" di dashboard | Gunakan `useSession` di client, atau server-side render role |

---

### 6.15 Audit Log

#### Deskripsi

Audit trail untuk semua operasi sensitif.

#### Schema

| Field | Tipe | Deskripsi |
| ------- | ------ | ----------- |
| id | String (UUID) | |
| userId | String (UUID) | Yang melakukan aksi |
| action | String | CREATE, READ, UPDATE, DELETE, APPROVE, REJECT |
| entity | String | Transaction, User, Approval, dll |
| entityId | String | ID entitas |
| oldData | JSON | Data sebelum perubahan |
| newData | JSON | Data setelah perubahan |
| createdAt | DateTime | Auto |

#### Bug v3

| Bug # | Deskripsi | Solusi |
|-------|-----------|--------|
| AUD-01 | Tidak semua operasi sensitif mencatat audit log | Pastikan semua endpoint PATCH/DELETE mencatat |

---

## 7. Persyaratan Teknis (Technical Requirements)

### 7.1 Tech Stack

| Layer | Teknologi | Versi | Catatan |
| ------- | ----------- | ------- | --------- |
| Runtime | Node.js | 20+ | |
| Framework | Next.js | 16.x | App Router |
| Language | TypeScript | 5.x | Strict mode |
| Database | MySQL | 8.0 | |
| ORM | Prisma | 5.22 | |
| Auth | NextAuth.js | 4.24 | CredentialsProvider |
| Password | bcryptjs | 6.x | |
| Styling | Tailwind CSS | 3.4 | |
| Icons | lucide-react | | |
| Form | React Hook Form + Zod | | |
| UI | Shadcn/ui | | |

### 7.2 Environment Variables

```env
# Database
DATABASE_URL=mysql://user:pass@host:3306/db

# NextAuth
NEXTAUTH_URL=https://alba.fintech.id
NEXTAUTH_SECRET=<32+ char random string>

# Optional
NEXT_PUBLIC_APP_NAME=ALBA Finance v4
```

### 7.3 Prisma Schema Review

#### Model yang Ada (14 models)

| Model | Deskripsi | Catatan |
| ------- | ----------- | --------- |
| Lembaga | Organisasi induk | |
| Unit | Sub-unit di bawah lembaga | |
| User | Pengguna dengan role | role: SUPERADMIN/PIMPINAN/MANAGER/STAFF |
| FinancialCategory | Kategori transaksi | type: INCOME/EXPENSE/TRANSFER |
| BankAccount | Akun bank per unit | |
| Transaction | Transaksi utama | status enum |
| Approval | Persetujuan transaksi | |
| FinancialNote | Catatan cepat | |
| InventoryItem | Barang inventori | |
| OrderItem | Item dalam order/POS | |
| Notification | Notifikasi | |
| PushSubscription | Subscription untuk web push | |
| BroadcastMessage | Pesan broadcast | |
| AuditLog | Audit trail | |
| SystemSetting | Pengaturan sistem | |
| UnitSetting | Pengaturan unit | |

#### Enums

```prisma
enum Role {
  SUPERADMIN
  PIMPINAN
  MANAGER
  STAFF
}

enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER
}

enum TransactionStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
}
```

#### Improvement yang Perlu Ditambahkan (v4 Schema)

| Model | Field Baru | Alasan |
| ------- | ----------- | -------- |
| Transaction | `accountId` | Untuk transfer antar-akun |
| Transaction | `photoUrl` | Untuk upload bukti transfer |
| Transaction | `orderItems` (JSON) | Untuk POS |
| Unit | `type` | RETAIL/KPAK/OFFICE |
| Unit | `isRetail` | Untuk filter POS |

---

## 8. Bug Tracker Kompilasi (Compiled Bug List)

Berikut adalah **daftar lengkap bug** dari v3 yang harus diperbaiki di v4, dikelompokkan per kategori.

### 8.1 API Endpoint Issues

| ID | Bug | Endpoint | Prioritas | Solusi |
| ---- | ----- | ---------- | ----------- | -------- |
| BUG-001 | POST multipart/form-data konflik `request.json()` dan `formData()` | `/api/transactions` POST | **BLOCKER** | Gunakan `FormData` secara konsisten; parse field seperti `orderItems`, `amount` dari string JSON di FormData |
| BUG-002 | Error P2002 mengembalikan "Email sudah terdaftar" — salah | `/api/transactions` POST | **HIGH** | Map error ke field yang benar |
| BUG-003 | Tidak ada unit-level authority check di approve/reject | `/api/approvals/[id]` PATCH | **HIGH** | Validasi transaksi `unitId` sesuai session user |
| BUG-004 | GET hanya filter PENDING | `/api/approvals` GET | MEDIUM | Tambahkan query param `status` filter |
| BUG-005 | Response `unit` field null tidak dikembalikan | `/api/financial-notes` GET | LOW | Gunakan `include` + serializer yang konsisten |
| BUG-006 | N+1 query pattern — fetch unit/lembaga per user | `/api/users` GET | HIGH | Gunakan `include` di Prisma `findMany` |
| BUG-007 | Tidak ada endpoint DELETE/PATCH | `/api/inventory` | MEDIUM | Buat endpoint lengkap |
| BUG-008 | Tidak ada endpoint POST untuk kirim notifikasi | `/api/notifications` POST | MEDIUM | Buat endpoint |
| BUG-009 | Tidak ada PATCH/DELETE untuk unit | `/api/units` PATCH/DELETE | MEDIUM | Buat endpoint |
| BUG-010 | Tidak ada PATCH/DELETE untuk lembaga | `/api/lembaga` PATCH/DELETE | MEDIUM | Buat endpoint |
| BUG-011 | Tidak ada PATCH/DELETE untuk kategori | `/api/financial-categories` | LOW | Buat endpoint |
| BUG-012 | Tidak ada CRUD untuk broadcast messages | `/api/broadcast-messages` | LOW | Buat endpoint lengkap |
| BUG-013 | Profile image upload endpoint hilang di UI | `/api/users/profile/upload` | MEDIUM | Buat endpoint |
| BUG-014 | Import settings hanya simulasi | `/api/settings` | LOW | Implementasi file upload + parse JSON |

### 8.2 Frontend / UI Bugs

| ID | Bug | File/Tempat | Prioritas | Solusi |
| ---- | ----- | ------------- | ----------- | -------- |
| BUG-015 | Role di-dashboard di-hardcoded "Pengguna" | `app/dashboard/page.tsx` | HIGH | Gunakan `useSession()` untuk ambil role |
| BUG-016 | Logout navigate ke `/login` — tidak clear session | `components/layout/Sidebar.tsx` | HIGH | Ganti ke `signOut()` |
| BUG-017 | Halaman users logout ke `/login` | `app/dashboard/users/page.tsx` | HIGH | Ganti ke `signOut()` |
| BUG-018 | POS category filter selalu `true` | `app/dashboard/pos/page.tsx` | LOW | Perbaiki logika filter |
| BUG-019 | POS checkout tidak kirim `unitId`, `accountId`, `categoryId` | `app/dashboard/pos/page.tsx` | **BLOCKER** | Tambahkan field wajib |
| BUG-020 | Inventory delete hanya show `toast.info` | `app/dashboard/inventory/page.tsx` | MEDIUM | Implementasi hapus via API |
| BUG-021 | Approval tanpa authority check — MANAGER bisa approve semua unit | `app/dashboard/approvals/page.tsx` | HIGH | Handle di backend (lihat BUG-003) |
| BUG-022 | Client-side search — tidak ada server-side search di transactions | `app/dashboard/transactions/page.tsx` | LOW | Tambahkan server-side search param |

### 8.3 Laporan & Dashboard Bugs

| ID | Bug | Prioritas | Solusi |
| ---- | ----- | ----------- | -------- |
| BUG-023 | TRANSFER menghitung dua kali pada total transaksi | HIGH | Hitung TRANSFER sekali saja |
| BUG-024 | Balance tidak akomodir transfer antar-akun | MEDIUM | Gunakan `accountId` |
| BUG-025 | `variance` selalu 0 | LOW | Hitung dari input manual cash on hand |
| BUG-026 | Reports tidak filter unit-level untuk STAFF | HIGH | Tambahkan validasi unitId |

### 8.4 Middleware / Auth Bugs

| ID | Bug | Prioritas | Solusi |
|----|-----|-----------|--------|
| BUG-027 | PIMPINAN dapat akses semua transaksi via middleware — tidak ada pembatasan unit | MEDIUM | Pastikan middleware hanya protek halaman; otorisasi data di API |
| BUG-028 | Session role tidak tersedia di client components | HIGH | Gunakan `useSession` di client components |

---

## 9. Roadmap Implementasi (Implementation Roadmap)

### Sprint 1: Foundation & Security (v4.0.0-alpha)

| Task | Priority | Estimasi | Status |
| ------ | ---------- | ---------- | -------- |
| Fix Transaction POST multipart/form-data parsing (BUG-001) | BLOCKER | 4h | TODO |
| Fix P2002 error message (BUG-002) | HIGH | 1h | TODO |
| Fix Approval authority check (BUG-003, BUG-021) | HIGH | 4h | TODO |
| Fix Logout session clearing (BUG-016, BUG-017) | HIGH | 1h | TODO |
| Fix Dashboard role display (BUG-015) | HIGH | 1h | TODO |
| Fix N+1 query in users GET (BUG-006) | HIGH | 2h | TODO |
| Add unit/lembaga scope validation in middleware | MEDIUM | 3h | TODO |
| Create profile image upload endpoint (BUG-013) | MEDIUM | 3h | TODO |

### Sprint 2: API Completion & RBAC (v4.0.0-beta)

| Task | Priority | Estimasi | Status |
| ------ | ---------- | ---------- | -------- |
| Add DELETE/PATCH for inventory (BUG-007) | MEDIUM | 4h | TODO |
| Add POST for notifications (BUG-008) | MEDIUM | 3h | TODO |
| Add PATCH/DELETE for units (BUG-009) | MEDIUM | 2h | TODO |
| Add PATCH/DELETE for lembaga (BUG-010) | MEDIUM | 2h | TODO |
| Add PATCH/DELETE for financial categories | LOW | 2h | TODO |
| Add broadcast messages CRUD | LOW | 4h | TODO |
| Add BankAccount CRUD endpoints | MEDIUM | 4h | TODO |
| Add transaction `[id]` CRUD endpoints | HIGH | 4h | TODO |
| Implement AuditLog on all PATCH/DELETE | MEDIUM | 8h | TODO |
| Add unit filter to reports aggregations (BUG-026) | HIGH | 2h | TODO |

### Sprint 3: Feature Fixes & Enhancements (v4.0.0-rc)

| Task | Priority | Estimasi | Status |
| ------ | ---------- | ---------- | -------- |
| Fix POS checkout fields (BUG-019) | BLOCKER | 3h | TODO |
| Fix POS stock decrement after sale | HIGH | 3h | TODO |
| Fix POS category filter logic (BUG-018) | LOW | 1h | TODO |
| Fix Dashboard TRANSFER double count (BUG-023) | HIGH | 2h | TODO |
| Fix Dashboard balance transfer accounting (BUG-024) | MEDIUM | 3h | TODO |
| Fix Inventory delete via API (BUG-020) | MEDIUM | 2h | TODO |
| Fix Approval status filter (BUG-004) | MEDIUM | 1h | TODO |
| Fix Financial notes unit field (BUG-005) | LOW | 1h | TODO |
| Implement settings import/export | LOW | 4h | TODO |

### Sprint 4: Testing & Release (v4.0.0)

| Task | Priority | Estimasi | Status |
| ------ | ---------- | ---------- | -------- |
| QA: Full RBAC matrix test | HIGH | 8h | TODO |
| QA: Transaction flow E2E | HIGH | 4h | TODO |
| QA: POS + Inventory sync | HIGH | 4h | TODO |
| QA: Approval flow per unit | HIGH | 4h | TODO |
| QA: Dashboard + Report accuracy | HIGH | 4h | TODO |
| Documentation update | MEDIUM | 4h | TODO |
| Deployment validation on Hostinger | HIGH | 2h | TODO |

---

## 10. Deployment (Deployment)

### 10.1 Environment

- **Platform:** Hostinger VPS / Shared Hosting (standalone Node.js)
- **Build Command:** `npm run build`
- **Start Command:** `node server.js` (renamed from `.next/server.js`)
- **Environment:** `.env.production` (jangan commit ke Git)

### 10.2 Deploy Script (deploy-prepare.mjs)

Script harus menyalin:

1. `.next/` — standalone build
2. `public/` — static assets
3. `server.js` → `next-server.js`
4. `package.json`
5. `prisma/` — schema + engine binaries
6. `node_modules/` — semua runtime deps (termasuk devDependencies Prisma)

### 10.3 Bug Deployment

| Bug # | Deskripsi | Solusi |
|-------|-----------|--------|
| DEPLOY-01 | Deploy script menyalin subset node_modules — bisa kehilangan runtime deps | Pastikan `npm install --production` + Prisma engine binaries termasuk |

### 10.4 Environment Variables Wajib

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)

---

## 11. Pengujian (Testing)

### 11.1 RBAC Matrix Test Cases

| Test Case | Role | Aksi | Unit/Lembaga | Expected | Status |
| ----------- | ------ | ------ | ------------- | ---------- | -------- |
| RBAC-01 | STAFF | Create transaction | Own unit | 201 Created | TODO |
| RBAC-02 | STAFF | View other unit tx | Different unit | 403 Forbidden | TODO |
| RBAC-03 | MANAGER | Approve own unit tx | Own unit | 200 OK | TODO |
| RBAC-04 | MANAGER | Approve other unit tx | Different unit | 403 Forbidden | TODO |
| RBAC-05 | PIMPINAN | View all lembaga tx | Own lembaga | 200 OK | TODO |
| RBAC-06 | PIMPINAN | View other lembaga tx | Different lembaga | 403 Forbidden | TODO |
| RBAC-07 | SUPERADMIN | Full access | All | 200 OK | TODO |

### 11.2 Transaction Flow Test

| Test Case | Deskripsi | Status |
| ----------- | ----------- | -------- |
| TX-FLOW-01 | Staff create INCOME transaction | TODO |
| TX-FLOW-02 | Staff create EXPENSE with photo upload (multipart) | TODO |
| TX-FLOW-03 | Staff create POS sale → stock decrement | TODO |
| TX-FLOW-04 | MANAGER approve transaction | TODO |
| TX-FLOW-05 | MANAGER reject transaction | TODO |
| TX-FLOW-06 | STAFF delete draft transaction | TODO |

---

## 12. Glossary

| Istilah | Definisi |
| --------- | ---------- |
| **Lembaga** | Organisasi induk (mis: Pondok Pesantren Al-Basyariyah) |
| **Unit** | Sub-unit di bawah lembaga (mis: KPAK, Unit Retail) |
| **MANAGER** | Role yang mengelola satu unit |
| **PIMPINAN** | Role pimpinan lembaga — akses semua unit di lembaganya |
| **STAFF** | Role staf operasional — input transaksi harian |
| **SUPERADMIN** | Role administrator paling atas |
| **RBAC** | Role-Based Access Control |
| **POS** | Point of Sale — sistem kasir |
| **Multipart/Form-Data** | Content-Type untuk upload file + field |

---

## 13. Lampiran: Pratinjau Struktur Folder v4

```
alba-fintech-v4/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── options.ts
│   │   ├── transactions/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── approvals/
│   │   ├── inventory/
│   │   ├── financial-notes/
│   │   ├── bank-accounts/
│   │   ├── notifications/
│   │   ├── broadcast-messages/
│   │   ├── financial-categories/
│   │   ├── users/
│   │   │   ├── route.ts
│   │   │   ├── profile/
│   │   │   │   └── route.ts
│   │   │   ├── change-password/
│   │   │   └── profile-upload/
│   │   ├── units/
│   │   ├── lembaga/
│   │   ├── settings/
│   │   ├── dashboard/
│   │   └── reports/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── transactions/
│   │   ├── pos/
│   │   ├── inventory/
│   │   ├── approvals/
│   │   ├── financial-notes/
│   │   ├── reports/
│   │   ├── account/
│   │   ├── units/
│   │   ├── lembara/
│   │   ├── settings/
│   │   └── users/
│   └── layout.tsx
├── prisma/
│   └── schema.prisma
├── components/
│   └── layout/
├── lib/
│   └── prisma.ts
├── scripts/
│   ├── seed.ts
│   └── deploy-prepare.mjs
├── docs/
│   ├── DOKUMENTASI-TEKNIS.md
│   ├── DEPLOY.md
│   └── AUDIT-DEPLOY-HOSTINGER.md
├── .env.production.example
├── .env.development
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── PRD.md  ← (ini file)
```

---

## 14. Risiko (Risks)

| Risk | Impact | Mitigation |
| ------ | -------- | ------------ |
| Deploy script kehilangan Prisma engine binaries | Production crash | Test di staging; copy engine secara eksplisit |
| RBAC gap masih ada setelah v4 | Data leak antar-unit | Audit kode + penetration test |
| POS stock sync race condition | Stock tidak akurat | Gunakan Prisma transaction |
| Multipart parsing bug persisten | POS tidak berhasil | Unit test dengan supertest |
| Session role tidak konsisten | User lihat data salah | Gunakan server-side session di semua page |

---

*Dokumen ini adalah panduan utama proyek ALBA Finance v4. Semua keputusan teknis, prioritas bug fix, dan roadmap implementasi didasarkan pada analisis kode v3.*

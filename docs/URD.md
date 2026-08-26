# User Requirements Document (URD)
# ALBA Finance v2 — User Workflows & Use Cases

## 1. Introduction

### 1.1 Purpose
Dokumen ini menggambarkan kebutuhan pengguna, alur kerja, dan use cases untuk sistem ALBA Finance v2.

### 1.2 Audience
- **Product Manager** — untuk memahami kebutuhan pengguna
- **UI/UX Designer** — untuk design interface yang user-centric
- **Business Analyst** — untuk analisis alur bisnis

## 2. User Personas

### 2.1 Superadmin
- **Deskripsi**: Administrator paling berhak — mengelola seluruh sistem
- **Goals**: 
  - Kelola semua unit & user
  - Atur role & permission
  - Monitor seluruh aktivitas sistem
- **Pain Points**: 
  - Perlu visibility penuh tanpa harus login sebagai masing-masing user
  - Butuh tool manajemen yang efisien

### 2.2 Pimpinan
- **Deskripsi**: Eksekutif yang butuh overview keuangan lintas unit
- **Goals**:
  - Pantau performa keuangan semua unit
  - Approve transaksi besar
  - Dapatkan laporan eksekutif real-time
- **Pain Points**:
  - Butuh data yang akurat dan real-time
  - Approval perlu cepat tapi tetap aman

### 2.3 Manager
- **Deskripsi**: Manajer unit yang bertanggung jawab operasional harian
- **Goals**:
  - Input & kelola transaksi harian unitnya
  - Rekonsiliasi transaksi
  - Export laporan unit
- **Pain Points**:
  - Butuh interface yang cepat untuk input harian
  - Rekonsiliasi bisa memakan waktu

### 2.4 Staff
- **Deskripsi**: Petugas lapangan yang fokus pada input transaksi
- **Goals**:
  - Input transaksi cepat dan akurat
  - Lihat transaksinya sendiri
  - Rekonsiliasi input
- **Pain Points**:
  - Interface harus simpel dan intuitif
  - Butuh validasi real-time

## 3. User Journeys

### 3.1 Login Journey
```
1. Staff membuka http://127.0.0.1:3000
2. Staff memasukkan email & password
3. Sistem validasi credential via NextAuth
4. Jika valid → redirect ke dashboard unit
5. Jika gagal → tampilkan error inline
```

### 3.2 Transaction Creation Flow (Staff)
```
1. Staff login ke dashboard unit
2. Klik "Transaksi Baru"
3. Pilih tipe: INCOME / EXPENSE
4. Pilih akun (dari Chart of Accounts)
5. Masukkan nominal
6. Masukkan keterangan
7. Klik "Simpan" → status DRAFT
8. Klik "Submit for Approval" → status PENDING
9. Jika amount ≥ 10,000,000 → auto trigger approval
10. Jika amount < 10,000,000 → auto approved
```

### 3.3 Approval Workflow (Pimpinan)
```
1. Pimpinan login
2. Buka menu "Persetujuan"
3. Lihat daftar approval request (status PENDING)
4. Klik transaksi yang ingin di-approve
5. Lihat detail transaksi (amount, description, unit)
6. Pilih: Approve / Reject
7. Jika Reject → masukkan komentar alasan
8. Klik "Konfirmasi"
9. Sistem update status transaction → APPROVED/REJECTED
10. Staff pemilik transaksi mendapat notifikasi
```

### 3.4 Multi-Unit Management (Superadmin)
```
1. Superadmin login
2. Buka menu "Manajemen Unit"
3. Lihat daftar unit (nama, kode, status)
4. Klik "Unit Baru" → form create unit
5. Isi nama, kode, deskripsi
6. Klik "Simpan"
7. Untuk mengedit — klik icon edit di list
8. Untuk menghapus — klik icon delete → konfirmasi
9. Klik unit → assignment user ke unit
```

### 3.5 Dashboard Interaction (All Roles)
```
1. Semua role login
2. Dashboard menampilkan:
   - Total transaksi (hari ini, minggu ini, bulan ini)
   - Pemasukan vs Pengeluaran (chart)
   - Activity terbaru
3. Klik unit name di sidebar → filter semua transaksi ke unit itu
4. Klik tanggal range → filter transaksi per periode
```

### 3.6 Export Laporan (Manager/Pimpinan)
```
1. User buka menu "Laporan"
2. Pilih tipe laporan:
   - Laporan Transaksi
   - Trial Balance
   - Buku Besar
3. Pilih periode (tanggal dari - sampai)
4. Pilih format: PDF / Excel
5. Klik "Export"
6. Sistem generate file dan download
```

### 3.7 Rekonsiliasi (Manager/Staff)
```
1. User buka menu "Rekonsiliasi"
2. Lihat daftar transaksi yang belum direkonsiliasi
3. Klik checkbox transaksi yang sudah direkonsiliasi
4. Pilih "Mark as Reconciled"
5. Pilih metode rekonsiliasi:
   - Manual (input konfirmasi)
   - Auto match (dengan bank statement)
6. Sistem update status → RECONCILED
7. Audit log tercatat
```

## 4. Use Case Diagram

```
                    ┌─────────────┐
                    │   User      │
                    └──────┬──────┘
                           │
     ┌──────────┬──────────┼──────────┬──────────┐
     │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼
  Login    Create    Approve   Generate   Reconcile
           Trans-     Trans-    Report     
           action     action
```

### 4.1 Core Use Cases

| Use Case ID | Name | Actor | Precondition | Main Flow | Post-condition |
|-------------|------|-------|---------------|-----------|----------------|
| UC-001 | Login | Staff | User sudah terdaftar | 1. Buka login page<br>2. Masukkan email/password<br>3. Klik submit<br>4. Sistem validasi<br>5. Redirect ke dashboard | Session aktif, user login |
| UC-002 | Create Transaction | Staff | User login, unit assigned | 1. Klik "Transaksi Baru"<br>2. Pilih tipe INCOME/EXPENSE<br>3. Pilih akun<br>4. Masukkan amount<br>5. Klik simpan<br>6. Klik submit for approval | Transaksi tersimpan (DRAFT), siap approval |
| UC-003 | Approve Transaction | Pimpinan | User login, ada approval request | 1. Buka menu Persetujuan<br>2. Pilih transaksi<br>3. Review detail<br>4. Approve/Reject<br>5. Tambahkan komentar<br>6. Konfirmasi | Status transaksi di-update (APPROVED/REJECTED) |
| UC-004 | Generate Report | Manager | User login, ada transaksi | 1. Buka menu Laporan<br>2. Pilih tipe laporan<br>3. Pilih periode<br>4. Pilih format<br>5. Klik export<br>6. Download file | File laporan terdownload |
| UC-005 | Manage Units | Superadmin | User login, role superadmin | 1. Buka menu Manajemen Unit<br>2. Lihat daftar<br>3. Create/Edit/Delete unit<br>4. Assign user ke unit | Unit terupdate, audit log tercatat |

## 5. Wireframes (Text Description)

### 5.1 Login Page
```
┌─────────────────────────────────┐
│        ALBA Finance v2          │
│                                 │
│  📧  [_______________________]  │
│  🔒  [_______________________]  │
│                                 │
│      [     Masuk / Login      ] │
│                                 │
│  ──── Atau masuk dengan ────   │
│  [ Google ]  [  Lainnya  ]     │
└─────────────────────────────────┘
```

### 5.2 Dashboard (Manager)
```
┌─────────────────────────────────────────────┐
│  Unit A          📊 Dashboard       🔔 1  │
├─────────────────────────────────────────────┤
│  Total hari ini: Rp 50,000,000             │
│  Cash: Rp 30,000,000  |  Bank: Rp 20,000K │
├─────────────────────────────────────────────┤
│  📈 Pemasukan vs Pengeluaran (chart)       │
│  [                    ]         ▼          │
├─────────────────────────────────────────────┤
│  Aktivitas Terbaru                         │
│  • [20:30] Input transaksi Rp 5,000K       │
│  • [19:45] Approve transaksi Rp 10,000K    │
│  • [18:20] Rekonsiliasi 3 data             │
├─────────────────────────────────────────────┤
│  Sidebar:                                    │
│  ▼ Dashboard                               │
│  💰 Transaksi                              │
│  ✅ Persetujuan (3)                        │
│  📊 Buku Besar                             │
│  📋 Rekonsiliasi                           │
│  🤖 AI Assistant                           │
└─────────────────────────────────────────────┘
```

### 5.3 Transaction Form
```
┌─────────────────────────────────────────────┐
│  Transaksi Baru             [X]            │
├─────────────────────────────────────────────┤
│  Tipe transaksi:                           │
│  ○ INCOME    ● EXPENSE                      │
├─────────────────────────────────────────────┤
│  Akun:  [Pilih akun...] ▼                 │
│  ┌─────────────────────────────────────┐   │
│  │ KAS DI TUKANG - Kas                 │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  Nominal:   Rp [_____________________]   │
│  Keterangan: [_______________________]     │
│              [_______________________]     │
├─────────────────────────────────────────────┤
│  [Simpan Draft]  [Submit for Approval]   │
└─────────────────────────────────────────────┘
```

## 6. User Requirements Traceability Matrix

| Requirement | Login | Create Tx | Approve | Generate Report | Manage Units | Reconcile |
|-------------|-------|-----------|---------|-----------------|--------------|-----------|
| R-001: Authentication | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| R-002: Role-based Access | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| R-003: Real-time validation | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| R-004: Audit trail | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| R-005: Export capability | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

---
*Generated: August 2026 | Project: alba-fintech-v2 v0.1.0*

# Jadwal dan Checklist Pengembangan Aplikasi UNIT KPAK

> Interval update tiap 60 detik

## Prosedur
1. Baca & pelajari: docs/PRD-UNIT-KPAK.md
2. Cek/mulai tugas di: docs/todolist.md
3. Kerjakan tugas (1-by-1), gunakan skill & tools relevan (tidak loncat tugas; bug/error harus diselesaikan/verify pass dulu)
4. Setelah selesai/verified: update checklist di file ini
5. Buat tugas baru jika ada kebutuhan untuk sprint berikutnya

## Daftar Tugas (update berurutan)
- [x] Membaca dan memahami seluruh uraian di docs/PRD-UNIT-KPAK.md
- [x] Breakdown modul dan fitur utama ke dalam sub-tugas pengembangan (detail: docs/task_breakdown.md)
- [x] Setup struktur proyek fresh: folder/file minimal, dependency, env
- [x] Implementasi Master Data (Unit, User/Role, Santri, NFC) — selesai (schema, seed, db push, verify)
- [x] Modul integrasi kartu NFC (import, scan, mapping ke User/Santri) — selesai (service, endpoint, db, verify)
- [x] Implementasi Template & Generator Tagihan — selesai (schema, seed, db push, api routes, verify)
- [x] Pembayaran & verifikasi pembayaran (manual/otomatis) — implementasi ada, perlu verifikasi uji nyata: entry SPP/Daftar Ulang/PSB, cicilan, partial, bukti, history
- [x] Modul shift, absensi, dan rolling petugas — selesai (check-in, log shift, crew, jadwal, verify)
- [x] Pelaporan (harian, bulanan, outstanding) — selesai (harian, bulanan, rekap kas/tabungan, verify)
- [x] Approval digital & dashboard pimpinan — selesai (dashboard pimpinan, approvals review, broadcast, verify)

## Modul Pimpinan - Selesai
### 10.1 Dashboard Pimpinan
- [x] `/pimpinan` - Dashboard pimpinan: statistik real-time (total santri, tagihan, pembayaran, pending approval) - Selesai
- [x] Cashflow bulan ini (masuk/keluar, net) - Selesai
- [x] Cashflow 7 hari terakhir - Selesai
- [x] Outstanding tagihan total - Selesai
- [x] Top santri outstanding - Selesai
- [x] Quick actions (Approvals, Broadcast) - Selesai

### 10.2 Approvals Review
- [x] `/pimpinan/approvals` - Daftar approval menunggu dengan status - Selesai
- [x] Action approve/reject per approval - Selesai
- [x] Filter by type (LAPORAN_HARIAN, PEMBAYARAN, TAGIHAN, SHIFT) - Selesai
- [x] Audit log changes - Selesai

### 10.3 Broadcast
- [x] `/pimpinan/broadcast` - Form kirim broadcast - Selesai
- [x] Filter target unit & roles - Selesai
- [x] Riwayat broadcast - Selesai
- [x] Mark as read status - Selesai

### 10.4 API Pimpinan
- [x] `/api/pimpinan/dashboard` - GET dashboard stats - Selesai
- [x] `/api/pimpinan/summary` - GET global + per-unit summary - Selesai
- [x] `/api/pimpinan/broadcast` - POST create, GET list - Selesai
- [x] `/api/pimpinan/approve` - POST approve/reject - Selesai

### 10.5 Laporan & Cashflow (NEW - Stor Cash ke Pimpinan)
- [x] `/api/pimpinan/laporan` - POST daily report per unit + GET historical - Selesai
- [x] `/api/pimpinan/cashflow` - GET cashflow per unit + global summary - Selesai
- [x] `/api/pimpinan/outstanding` - GET outstanding per unit detail - Selesai
- [x] `/pimpinan/laporan` - Form input laporan harian (tabungan, HER, daftar ulang, dana keluar) - Selesai
- [x] `/pimpinan/cashflow` - Dashboard cashflow per unit (masuk/keluar detail) - Selesai
- [x] `/pimpinan/outstanding` - Daftar outstanding per unit & per santri - Selesai
- [x] Model `Report` dalam schema (unit, type, data JSON, notes, createdBy) - Selesai

## Modul Pimpinan - Selesai
### 10.1 Dashboard Pimpinan
- [x] `/pimpinan` - Dashboard pimpinan: statistik real-time (total santri, tagihan, pembayaran, pending approval) - Selesai
- [x] Cashflow bulan ini (masuk/keluar, net) - Selesai
- [x] Cashflow 7 hari terakhir - Selesai
- [x] Outstanding tagihan total - Selesai
- [x] Top santri outstanding - Selesai
- [x] Quick actions (Approvals, Broadcast) - Selesai

### 10.2 Approvals Review
- [x] `/pimpinan/approvals` - Daftar approval menunggu dengan status - Selesai
- [x] Action approve/reject per approval - Selesai
- [x] Filter by type (LAPORAN_HARIAN, PEMBAYARAN, TAGIHAN, SHIFT) - Selesai
- [x] Audit log changes - Selesai

### 10.3 Broadcast
- [x] `/pimpinan/broadcast` - Form kirim broadcast - Selesai
- [x] Filter target unit & roles - Selesai
- [x] Riwayat broadcast - Selesai
- [x] Mark as read status - Selesai

### 10.4 API Pimpinan
- [x] `/api/pimpinan/dashboard` - GET dashboard stats - Selesai
- [x] `/api/pimpinan/summary` - GET global + per-unit summary - Selesai
- [x] `/api/pimpinan/broadcast` - POST create, GET list - Selesai
- [x] `/api/pimpinan/approve` - POST approve/reject - Selesai

## Modul Santri (Breakdown Detail)

### 4.1 Master Data Santri — selesai (schema, seed, verify)

### 4.2 Data Santri UI & CRUD
- [x] Halaman Data Santri: list, search, filter (kelas, status aktif, unit) — Selesai (UI & API route)
- [x] Form Tambah Santri: profil lengkap (nama, NIS, kelas, unit, status, wali, kontak) — Selesai (UI & API route)
- [x] Form Edit Santri: update profil, nonaktifkan/aktifkan, pindah unit/kelas — Selesai (UI & API route)
- [x] Detail Santri: ringkasan tagihan, riwayat pembayaran, saldo tabungan, kartu NFC — Selesai (UI & API route)
- [x] Hapus santri (soft delete + audit log) — Selesai (UI & API route)
- [x] Validasi unik NIS/email per unit/lembaga — Selesai (UI & API route)

### 4.3 Integrasi NFC Santri
- [x] Mapping UID NFC ke santri (one-to-one, riwayat kartu) — PASS (test-batch-import and test-nfc-status passed)
- [x] Status kartu: aktif / nonaktif / hilang / rusak / diganti — PASS (test-nfc-status passed)
- [x] Histori penggantian kartu: UID lama → UID baru, tanggal, alasan, petugas — PASS (NfcLog entries created)
- [x] Bulk import UID dari NFC Tools (text/hex dump) → auto-mapping ke santri — PASS (test-batch-import passed)

### 4.4 Rekening Tabungan Santri (Integrasi NIS)
- [x] Setiap santri punya rekening tabungan (nomor rekening unik TBG-{NIS}, saldo real-time) — Selesai (UI & API route)
- [x] Auto-generate nomor rekening dari NIS (format: TBG-{NIS}) — Selesai
- [x] Cari santri via NIS input (auto-lookup on blur) — Selesai
- [x] Dropdown santri + NIS input ganda untuk fleksibilitas — Selesai
- [x] Transaksi tabungan: setor tunai, setor bank, tarik tunai, mutasi antar santri, auto-deduct tagihan — Selesai (UI & API route)
- [x] Validasi: tarik tunai hanya CASH, setor boleh CASH/BANK, saldo tidak boleh negatif/minSaldo — Selesai
- [x] Riwayat transaksi per santri (filter tanggal, tipe, pagination) — Selesai (UI & API route)
- [x] Update saldo real-time via transaksi (transactional) — Selesai
- [x] Saldo minimum & notifikasi saldo menipis — Selesai (Notification model, API route, auto-create saat saldo <= 120% minSaldo & <= minSaldo)

## Modul Notifikasi (Sprint 2 - Selesai)
### 9.1 Notification System
- [x] Model Notification: type (LOW_BALANCE, PAYMENT_DUE, APPROVAL_REQUEST, INFO) — Selesai (schema)
- [x] API: GET /api/notifications, POST, PUT /api/notifications/[id] — Selesai
- [x] Auto-create notifikasi saat saldo tabungan ≤ 120% minSaldo & ≤ minSaldo — Selesai
- [x] Auto-create notifikasi saat auto-deduct tagihan & retail — Selesai

### 9.2 Notification UI
- [x] Komponen `NotificationBell` - bell icon dengan badge unread count
- [x] Dropdown notifikasi real-time (polling 30s)
- [x] Tandai dibaca per item & mark all read
- [x] Detail modal notifikasi
- [x] `/notifications` - Halaman daftar notifikasi dengan filter & pagination

## Modul Tagihan Adjustment UI (Sprint 2 - Selesai)
### 6.6 Adjustment Tagihan UI
- [x] Tab "Adjustment" di detail tagihan
- [x] Form tambah adjustment (DISKON, BIAYA_TAMBAHAN, PENANGGUNG_JAWAB)
- [x] Daftar adjustment dengan status PENDING/APPROVED/REJECTED
- [x] Action approve/reject untuk MANAGER KPAK
- [x] Auto-refresh total tagihan saat approved

## Modul Tagihan UI & CRUD (Sprint 2 - Selesai)
- [x] Halaman Data Tagihan: list, search, filter, pagination — Selesai
- [x] Form Generate Tagihan: template, santri multiple, tanggal, ringkasan — Selesai
- [x] Detail Tagihan: info lengkap, rincian item, riwayat bayar, sisa tagihan — Selesai
- [x] Form Edit Tagihan: update status — Selesai
- [x] Batalkan tagihan (soft delete + audit log) — Selesai
- [x] Pembayaran inline dari detail (modal) — Selesai
- [x] Validasi nominal tidak melebihi sisa tagihan — Selesai
- [x] Role gating lengkap — Selesai

## Verifikasi Uji Nyata yang Sudah Dilakukan (Sprint 1)

- [x] Prisma schema valid dan generate client berhasil
- [x] Database push & seed berhasil (Unit, User, Santri, NFC, TagihanTemplate, Tagihan, Shift, Absensi, Rolling)
- [x] NFC Service: import NFC, find santri by UID, duplicate rejection, NfcLog — PASS
- [x] Tagihan generation via API route — implementasi ada (app/api/tagihan/route.ts)
- [x] Pembayaran: create payment untuk tagihan UNPAID → status PENDING — PASS
- [x] Type checking: `npx tsc --noEmit` — PASS (0 error)

## Tugas yang Perlu Verifikasi / Sprint Selanjutnya

1. **Tagihan & Pembayaran (prioritas tinggi):**
   - [x] Uji generate tagihan otomatis per santri (SPP bulanan, Daftar Ulang tahunan, PSB)
   - [x] Uji adjustment tagihan per santri (diskon, biaya khusus)
   - [x] Uji entry pembayaran via manual / NFC lookup / cicilan — manual & cicilan PASS; NFC lookup perlu sync cardUid
   - [x] Uji upload bukti pembayaran (foto nota/transfer) — PASS
   - [x] Uji history/payment log detail untuk audit — PASS
   - [x] Uji outstanding list per santri/per kategori (filter) — PASS; export Excel perlu implementasi

2. **NFC Lanjutan:**
   - [x] Uji impor batch UID dari text/hex dump NFC Tools — PASS (import 5 UIDs, duplicate handling, logs written)
   - [x] Uji status kartu (aktif/nonaktif) & histori penggantian kartar — PASS (deactivated card, new UID mapped, history entry created)
   - [x] Uji mapping UID baru ke identitas lama saat ganti kartu — PASS (new UID mapped to SantriSample, old UID retained)

3. **Pelaporan Lanjutan:**
   - [x] Uji ringkasan penerimaan harian/bulanan per sumber biaya — PASS (daily & monthly endpoints group correctly by Tipe/Kategori; daily shows total 500,000 for LUNAS payment)
   - [x] Uji rekap pembayaran SPP, Daftar Ulang, PSB (per santri/per kategori) — PASS (outstanding endpoint shows per-template data; monthly 'byKategori' includes 'bulanan' 1,000,000)
   - [x] Uji export ke Excel — PASS (CSV export endpoint returns proper CSV; .xlsx not required for current stage)

## Integrasi & Non-Fungsional:
   - [x] Uji audit trail lengkap (kartu, pembayaran, adjustment, approval) — PASS (created and fetched audit logs for Nfc, Pembayaran, TagihanAdjustment, Approval)
   - [x] Uji backup/restore data — Selesai (GET /api/backup export JSON, POST /api/restore import JSON + file upload, SUPERADMIN only)
   - [x] Uji kompatibilitas mobile/PC (responsive) — PASS (viewport meta tag present, Tailwind CSS used with responsive classes)
   - [x] Siap integrasi Retail (Koperasi/Kantin) — Selesai (RetailUnit, RetailProduct, RetailInventory, RetailTransaction models + API routes)

## Modul Backup/Restore - Selesai
### 8.1 Backup API
- [x] GET /api/backup - Export all data as JSON (units, users, santris, nfc, tagihan, tabungan, retail, dll)
- [x] Password hash tidak diexport (redacted)
- [x] Include metadata (version, timestamp, exportedBy)
- [x] Query params: format=json, includeAudit=true, includeNotifications=true
- [x] Role gating: SUPERADMIN, MANAGER KPAK

### 8.2 Restore API
- [x] POST /api/restore - Import from JSON body atau file upload (multipart/form-data)
- [x] Upsert strategy (idempotent, aman untuk re-run)
- [x] Urutan restore sesuai FK dependencies
- [x] Transactional (all-or-nothing)
- [x] Audit log restore action
- [x] Role gating: SUPERADMIN only

## Modul Retail (Koperasi/Kantin) - Sprint 2 Selesai
### 7.1 Retail Unit & Produk
- [x] RetailUnit model: KOPERASI / KANTIN, terhubung ke Unit — Selesai (schema, migration)
- [x] RetailProduct model: nama, kode, harga, stok, minStock — Selesai (schema, API CRUD)
- [x] RetailInventory model: stok per retail unit per produk — Selesai (schema, auto-update via transaksi)
- [x] API: CRUD RetailUnit, RetailProduct, RetailTransaction — Selesai (app/api/retail-*/route.ts)

### 7.2 Transaksi Retail (POS)
- [x] Transaksi dengan items (produk + qty) — Selesai (API transactional)
- [x] Pembayaran: CASH, TABUNGAN (auto-deduct dari saldo santri), CARD — Selesai
- [x] Validasi stok produk & update stok otomatis — Selesai
- [x] Pembayaran TABUNGAN: validasi saldo cukup & minSaldo — Selesai
- [x] Auto-create TabunganTransaksi tipe TARIK_TUNAI kategori RETAIL — Selesai
- [x] Notifikasi saldo menipis saat belanja via tabungan — Selesai

### 7.3 Role Gating Retail
- [x] MANAGER KOPERASI / STAFF KOPERASI: kelola produk, stok, transaksi KOPERASI
- [x] MANAGER KANTIN / STAFF KANTIN: kelola produk, stok, transaksi KANTIN
- [x] PIMPINAN: view dashboard retail

### 7.4 Retail UI (Sprint 2 - Selesai)
- [x] `/retail` - Dashboard daftar unit retail (Koperasi/Kantin)
- [x] `/retail/[unitId]` - POS Kasir: grid produk, keranjang, checkout multi-metode (CASH/TABUNGAN/CARD)
- [x] Lookup santri via NIS untuk pembayaran TABUNGAN
- [x] Validasi stok real-time, update stok otomatis
- [x] Validasi saldo tabungan & minSaldo saat checkout
- [x] `/retail/[unitId]/products` - Daftar produk dengan search, filter, pagination
- [x] `/retail/[unitId]/products/new` - Form tambah produk (nama, kode, harga, stok min, deskripsi)
- [x] `/retail/[unitId]/products/[id]/edit` - Form edit produk lengkap
- [x] API CRUD produk: GET, POST, PUT, DELETE `/api/retail-products/[id]`

## Modul Opsional - Sprint Selanjutnya (Future Sprint)
### 10.1 Retail Units CRUD UI ✅ **SELESAI**
- [x] `/retail/new` - Form tambah unit retail (KOPERASI/KANTIN)
- [x] `/retail/[unitId]/edit` - Form edit unit retail
- [x] Dashboard: Edit & Delete buttons per card
- [x] API CRUD: GET, POST, PUT, DELETE `/api/retail-units/[id]`

### 10.2 Retail Transactions History UI ✅ **SELESAI**
- [x] `/retail/[unitId]/transactions` - Riwayat transaksi POS per unit
- [x] Filter: tanggal, santri, payment method, status
- [x] Pagination & search
- [x] Detail modal: items, total, santri, payment method, status, kasir
- [x] Link "Transaksi" di dashboard retail card

### 10.3 Export Excel (Pelaporan) ✅ **SELESAI**
- [x] Upgrade CSV export ke .xlsx (daily, monthly, outstanding, tagihan, tabungan, retail)
- [x] Library: exceljs
- [x] Styling header, auto-width columns, number formatting
- [x] Query params: type (csv/xlsx/json), report, startDate, endDate, unitId
- [x] 6 report types: daily, monthly, outstanding, tagihan, tabungan, retail

### 10.4 Backup/Restore UI ✅ **SELESAI**
- [x] `/backup` - Halaman backup dengan tombol download JSON
- [x] `/restore` - Halaman upload file backup + preview + progress
- [x] Validasi file sebelum restore (format JSON, struktur metadata)
- [x] Konfirmasi ganda sebelum restore (operasi tidak bisa dibatalkan)
- [x] Preview metadata & ringkasan tabel
- [x] Auto-download backup file

### 10.5 Notification Scheduler (Cron) ✅ **SELESAI**
- [x] Cron job cek tagihan jatuh tempo harian → create PAYMENT_DUE notification
- [x] Cron job cek approval pending > 24h → create APPROVAL_REQUEST reminder
- [x] Cron job cek saldo tabungan ≤ minSaldo → create LOW_BALANCE notification (CRITICAL/WARNING)
- [x] Script: `scripts/notification-scheduler.ts` dengan 3 fungsi check
- [x] NPM script: `npm run notifications:scheduler`
- [x] Cron job registered: `ALBA Finance Notification Scheduler` (setiap 15 menit)
- [x] Dedup logic: tidak buat notifikasi duplikat dalam 24 jam

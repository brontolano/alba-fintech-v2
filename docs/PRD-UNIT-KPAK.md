# Product Requirements Document (PRD)
## Aplikasi Layanan Keuangan – Fokus UNIT KPAK

---

## 1. Latar Belakang
Pondok Pesantren membutuhkan sistem pembayaran/pencatatan yang rapi dan transparan untuk SPP bulanan, Daftar Ulang tahunan, dan biaya PSB (Penerimaan Santri Baru), serta memudahkan monitoring dana masuk/keluar per unit oleh KPAK dan supervisi Pimpinan lembaga.

## 2. Tujuan Utama
- Sentralisasi data tagihan dan pembayaran setiap santri.
- Fleksibilitas pengaturan rincian biaya/tagihan untuk tiap jenis pembayaran.
- Otomasi dan kemudahan rekap pembayaran SPP, Daftar Ulang, PSB.
- Transparansi laporan dan akses data real-time oleh Pimpinan.

## 3. Sasaran Pengguna
- Pimpinan (monitoring agregat, approval, broadcast info)
- Staff/Admin KPAK (entry pembayaran/tagihan, manage santri, adjustment, operasional harian/shift)
- Wali Santri/Santri (akses terbatas jika diperlukan)

## 4. Modul Utama
### 4.1. Master Data
- Data Unit/Divisi (KPAK, Koperasi, Kantin)
- Data User (roles: Pimpinan, Staff, Admin, dan mapping shift/absensi harian)
- Data Santri (profil lengkap, unit, status aktif, relasi kartu NFC)
- Data Kartu NFC: UID kartu, pemilik, status kartu, riwayat pemakaian

### 4.2. Integrasi NFC
- Input UID kartu NFC manual/scan, mapping cepat ke data santri/staff
- Impor batch UID dari text/hex dump NFC Tools
- Kompatibel dengan kebiasaan lama: entry cukup input UID (hasil scan/export hex), workflow administrasi tidak berubah
- Status kartu (aktif/nonaktif), pencatatan penggantian/histori

### 4.3. Template Rincian Tagihan
- Rincian tagihan default untuk SPP (bulanan), Daftar Ulang (tahunan), PSB (sekali bayar), editable
- Komponen biaya dinamis (tambah/hapus/ubah nominal & deskripsi)
- Periode pengenaan biaya: bulanan, tahunan, single (PSB)

### 4.4. Modul Tagihan
- Generate tagihan otomatis berdasarkan template & data santri
- Penyesuaian (adjustment) komponen tagihan per santri/per tagihan, misal: diskon, penambahan biaya khusus
- Status tagihan per santri: lunas/belum lunas, history pembayaran/cicilan

### 4.5. Operasional Harian KPAK
- Shift/jadwal: pencatatan petugas harian, rolling, absensi, libur
- Laporan harian: entry tabungan, Her & Daftar Ulang, dana keluar, semua langsung update di sistem
- Approval harian oleh Kepala Sektor/Pimpinan (digital)
- Dashboard shift: siapa jaga, siapa libur, aktivitas/laporan hari berjalan
- Admin cukup setor fisik sesuai nominal laporan, tidak perlu merekap manual

### 4.6. Modul Pembayaran
- Entry pembayaran (manual/scan kartu/input bukti)
- Pembayaran partial/cicilan
- Otomatis update status tagihan dan laporan
- History/payment log detail untuk audit

### 4.7. Pelaporan & Dashboard
- Ringkasan penerimaan harian/bulanan/periode per sumber biaya
- Rekap pembayaran SPP, daftar ulang, PSB (per santri/per kategori)
- Outstanding list, filter laporan, export ke Excel

### 4.8. Approval & Monitoring Pimpinan
- Dashboard pimpinan (statistik real-time, cashflow, outstanding)
- Approval digital laporan harian, broadcast info

## 5. Non-Functional Requirements
- Web-based, responsif (mobile/PC)
- User management & password security (hash, audit trail)
- Multi level role, logging aktivitas penting
- Support backup/restore data
- Kompatibel penggunaan NFC sesuai alat/proses di lapangan
- Siap integrasi dengan modul Retail (Koperasi & Kantin)

## 6. Use Case & User Flow
1. Petugas shift check-in/absen, sistem catat posisi/jadwal
2. Petugas entry tabungan santri via scan kartu NFC atau input UID
3. Staff input pembayaran Her, Daftar Ulang sesuai aktivitas harian
4. Semua laporan (tabungan, Her, daftar ulang, dana keluar) otomatis update di dashboard pimpinan
5. Kepala sektor/ketua cukup review, approve, dan administrasi penyerahan uang fisik sesuai laporan—no manual rekapan
6. Jika ganti/hilang kartu NFC, UID baru bisa diinput dan dimapping ke identitas lama
7. Audit trail pencatatan kartu, pembayaran, adjustment, approval
8. Pimpinan bisa memonitor statistik dan approve laporan harian tanpa menunggu

## 7. ERD (Entity Relationship Diagram) Ringkas
- **Santri** --< **Tagihan** --< **Pembayaran**
- **User** (role) --< **Unit**
- **TagihanTemplate** <--- **Tagihan**
- **Unit** --< **Tagihan, Santri**
- **Pembayaran** menyimpan history pembayaran, reference ke Tagihan & Santri
- **NFC** (UID) --< **Santri/User**, inklusi log aktivitas dan status kartu
- **Absensi/Shift** --< **User** (absen, rolling, histori bertugas)

## 8. Roadmap Minimal
1. Setup Master Data Unit, User, Santri, dan integrasi NFC
2. Modul Tagihan + Template Rincian
3. Jadwal/Shift operasional & absensi
4. Entri & update pembayaran, including by kartu NFC
5. Dashboard & laporan real-time
6. Approval digital harian/periodik
7. Adjustment & audit trail
8. Integrasi ke retail (next phase)

---

## Catatan Lanjutan
- NFC diadopsi tanpa mengubah kebiasaan input/operator lama
- Semua perubahan di-tag (audit log), status kartu tercatat—mudah tracking pemilik/ganti kartu
- Data real time & transparan, no manual recap harian
- Satu kali entry, semua laporan langsung tersedia untuk approval, tanpa delay; fisik uang cukup diserahkan sesuai laporan final
- Modul siap dikembangkan untuk retail (Koperasi/Kantin) serta support device hardware portable (Android NFC, dsb)

# PRD - ALBA-APPS (Product Requirements Document)

**Versi**: 1.0  
**Tanggal**: 6 Agustus 2026  
**Tujuan**: Mengganti buku besar manual menjadi digital real-time + offline

---

## 1. Masalah
- Data keuangan 3 unit (Kantor, Kantin, Koperasi) tidak real-time
- Buku besar ditulis tangan → lambat, rawan salah hitung, sulit dicari
- Kepala Keuangan harus menunggu laporan manual setiap hari

---

## 2. Solusi
Web App Mobile (PWA) yang memungkinkan:
- Input transaksi + foto bukti langsung dari HP
- Buku besar otomatis dengan saldo berjalan
- Real-time sync antar unit
- Mode offline sebagai backup

---

## 3. Fitur Utama (MVP)

| No | Fitur | Prioritas | Keterangan |
|----|-------|-----------|----------|
| 1 | Input Transaksi | P0 | Tanggal, Kategori, Unit, Debit/Kredit, Metode, Foto Nota |
| 2 | Buku Besar Digital | P0 | Tampilan mirip buku manual + running balance otomatis |
| 3 | Filter & Search | P0 | Per tanggal, unit, kategori, metode |
| 4 | Real-time Sync | P0 | Perubahan langsung terlihat di semua device |
| 5 | Offline Mode | P0 | Bisa input saat offline, sync otomatis saat online |
| 6 | Dashboard | P1 | Ringkasan saldo per unit + total hari ini |
| 7 | Export Laporan | P1 | Excel & PDF (harian/bulanan) |
| 8 | Master Data | P1 | Kategori, Akun, Metode Bayar |
| 9 | User Role | P1 | Kepala Keuangan (full), Staff (input only) |
|10 | Riwayat Foto | P2 | Semua bukti transaksi tersimpan |

---

## 4. User & Role

| Role | Jumlah | Hak Akses |
|------|--------|---------|
| Kepala Keuangan | 1-2 | Full access + approve + laporan |
| Staff Kantor | 3-5 | Input transaksi kantor |
| Staff Kantin | 3-5 | Input transaksi kantin |
| Staff Koperasi | 3-5 | Input transaksi koperasi |

---

## 5. Non-Functional Requirements
- Harus cepat di HP (mobile-first)
- Bisa offline minimal 7 hari
- Foto bukti otomatis ter-compress
- Data aman (user login + role)

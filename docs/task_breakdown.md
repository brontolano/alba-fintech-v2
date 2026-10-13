# Technical Breakdown - UNIT KPAK

Struktur modul & sub-tugas pengembangan aplikasi Layanan Keuangan UNIT KPAK berdasarkan PRD-UNIT-KPAK.md.

## 1. Master Data
- [ ] Schema PRISMA: `Unit`, `User`, `Role`, `Santri`, `NFC`, `NFCLog`, `UnitPartner`, `UnitSetting`
- [ ] API CRUD:
  - `/api/units`
  - `/api/users`
  - `/api/roles`
  - `/api/santris`
  - `/api/nfcs/import` (batch UID)
- [ ] Seed default data: unit KPAK, role, sample santri, default field config.
- [ ] Relasi antar tabel: Unit 1:N User, Unit 1:N Santri, Santri 1:1 NFC (opsional), NFC log audit.

## 2. Integrasi Kartu NFC
- [ ] Komponen `components/nfc/NfcUidInput.tsx` untuk scan/manual input UID.
- [ ] Service mapping UID -> User/Santri:
  - manual input UID
  - batch import dari teks/hex dump hasil NFC Tools (`docs/nfc.txt`)
  - return mapping/validation result
- [ ] Endpoint POST `/api/nfcs/scan` atau `/api/nfcs/import`
  - menerima UID, flag mode `manual|scan`, `unit_id`
  - response: `{uid, status, santri_id?, user_id?}`
- [ ] Validasi:
  - format UID (hex, panjang, non-duplicate)
  - status aktif/nonaktif
  - riwayat penggunaan `NFCLog`
- [ ] Kompatibilitas workflow lama: user cukup memasukkan UID tanpa mengubah alur manual.

## 3. Template Rincian Tagihan
- [ ] Schema: `TagihanTemplate`, `TagihanTemplateItem`, `Tagihan`, `TagihanItem`, `Pembayaran`
- [ ] Tabel/daftar template default:
  - SPP Bulanan
  - Daftar Ulang Tahunan
  - PSB Sekali Bayar
- [ ] API:
  - `GET /api/tagihan-templates`
  - `POST /api/tagihan-templates`
  - `PUT /api/tagihan-templates/:id`
  - `DELETE /api/tagihan-templates/:id`
  - `GET /api/tagihan/:santri_id/items`
- [ ] Field per item: `kode`, `nama`, `nominal`, `kategori`, `periode`, `urutan`, `aktif`.

## 4. Generator Tagihan
- [ ] Handler generate otomatis:
  - `POST /api/tagihan/generate`
  - Input: `unit_id`, `santri_ids`, `template_id`
  - Output: list tagihan baru + total tagihan
- [ ] Validation:
  - santri aktif
  - template aktif
  - cek duplikasi tagihan periode
- [ ] Atur `periode` tanggal: bulanan/tahunan/once (PSB).
- [ ] Fitur adjustment:
  - tambah/hapus/edit item per tagihan
  - endpoint `PUT /api/tagihan/:id/adjustment`

## 5. Modul Pembayaran
- [ ] Schema `Pembayaran`: `id`, `tagihan_id`, `santri_id`, `user_id`, `nominal`, `tanggal`, `bukti_url`, `tipe`, `keterangan`.
- [ ] API:
  - `GET /api/pembayaran`
  - `POST /api/pembayaran`
  - `GET /api/pembayaran/:id`
  - `PUT /api/pembayaran/:id`
- [ ] Fitur:
  - bayar penuh/parsial/cicilan
  - upload bukti
  - update status tagihan -> lunas/belum lunas
- [ ] Audit log setiap perubahan skor/status pembayaran.

## 6. Operasional Harian KPAK
- [ ] Schema:
  - `Shift`
  - `Absensi`
  - `ShiftReport`
  - `ShiftLog`
- [ ] API:
  - `GET/POST /api/shift`
  - `GET/POST /api/absensi`
  - `GET /api/shift-reports`
- [ ] Fitur bisnis:
  - jadwal rotasi jaga tabungan & jaga Her
  - libur bergilir
  - rolling laporan ke Direktur Keuangan
  - entry laporan tabungan, Her, daftar ulang, dana keluar setiap hari
- [ ] Approval:
  - sub-mitra teks/halaman laporan harian
  - approve oleh Kepala Sektor/Pimpinan
  - flag `approved_by`, `approved_at`, `status`

## 7. Pelaporan & Dashboard
- [ ] API agregasi:
  - `GET /api/pembayaran/dashboard`
  - `GET /api/daily-summary`
  - `GET /api/santri-outstanding`
  - `GET /api/harian-tabungan`
  - `GET /api/harian-her`
  - `GET /api/dana-keluar`
- [ ] Export:
  - PDF/CSV/Excel untuk laporan bulanan/harian
- [ ] Dashboard pimpinan:
  - statistik real-time
  - cashflow harian
  - outstanding tagihan
  - menunggu approval laporan
- [ ] Real-time update saat user entry laporan.

## 8. Approval & Monitoring Pimpinan
- [ ] Dashboard khusus pimpinan berita awal / ringkasan unit.
- [ ] Endpoint approval harian laporan:
  - `POST /api/pimpinan/approve`
- [ ] Fitur broadcast/minimal info ke staff jika ada notice.
- [ ] Log audit: siapa entry, approve, ganti status, export.

## 9. Scalable / Retail (skenario berikutnya)
- [ ] Standarisasi `Unit` & model `Retail` sehingga modul gudang, kasir/pos dapat ditambahkan nanti tanpa restructur database utama.
- [ ] Use shared DTO/API response untuk inventory, POS, konsinyasi, dll.

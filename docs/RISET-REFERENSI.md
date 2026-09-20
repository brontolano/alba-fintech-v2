# RISET REFERENSI — Penyederhanaan ALBA Finance

> Dokumen kerja untuk memandu penyederhanaan aplikasi agar mudah digunakan pimpinan,
> manager, staff, dan santri. Disusun 21 September 2026 dari riset web + pemetaan
> kode aplikasi saat ini. Bukan janji fitur — rekomendasi prioritas untuk didiskusikan.

## 1. Latar Belakang

Kondisi nyata di lapangan (dari pimpinan):

- Pencatatan manual di **4 buku kertas per unit** dengan kolom:
  `Tanggal | Keterangan | Debet | Kredit | Saldo`.
- Setiap hari santri/staff melaporkan & menyetor; pimpinan menulis 4 buku sekaligus.
- Unit:
  - **KPAK** — HER/SPP bulanan, pendaftaran/daftar ulang, tabungan santri (setor/tarik),
    layanan keuangan internal pondok (masuk/keluar sesuai arahan pimpinan).
  - **Koperasi Buku, Kantin Umi, Kantin Baru** — lebih fokus jual barang; pengadaan
    diajukan ke pimpinan; kadang ada barang titipan UMKM yang dikelola manager
    (HPP + margin).
- Peran: **Pimpinan** (atas), **Manager** (tengah), **Staff** (input harian).
- Tujuan penyederhanaan: **mudah dipakai santri-level staff** dan **monitoring
  keuangan realtime yang transparan** untuk pimpinan.

Kondisi aplikasi saat ini (hasil audit kode):

- Cukup lengkap: 33 halaman, 14 item menu, role-gating per menu sudah ada.
- Menunya berat untuk dipakai harian; ada duplikat menu ("Input Data" dan
  "Transaksi Berjalan" menuju halaman yang sama).
- Schema sudah mendukung semua kebutuhan:
  `Student` + `SavingsAccount`/`SavingsTransaction` (tabungan santri),
  `InventoryItem`/`OrderItem` (inventory + POS),
  `Transaction`/`Approval`/`FinancialNote` (kas + pengajuan),
  `BroadcastMessage`/`Notification` (info & notifikasi).
- Artinya: **sebagian besar simplifikasi cukup di lapisan UI/alur, tanpa ubah
  database besar-besaran.**

## 2. Rekap Referensi

### A. Manajemen keuangan pesantren (SPP, tabungan, tagihan)

| Referensi | Poin relevan |
|---|---|
| **ePesantren** (epesantren.co.id, demo.epesantren.co.id) | Modul tabungan santri, laporan pembayaran/tabungan, "Anjungan Santri" (cek status tanpa kerepotan), eKantin, notifikasi WhatsApp/Telegram. |
| **SiPonpes** (siponpes.com) | SPP digital, uang saku/tabungan santri **transparan — ortu bisa pantau saldo**, absensi, raport. |
| **SIRI** (bsn.co.id) | Portal **multi-peran** (Admin, OSPEN, Guru, Pegawai, Santri); modul keuangan: tagihan, tabungan, donasi, pembayaran; akses sesuai peran. |
| **Jaringan IDN / TrenDi** (infradigital.io) | Dasbor terintegrasi data santri & keuangan **realtime**, laporan standar PSAK 45. |
| **Cazh Cards** (cards.co.id, cazh.id) | Kartu santri (RFID/barcode), kantin **cashless**, tabungan setor–tarik terlacak, saldo realtime, rekap penjualan kantin + stok, riwayat transaksi untuk wali. |
| **SiskeSakti** (siskesakti.com) | Kasir Kopontren, Keuangan Santri, Pembayaran Santri, **Buku Besar**. |
| **SIAKADPONPES** (siakadponpes.com) | Dashboard analitik **real-time**, tagihan, pembayaran online, laporan keuangan. |
| **Jurnal: Manajemen Keuangan Ponpes Miftahul Hidayah** | Fitur usulan: data santri, neraca keuangan, laporan mingguan/bulanan/tahunan. |

### B. Koperasi simpan pinjam (rujukan modul tabungan & simpanan)

| Referensi | Poin relevan |
|---|---|
| **SimPinKop** (simpinkop.id) | Simpanan (wajib/pokok/sukarela), pinjaman, **jurnal & buku besar**, laporan keuangan, SHU; **anggota melihat saldo & transaksinya online**. |
| **eKoperasi** (ekoperasi.co.id) | Modul transaksi kas, simpanan, master data, laporan otomatis, akses anggota. |
| **PlanetCoops Syariah** (github.com/kamshory) | Web simpan pinjam syariah open-source: tabungan setor–tarik, cetak buku tabungan & rekening koran, jurnal, neraca, laba rugi; ada aplikasi Android. |
| **koperasi_v3 (dhiforester)** & **koperasi-simpan-pinjam (Apta-tea)** | Koperasi simpan pinjam open-source (Laravel/PHP) — referensi struktur modul. |
| **kdmp (amanahay)** | Platform koperasi **serbaguna multigerai** (sembako, obat, klinik, simpan pinjam, gudang) — konsep multi-unit paling dekat dengan 4 unit ALBA. |

### C. POS / retail & akuntansi sederhana (rujukan koperasi buku & kantin)

| Referensi | Poin relevan |
|---|---|
| **KasirKu** (github.com/KevinAdhaikal/KasirKu) | POS Indonesia realtime (Bun/Docker/TypeScript): kasir, manajemen barang, **dashboard kas realtime**, pembukuan pemasukan/pengeluaran/laba, multi-user. |
| **KasirPro** (kasirpro.com) | POS UMKM: online nota, back office, rekap, multi-outlet. |
| **openbooks** (openbooks-site.vercel.app) | Akuntansi open-source (AGPLv3): **group view → drill-down hingga transaksi tunggal**, nilai ter-update realtime. Filosofi: lihat dari atas sampai detail. |
| **ERPNext** (FOSS ERP) | Akuntansi + inventory + POS + **konsinyasi (consignment)** — dasar pengelolaan barang titipan UMKM + HPP/margin. |

### D. Format pencatatan sederhana (bukti bahwa format pimpinan sudah benar)

- **Buku Kas Umum Bendahara** (Permendagri pedoman keuangan desa):
  `No | Tanggal | Uraian | Penerimaan | Pengeluaran | No bukti | Saldo` —
  persis pola `Tanggal | Keterangan | Debet | Kredit | Saldo` yang dipakai pimpinan.
  Saldo = penerimaan − pengeluaran (dihitung berjalan).
- **Buku saku pembukuan UMKM** (UN PGRI Kediri): buku kas, buku pembelian,
  buku penjualan, buku hutang/piutang, buku persediaan — perpustakaan ideal
  untuk unit dagang (koperasi/kantin): kas umum + pembelian/penjualan + persediaan = HPP.
- **SAK EMKM**: UMKM cukup 3 laporan (laba rugi, posisi keuangan, CALK).
  Intinya: **tidak perlu double-entry penuh**; pakai basis kas sederhana +
  HPP untuk dagang. Internal boleh tetap double-entry demi akurasi/audit.
- Format tabel umum di pasar: `Tanggal | Keterangan | Pemasukan | Pengeluaran | Saldo`.

## 3. Kesimpulan Riset — Tiga Lapis Interaksi

Pola yang berulang di semua produk pesantren/koperasi yang sukses:

1. **Layar Pimpinan = Papan Pantau semua unit.**
   Saldo, mutasi hari ini, tabungan santri, antrean pengajuan — satu layar.
   Pimpinan tidak perlu mengeklik unit satu-satu.
2. **Layar Kasir/Staff = satu halaman input cepat.**
   Setoran/tarik atau jualan selesai dalam beberapa klik tanpa berpindah modul.
3. **Layar Santri/Wali = lihat saldo & mutasi tanpa login** (link/QR/NIS),
   seperti "Anjungan Santri".

Prinsip penyederhanaan:
- **Tetap tampilkan `Debet/Kredit/Saldo`** (sesuai kebiasaan pimpinan), saldo
  berjalan dihitung otomatis.
- **Single-entry untuk pemakaian harian**, double-entry/internal tetap berjalan
  di belakang untuk laporan & audit.
- **Sembunyikan, jangan hapus**: modul canggih tetap ada untuk manager/pimpinan;
  staff & tampilan default dibuat seminimal mungkin.

## 4. Pemetaan ke 4 Unit & Peran

### KPAK (HER/SPP, daftar ulang, tabungan santri, layanan internal pondok)

| Kebutuhan | Referensi | Sudah ada di aplikasi? | Aksi simplifikasi |
|---|---|---|---|
| Setoran HER/SPP/daftar ulang | ePesantren, SiPonpes | `Transaction` INCOME + kategori | Form cepat "Setoran" dengan kategori preset (HER, SPP, daftar ulang). |
| Tabungan santri setor/tarik | SimPinKop, Cazh, SiPonpes | `Student` + `SavingsAccount` + `SavingsTransaction` ✓ | Halaman setor/tarik cepat (cari santri → nominal → simpan), mutasi & saldo realtime. |
| Layanan internal pondok | — | `Transaction` biasa | Cukup lewat Buku Kas unit. |

### Koperasi Buku / Kantin Umi / Kantin Baru (jual barang, inventory, POS, titipan UMKM)

| Kebutuhan | Referensi | Sudah ada? | Aksi simplifikasi |
|---|---|---|---|
| Penjualan | KasirKu, KasirPro | POS + `OrderItem` ✓ | Pastikan POS per unit benar; buat tampilan kasir 1 layar. |
| Pengadaan barang | Buku saku UMKM | `Transaction` EXPENSE + `InventoryItem` ✓ | Alur pengajuan → pembelian → barang masuk stok. |
| Barang titipan UMKM (consignment) | ERPNext, KasirKu | Belum (tidak ada penanda supplier/titipan) | Opsional: field `consignment`/`supplier` di `InventoryItem` + laporan margin (`unitPrice`−`purchasePrice` sudah ada). |
| HPP & margin | SAK EMKM, buku saku UMKM | `unitPrice` & `purchasePrice` ✓ | Laporan laba per barang dari `OrderItem`. |

### Semua unit — kas umum

| Kebutuhan | Referensi | Sudah ada? | Aksi simplifikasi |
|---|---|---|---|
| Buku kas digital per unit | Buku Kas Umum Bendahara | `Transaction` ✓ | Tampilkan daftar transaksi sebagai **Buku Kas** (`Tanggal | Ket | Debet | Kredit | Saldo`), saldo berjalan otomatis. |
| Monitoring pimpinan | TrenDi, SIAKADPONPES, openbooks | `/dashboard/monitor` + `/dashboard/reports` ✓ | Jadikan **Papan Pantau 4 unit** satu layar. |

### Peran

| Peran | Fokus setelah penyederhanaan | Menu yang disarankan terlihat |
|---|---|---|
| **Pimpinan** | Pantau 4 unit, approve pengajuan, lihat tabungan | Papan Pantau, Pengajuan, Tabungan, Laporan, Pengaturan (admin). |
| **Manager** | Rekap setoran, rekonsiliasi, kelola inventory/POS | Buku Kas, Rekonsiliasi, Inventori, POS, Tabungan, Laporan. |
| **Staff** | Input harian saja | Buku Kas (input cepat + lihat saldo unitnya). Inventori/POS hanya kalau unitnya retail. |

## 5. Rekomendasi Tahapan

1. **Buku Kas digital per unit (tercepat, nilai terbesar).**
   Halaman daftar transaksi diubah tampilannya menjadi format buku kas dengan
   saldo berjalan otomatis + form input cepat. Staff cukup punya 2 menu.
2. **Papan Pantau pimpinan (realtime).** Satu layar: saldo 4 unit, masuk/keluar
   hari ini, saldo tabungan santri, antrean pengajuan menunggu approval.
3. **Tabungan santri disederhanakan.** Alur setor/tarik cepat; tambah
   "Anjungan Santri" (lihat saldo/mutasi lewat NIS/link tanpa login).
4. **Rapikan navigasi.** Hapus duplikat menu, grup menu per peran, sembunyikan
   modul tak relevan untuk staff.
5. **(Opsional, nanti) Titipan UMKM & margin.** `consignment`/`supplier` di
   inventory + laporan laba barang.

Catatan: tahap 1–4 tidak memerlukan perubahan skema DB besar; cukup UI/alur.
Tema tidak diubah; prioritas **mantap dipakai harian**, bukan fitur baru besar.

## 6. Keputusan yang Perlu Diambil Sebelum Implementasi

1. **Identitas "Buku Kas"** = per unit (4 buku), pimpinan melihat semua unit?
   (sesuai panduan: ya).
2. **Format nominal**: tampilkan Rupiah tanpa desimal meskipun DB memakai
   `Decimal(15,2)`? (disarankan ya untuk keterbacaan santri).
3. **Kebijakan approval**: otomatis terima INCOME kecil; manual untuk EXPENSE
   dan nominal di atas batas tertentu? Perlu angka batasnya.
4. **Tabungan**: pakai kartu QR/RFID (kolom `cardUid` sudah ada) atau cukup
   cari nama/NIS?
5. **Anjungan santri tanpa login**: publik tanpa kata sandi, atau dilindungi PIN?

## 7. Daftar Tautan Referensi

- https://epesantren.co.id/ · https://demo.epesantren.co.id/
- https://siponpes.com/
- https://bsn.co.id/
- https://www.infradigital.io/pesantren
- https://cards.co.id/pesantren · https://cazh.id/kartusantri.pdf
- https://siskesakti.com/
- https://siakadponpes.com/
- https://simpinkop.id/
- https://ekoperasi.co.id/
- https://github.com/kamshory/Koperasi-Simpan-Pinjam-Syariah
- https://github.com/Apta-tea/koperasi-simpan-pinjam · https://github.com/dhiforester/koperasi_v3
- https://exploreds.xyz/amanahay/kdmp
- https://github.com/KevinAdhaikal/KasirKu
- https://kasirpro.com/
- https://openbooks-site.vercel.app/
- ERPNext — https://erpnext.com
- Buku Kas Umum Bendahara (Permendagri keuangan desa) — https://peraturan.bpk.go.id
- Buku saku pembukuan UMKM UN PGRI Kediri — https://repository.unpkediri.ac.id
- SAK EMKM & contoh pembukuan UMKM — https://www.bfi.co.id/id/blog/contoh-pembukuan-keuangan
- Jurnal "Rancang Bangun Aplikasi Manajemen Keuangan di Pondok Pesantren
  Miftahul Hidayah Berbasis Web" — jurnal.itg.ac.id
# ALBA Finance v7.0.0

[![Stable](https://img.shields.io/badge/status-stable-16803c)](https://github.com/brontolano/alba-fintech-v2/tree/v7.0.0) [![Release](https://img.shields.io/github/v/release/brontolano/alba-fintech-v2)](https://github.com/brontolano/alba-fintech-v2/releases)

ALBA Finance adalah platform operasional keuangan multi-unit untuk Pondok Pesantren Al-Basyariyah. Aplikasi ini menyatukan pencatatan transaksi, persetujuan, rekonsiliasi, inventori, POS, laporan, dan administrasi akses dalam satu workflow yang terkontrol.

Dokumen ini menjadi acuan utama untuk menjalankan aplikasi, memahami batas akses, menguji perubahan, dan menyiapkan pull request.

## Status Produk

- **Versi stable:** `7.0.0` (19 September 2026)
- **Runtime:** Node.js 20 LTS
- **Framework:** Next.js 16 App Router
- **Database:** MySQL 8
- **ORM:** Prisma 7 (rust-free `prisma-client` + driver adapter)
- **Authentication:** NextAuth.js v4.24 (keputusan: tetap v4 — v5 masih beta; migrasi ditunda sampai v5 stable)
- **UI:** React, Tailwind CSS, shadcn/ui, lucide-react
- **Deployment:** Hostinger Node.js application

## Domain Model

Struktur organisasi yang didukung:

```text
Pondok Pesantren Al-Basyariyah
├── KPAK
├── Kantin Baru
├── Kantin Umi
└── Koperasi Buku
```

Role `SUPERADMIN` adalah otoritas tertinggi dan memiliki akses global terhadap master data, pengguna, transaksi, approval, inventori, settings, backup, restore, reset, serta demo data. Role lain dibatasi sesuai lingkup lembaga atau unitnya.

| Role         | Scope   | Tanggung jawab utama                                 |
| ------------ | ------- | ---------------------------------------------------- |
| `SUPERADMIN` | Global  | Administrasi sistem dan seluruh data                 |
| `PIMPINAN`   | Lembaga | Pengawasan, approval, laporan, broadcast             |
| `MANAGER`    | Unit    | Operasional unit, transaksi, inventori, rekonsiliasi |
| `STAFF`      | Unit    | Pencatatan transaksi dan operasional harian          |

## Fitur Produk

- Dashboard berdasarkan role dan unit
- Transaksi pemasukan, pengeluaran, dan transfer
- Workflow draft, pending, approved, dan rejected
- Approval berjenjang dan audit approval
- Financial notes dan rekonsiliasi
- Inventori dan POS untuk unit retail
- Laporan agregat per unit/lembaga
- Manajemen lembaga, unit, pengguna, dan kategori keuangan
- Broadcast serta notifikasi
- Persistensi theme dan system settings
- Manajemen data Superadmin: ekspor backup JSON, impor backup, reset data, dan Demo Data
- Health check aplikasi dan database melalui `/health` serta `/api/health`

## Quick Start

### Prasyarat

- Node.js 20 atau lebih baru
- npm 10 atau lebih baru
- MySQL 8 yang dapat diakses dari environment aplikasi

### Instalasi

```bash
git clone https://github.com/brontolano/alba-fintech-v2.git
cd alba-fintech-v2
npm install
```

Buat `.env.local` dari `.env.example`, lalu isi minimal:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-long-random-secret"
NODE_ENV="development"
```

Jalankan pemeriksaan schema dan aplikasi:

```bash
npx prisma generate
npx prisma validate
npm run type-check
npm run dev
```

`DATABASE_URL` wajib dikelola melalui environment. Jangan commit password database, `.env.local`, atau backup production ke repository.

## Data Demo

Data demo dapat dibuat dari **Pengaturan > Manajemen Data > Demo Data** oleh Superadmin. Proses ini mengganti data operasional dengan dataset edukasi untuk empat unit dan mempertahankan akun Superadmin.

Dataset demo mencakup:

- Lembaga Pondok Pesantren Al-Basyariyah
- KPAK, Kantin Baru, Kantin Umi, dan Koperasi Buku
- User Pimpinan, Manager, dan Staff per unit
- Kategori keuangan, rekening kas, transaksi approved/pending
- Approval, inventori retail, financial notes, notifikasi, dan system settings

Password demo dikembalikan oleh API hanya pada respons operasi Demo Data. Ganti kredensial demo sebelum dipakai di lingkungan non-development.

## Manajemen Data

Semua operasi berikut hanya tersedia untuk `SUPERADMIN`:

| Operasi | Endpoint                                     | Perilaku                                                 |
| ------- | -------------------------------------------- | -------------------------------------------------------- |
| Ekspor  | `GET /api/data`                              | Mengunduh seluruh data sebagai JSON                      |
| Impor   | `POST /api/data` dengan payload backup       | Mengganti data sesuai backup secara transaksional        |
| Reset   | `POST /api/data` dengan `{"action":"reset"}` | Menghapus data operasional dan mempertahankan Superadmin |
| Demo    | `POST /api/data` dengan `{"action":"demo"}`  | Membuat ulang dataset edukasi empat unit                 |

Backup adalah data sensitif. Simpan di lokasi aman dan verifikasi hasil restore di environment non-production terlebih dahulu.

### Backup Otomatis Harian

Backup terjadwal dibuat oleh command berikut:

```bash
npm run db:backup
```

Command tersebut menulis backup JSON ke folder privat `backups/`, menggunakan nama file bertimestamp, permission file terbatas, dan menghapus backup yang lebih tua dari 14 hari. Konfigurasi dapat diubah melalui:

```env
BACKUP_DIRECTORY="backups"
BACKUP_RETENTION_DAYS="14"
```

Pada Hostinger, cron harian dijadwalkan pada pukul 02:00 dengan command:

```bash
cd /path/to/alba && npm run db:backup
```

Backup lokal di server bukan pengganti off-site backup. Salin backup secara berkala ke storage terpisah dan lakukan restore drill.

### Google Drive dan Google Sheets

Backup dapat diunggah otomatis ke Google Drive dan dicatat ke Google Sheets melalui Google Apps Script. Template tersedia di [docs/google-apps-script/Code.gs](docs/google-apps-script/Code.gs).

1. Buat folder backup di Google Drive dan spreadsheet untuk log.
2. Tempel `Code.gs` di Google Apps Script, isi folder ID, spreadsheet ID, nama sheet, dan shared secret.
3. Deploy sebagai **Web app**, akses **Anyone**, lalu salin URL deployment.
4. Isi environment Hostinger:

```env
GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
GOOGLE_APPS_SCRIPT_SECRET="shared-secret-yang-sama"
```

5. Jalankan `npm run db:backup` sekali untuk verifikasi. Cron harian akan mengunggah file secara background tanpa browser.

Apps Script mencatat timestamp, nama file, ukuran, status, Drive file ID, URL Drive, source, dan error ke sheet `Backup Log`. Gunakan shared secret panjang dan jangan memasukkan URL/token ke repository.

## API dan Struktur Kode

```text
app/
├── api/                 # Route handlers dan RBAC server-side
│   ├── retail/reorder/            # Pengajuan belanja stok (GET/POST, suggest, receive)
│   └── savings/limits|cross-unit  # Batas belanja harian & laporan lintas unit
├── dashboard/
│   ├── retail/belanja/            # Form + riwayat pengajuan belanja stok retail
│   └── savings/limits|cross-unit  # Pengaturan batas & laporan tabungan lintas unit
components/              # Komponen UI dan dashboard
lib/
├── prisma.ts            # Prisma singleton
├── retail-guard.ts      # Guard unit retail + resolveUnitId
└── savings-limit.ts     # startOfWibDay + helper batas harian WIB
prisma/schema.prisma     # Model dan relasi MySQL (termasuk PurchaseItem, dailySpendLimit)
scripts/                 # Seed dan utility operasional
```

Route mutasi harus selalu memvalidasi session, role, input Zod, ownership/scope, dan error Prisma yang relevan. `SUPERADMIN` boleh melampaui scope unit/lembaga, tetapi tetap mengikuti validasi integritas relasi database.

## Validasi Sebelum Pull Request

Jalankan seluruh pemeriksaan berikut:

```bash
npx prisma validate
npm run type-check
npm run build
```

Checklist PR:

- [ ] Perubahan tidak membocorkan secret atau data production
- [ ] Perubahan API memiliki validasi input dan RBAC
- [ ] Perubahan database kompatibel dengan MySQL remote
- [ ] Loading, error, empty state, dan success state UI diuji
- [ ] Health check dan route yang terdampak diuji
- [ ] README atau dokumentasi teknis diperbarui bila kontrak berubah

## Deployment Hostinger

Deployment otomatis dari Git: cukup push ke `main`, Hostinger build & deploy sendiri. Tidak perlu build manual / upload folder.

```bash
git add .
git commit -m "<pesan perubahan>"
git push origin main
```

Proses build tampil di hPanel; app kemudian live di `https://alba.brontolano.com`.

- **Environment** di-set di hPanel (Node.js → Environment Variables): `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NODE_ENV=production`, dll. — lihat `.env.production.example` dan `docs/DEPLOY.md`.
- **Verifikasi** setelah deploy:

```bash
curl https://alba.brontolano.com/health
```

Respons harus menunjukkan `ok`.

Panduan lengkap: [docs/DEPLOY.md](docs/DEPLOY.md)

## Pull Request Documentation

Gunakan struktur berikut pada PR:

### Summary

Jelaskan perubahan produk dan alasan bisnis/operasionalnya dalam 2-4 kalimat.

### Scope

Sebutkan route, halaman, model database, dan role yang terdampak.

### Verification

Cantumkan command yang dijalankan, smoke test live/local, serta hasil pentingnya.

### Data and Migration Notes

Jelaskan perubahan schema, seed, backup, compatibility, dan rollback bila ada.

### Risk and Rollback

Catat risiko yang tersisa serta langkah untuk membatalkan atau memulihkan perubahan.

## Dukungan

- Repository: https://github.com/brontolano/alba-fintech-v2
- Issue tracker: https://github.com/brontolano/alba-fintech-v2/issues
- Tag stable: https://github.com/brontolano/alba-fintech-v2/tree/v7.0.0
- Dokumentasi deployment: [docs/DEPLOY.md](docs/DEPLOY.md)
- Dokumentasi teknis: [docs/DOKUMENTASI-TEKNIS.md](docs/DOKUMENTASI-TEKNIS.md)

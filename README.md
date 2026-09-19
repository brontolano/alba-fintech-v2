# ALBA Finance

ALBA Finance adalah platform operasional keuangan multi-unit untuk Pondok Pesantren Al-Basyariyah. Aplikasi ini menyatukan pencatatan transaksi, persetujuan, rekonsiliasi, inventori, POS, laporan, dan administrasi akses dalam satu workflow yang terkontrol.

Dokumen ini menjadi acuan utama untuk menjalankan aplikasi, memahami batas akses, menguji perubahan, dan menyiapkan pull request.

## Status Produk

- **Runtime:** Node.js 20 LTS
- **Framework:** Next.js 16 App Router
- **Database:** MySQL 8
- **ORM:** Prisma 5
- **Authentication:** NextAuth.js
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

## API dan Struktur Kode

```text
app/
├── api/                 # Route handlers dan RBAC server-side
├── dashboard/           # Halaman workflow aplikasi
components/              # Komponen UI dan dashboard
lib/
├── prisma.ts            # Prisma singleton
└── data-management.ts   # Backup, restore, reset, dan demo data
prisma/schema.prisma     # Model dan relasi MySQL
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

Deployment menggunakan Node.js application dengan `server.js` sebagai startup file. Build production:

```bash
npm install
npm run build
npm start
```

Pastikan environment production di Hostinger berisi `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, dan `NODE_ENV=production`. Setelah deploy, verifikasi:

```bash
curl https://your-domain.example/health
curl https://your-domain.example/api/health
```

Respons `/api/health` harus menunjukkan `ok: true` dan `db: "up"`.

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
- Dokumentasi deployment: [docs/DEPLOY.md](docs/DEPLOY.md)
- Dokumentasi teknis: [docs/DOKUMENTASI-TEKNIS.md](docs/DOKUMENTASI-TEKNIS.md)

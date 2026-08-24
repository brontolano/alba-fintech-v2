# ALBA Finance v2

Aplikasi keuangan berbasis web untuk pesantren dan organisasi. Saat ini aplikasi menyediakan alur transaksi, approval, dashboard berdasarkan role, serta POS retail sederhana. Stack utama: **Next.js 14 App Router**, **Prisma 6**, **MySQL**, dan **NextAuth v4**.

## Progress Saat Ini

### Sudah tersedia
- **Transaction Manager**: membuat, mengubah, melihat, mencari, dan memfilter transaksi pemasukan/pengeluaran.
- **Approval Workflow**: status `DRAFT`, `PENDING`, `APPROVED`, dan `REJECTED` dengan aksi approval untuk Superadmin dan Pimpinan.
- **Retail POS**: cart dan pembuatan beberapa transaksi sekaligus; transaksi POS masuk ke alur approval.
- **RBAC**: role `SUPERADMIN`, `PIMPINAN`, `MANAGER`, dan `STAFF` dengan dashboard serta akses menu sesuai role.
- **Unit Management**: CRUD unit dan status aktif/nonaktif untuk Superadmin dan Pimpinan.
- **User Management**: tersedia pada area Superadmin.
- **Buku Besar**: ringkasan transaksi yang sudah disetujui untuk Superadmin dan Pimpinan.

### Masih dalam pengembangan
- **Inventory / Stok Barang**: halaman saat ini masih placeholder dan mengarahkan pengguna ke POS.
- **Audit Log**: model database dan API sudah tersedia, tetapi halaman UI masih placeholder.
- **AI Assistant**: menu masih berstatus beta dan halaman implementasinya belum tersedia.

## Tech Stack

| Tools | Version |
|-------|---------|
| Next.js | 14.2.18 (App Router) |
| React | 18 |
| Prisma / Prisma Client | 6.19.3 |
| Database | MySQL |
| Authentication | NextAuth 4.24 |
| UI | Tailwind CSS, Radix UI, Lucide React |
| Validation | Zod |
| Deployment | Node.js standalone di Hostinger |

## Setup Lokal

Prasyarat: Node.js 18 atau lebih baru dan database MySQL yang dapat diakses aplikasi.

```bash
npm install

# Buat .env dari template yang tersedia, lalu isi DATABASE_URL,
# NEXTAUTH_URL, dan NEXTAUTH_SECRET.
npx prisma validate
npx prisma generate
npx prisma db push
npm run db:seed

npm run dev
```

Buka `http://localhost:3000`. Untuk menjalankan build production secara lokal:

```bash
npm run build
npm run start
```

## Script NPM

| Perintah | Kegunaan |
|----------|----------|
| `npm run dev` | Menjalankan development server |
| `npm run build` | Membuat build production |
| `npm run start` | Menjalankan build production |
| `npm run lint` | Menjalankan lint Next.js |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Sinkronisasi schema ke database |
| `npm run db:seed` | Membuat data awal |
| `npm run db:studio` | Membuka Prisma Studio |
| `npm run deploy:prepare` | Menyiapkan artefak deployment |

## Akun Seed

`npm run db:seed` membuat satu Unit Pusat dan empat akun berikut. Semua akun seed menggunakan password sementara `bismillah`.

| Role | Email |
|------|-------|
| Superadmin | `admin@brontolano.com` |
| Pimpinan | `pimpinan@brontolano.com` |
| Manager | `manager@brontolano.com` |
| Staff | `staff@brontolano.com` |

Segera ganti password setelah login pertama dan jangan gunakan password seed di production.

## Matriks Akses

| Fitur | Superadmin | Pimpinan | Manager | Staff |
|-------|:-:|:-:|:-:|:-:|
| Dashboard role | Ya | Ya | Ya | Ya |
| Transaksi | Semua | Semua | Unit sendiri | Unit sendiri |
| Approval | Ya | Ya | Tidak | Tidak |
| POS | Ya | Tidak di menu | Ya | Ya |
| Buku Besar | Ya | Ya | Tidak | Tidak |
| Manajemen Unit | Ya | Ya | Tidak | Tidak |
| Manajemen User | Ya | Tidak | Tidak | Tidak |
| Audit Log | Ya | Tidak | Tidak | Tidak |

## Deployment

Aplikasi dikonfigurasi untuk deployment Node.js standalone di Hostinger. Pastikan environment berikut diatur pada server:

```env
DATABASE_URL="mysql://user:password@host:3306/database"
NEXTAUTH_URL="https://domain-anda.example"
NEXTAUTH_SECRET="secret-random-minimal-32-byte"
NODE_ENV="production"
```

Panduan lengkap tersedia di [DEPLOYMENT.md](./DEPLOYMENT.md) dan [DEPLOY.md](./DEPLOY.md). Jangan commit file `.env` atau kredensial database.

## Catatan Status

Repository ini sedang aktif dikembangkan. Fitur yang diberi label “masih dalam pengembangan” belum boleh dianggap selesai untuk kebutuhan production tanpa verifikasi tambahan.

> **Developer:** BrontoLano (@brontolano)
> **Ustadz:** Muhammad Hamdan

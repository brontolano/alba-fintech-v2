# ✨ ALBA Finance v3 — Aplikasi Keuangan Pondok Pesantren Al-Basyariyah

[![Next.js](https://img.shields.io/badge/Next.js-14.2.18-black?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D2743?style=flat-square&logo=prisma)](https://prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4472C4?style=flat-square&logo=mysql)](https://mysql.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth-4.24-0075FF?style=flat-square)](https://next-auth.js.org/)

> **ALBA Finance v3** adalah sistem manajemen keuangan berbasis web yang dirancang khusus untuk **Pondok Pesantren Al-Basyariyah** di Jl. Mahmud, Rahayu, Kec. Margaasih, Kabupaten Bandung, Jawa Barat 40218.

## 📋 Deskripsi Singkat

Aplikasi ini dikembangkan untuk membantu pimpinan pondok pesantren mengelola keuangan dengan baik. Sebelumnya, keuangan dicatat manual dalam 4 buku terpisah untuk 4 unit, yang seringkali menyebabkan kesulitan dalam pembuatan laporan gabungan. 

Aplikasi ini mengintegrasikan semua unit ke dalam satu sistem real-time dengan fitur:

- **Pencatatan transaksi** real-time per unit
- **Virtual card** per unit pada dashboard pimpinan
- **Filter & sortir** yang fleksibel untuk laporan
- **Persetujuan/pengajuan** pengeluaran
- **Rekonsiliasi** harian per unit
- **Inventori & POS** untuk unit retail (Koperasi Buku, Kantin Umi, Kantin Baru)
- **Notifikasi push** untuk pemberitahuan penting

## 🚀 Fitur

### Manajemen Unit
- **KPAK** (Kantor Pelayanan Administrasi Keuangan): Penyimpanan uang, administrasi sekolah
- **Koperasi Buku**: Perlengkapan sekolah, buku, kitab
- **Kantin Umi**: Dagangan makanan dan jajanan
- **Kantin Baru**: Dagangan makanan dan jajanan

### Pencatatan Keuangan
- Transaksi harian (pemasukan/pengeluaran)
- Pencatatan langsung oleh pimpinan
- Workflow persetujuan (approve/reject)
- Bukti transaksi berupa foto nota

### Manajemen Inventori & POS
- Stok barang per unit retail
- Point of Sale (kasir)
- Pelacatan penjualan dan pembelian

### Laporan & Dashboard
- Dashboard pimpinan dengan virtual card per unit
- Laporan keuangan real-time
- Rekonsiliasi harian
- Export laporan (CSV/PDF)

### Notifikasi
- Push notification untuk pengajuan persetujuan
- Broadcast message dari pimpinan

## 🛠️ Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Frontend** | Next.js (App Router) | 14.2.18 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 3.4.1 |
| **UI Components** | shadcn/ui | - |
| **Backend** | Next.js API Routes | - |
| **Database** | MySQL | 8.0 |
| **ORM** | Prisma | 5.22.0 |
| **Auth** | NextAuth.js | 4.24.15 |
| **Password Hash** | bcryptjs | 2.4.3 |
| **Validation** | Zod | 3.x |
| **Icons** | lucide-react | 1.x |
| **Charts** | Chart.js + react-chartjs-2 | - |
| **Form Handling** | react-hook-form | 7.x |

## 📦 Instalasi

### Prerequisites
- Node.js 18.x atau lebih baru
- MySQL 8.0
- npm

### Langkah Instalasi

```bash
# 1. Clone repository
git clone <repository-url>
cd alba-fintech-v3

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env.local

# 4. Edit .env.local dan sesuaikan dengan database Anda
nano .env.local
```

### Konfigurasi Database

```bash
# 5. Buat database MySQL
mysql -u root -p
CREATE DATABASE alba_finance_v3;
EXIT;

# 6. Push schema ke database
npx prisma db push

# 7. Generate Prisma Client
npx prisma generate
```

## 🏃 Cara Menjalankan

```bash
# Development server
npm run dev

# Buka di browser
http://localhost:3000
```

### Akun Demo

> Password default: `Bismillah123!`

| Email | Role | Unit |
|-------|------|------|
| `superadmin@alba.local` | SUPERADMIN | - |
| `pimpinan@alba.local` | PIMPINAN | - |
| `manager.kpk@alba.local` | MANAGER | KPAK |
| `manager.koperasi@alba.local` | MANAGER | Koperasi Buku |
| `staff.kantin@alba.local` | STAFF | Kantin Umi |

### Seed Data

```bash
# Run seed to populate default data
npx tsx scripts/seed.ts
```

## 🚀 Deploy

Lihat file `DEPLOY.md` untuk instruksi deployment ke Hostinger atau server lain.

## 📚 Dokumentasi

- [AGENTS.md](./AGENTS.md) — Panduan pengembangan
- [Memory.md](./MEMORY.md) — Catatan dan pengingat

## 🤝 Kontribusi

Aplikasi ini dikembangkan khusus untuk Pondok Pesantren Al-Basyariyah.

## 📝 License

MIT License — Developed by Muhammad Hamdan (@brontolano)

---
© 2024 Pondok Pesantren Al-Basyariyah
Jl. Mahmud, Rahayu, Kec. Margaasih, Kabupaten Bandung, Jawa Barat 40218
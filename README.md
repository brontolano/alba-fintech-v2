# ✨ ALBA Finance v3 — Sistem Manajemen Keuangan Pondok Pesantren

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D2743?style=for-the-badge&logo=prisma)](https://prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4472C4?style=for-the-badge&logo=mysql)](https://mysql.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth-4.24-0075FF?style=for-the-badge)](https://next-auth.js.org/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge)]()

> **ALBA Finance v3** adalah aplikasi manajemen keuangan & retail modern berbasis web yang dirancang khusus untuk **Pondok Pesantren Al-Basyariyah** (Bandung, Jawa Barat). Platform ini mengintegrasikan seluruh unit bisnis dan operasional pesantren dalam satu sistem keuangan terpusat secara real-time.

---

## 📑 Daftar Isi
- [📌 Fitur Utama](#-fitur-utama)
- [🏢 Struktur Pesantren & Unit](#-struktur-pesantren--unit)
- [🔐 Matriks Hak Akses (RBAC)](#-matriks-hak-akses-rbac)
- [🛠️ Tech Stack](#️-tech-stack)
- [💻 Panduan Instalasi Lokal](#-panduan-instalasi-lokal)
- [🌐 Panduan Deployment (Hostinger Shared / Node.js)](#-panduan-deployment-hostinger-shared--nodejs)
- [📂 Struktur Direktori Proyek](#-struktur-direktori-proyek)
- [🔑 Akun Demo (Seeding)](#-akun-demo-seeding)
- [🤝 Lisensi & Pengembang](#-lisensi--pengembang)

---

## 📌 Fitur Utama

- 📊 **Dashboard Real-Time & Virtual Cards**: Rekap kas, total pemasukan, dan pengeluaran tiap unit pesantren secara komprehensif.
- 💵 **Manajemen Transaksi Multi-Unit**: Pencatatan transaksi harian dengan dukungan unggah bukti nota/transfer.
- 🔄 **Workflow Persetujuan (Approval System)**: Verifikasi berjenjang untuk pengeluaran anggaran oleh Pimpinan/Manager.
- 🛒 **Point of Sale (POS) & Inventori**: Sistem kasir dan pencatatan stok barang khusus untuk unit retail (Koperasi & Kantin).
- 📑 **Catatan Keuangan Pimpinan (Financial Notes)**: Fitur khusus pimpinan untuk mencatat & merekonsiliasi transaksi strategis.
- 🏢 **Multi-Lembaga & Multi-Unit**: Mendukung hierarki cabang/lembaga dan unit usaha di bawahnya.
- 🔔 **Sistem Notifikasi & Broadcast**: Informasi real-time untuk pengguna dan pengumuman dari pimpinan.

---

## 🏢 Struktur Pesantren & Unit

```
Pondok Pesantren Al-Basyariyah (Lembaga Pusat)
  ├─ KPAK (Kantor Pelayanan Administrasi Keuangan)
  ├─ Koperasi Buku (Unit Retail)
  ├─ Kantin Umi (Unit Retail)
  └─ Kantin Baru (Unit Retail)
```

---

## 🔐 Matriks Hak Akses (RBAC)

| Role | Cakupan (Scope) | Deskripsi Hak Akses |
| :--- | :--- | :--- |
| **`SUPERADMIN`** | System-wide | Akses penuh: Manajemen User, COA, Pengaturan Lembaga & Unit, System Audit Log. |
| **`PIMPINAN`** | Lembaga-wide | Laporan gabungan seluruh unit, eksekusi approval, pencatatan Financial Notes, Broadcast. |
| **`MANAGER`** | Unit | Rekonsiliasi kas unit, kelola inventori & POS, approval pengeluaran staff unit. |
| **`STAFF`** | Unit | Input transaksi harian unit, operasional kasir POS, update stok barang. |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js (App Router), React 18, Tailwind CSS, shadcn/ui
- **Language**: TypeScript 5.x
- **Backend**: Next.js Route Handlers (API Routes)
- **Database & ORM**: MySQL 8.0, Prisma ORM 5.22
- **Authentication**: NextAuth.js (Session JWT + bcryptjs)
- **Charts & UI**: Chart.js, Lucide Icons, Sonner Toast

---

## 💻 Panduan Instalasi Lokal

### 1. Persyaratan Sistem
- Node.js versi 20.x atau 22.x LTS
- MySQL Database 8.0+
- npm v10.x+

### 2. Langkah-Langkah Setup

```bash
# Clone repository
git clone https://github.com/brontolano/alba-fintech-v2.git
cd alba-fintech-v3

# Install dependencies
npm install

# Salin konfigurasi environment
cp .env.example .env

# Generate Prisma Client & Push Schema
npx prisma generate
npx prisma db push

# Isikan data awal (Seeding)
npm run db:seed

# Jalankan server pengembangan
npm run dev
```

Akses aplikasi melalui browser di: `http://localhost:3000`

---

## 🌐 Panduan Deployment (Hostinger Shared / Node.js)

Aplikasi ini menggunakan fitur Next.js **Standalone Output** untuk optimasi resource memori di Hostinger Shared Hosting.

### 1. Konfigurasi Database & Environment
Pastikan file `.env.production` diisi dengan benar:
```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/DATABASE_NAME"
NEXTAUTH_URL="https://domain-anda.com"
NEXTAUTH_SECRET="your-32-character-random-secret"
NODE_ENV="production"
```
> *Catatan: Gunakan `localhost` sebagai database host di Hostinger (bukan `127.0.0.1`).*

### 2. Build & Preparation
Jalankan perintah ini di lokal / CI-CD runner:
```bash
npm run build
npm run deploy:prepare
```
Folder `deploy-package/` siap diunggah ke File Manager Hostinger.

### 3. Pengaturan hPanel Hostinger
- **Node.js Version**: 20.x atau 22.x
- **Application Startup File**: `server.js`
- **Application Mode**: Production

---

## 📂 Struktur Direktori Proyek

```
alba-fintech-v3/
├─ app/                  # Next.js App Router (Halaman & API Routes)
│  ├─ api/               # API Endpoint (Auth, Transactions, Users, dll)
│  ├─ dashboard/         # Halaman Dashboard & Modul Operasional
│  ├─ global-error.tsx   # Handlers Error Global
│  └─ layout.tsx         # Root Layout & Provider
├─ components/           # Reusable UI & Layout Components
├─ lib/                  # Prisma Client Instance & Helper Utility
├─ prisma/               # Schema Prisma & Migration Setup
├─ public/               # Asset Statis (Logo, Favicon, Icons)
├─ scripts/              # Seed scripts & Build Deployment Preparator
├─ proxy.ts              # Next.js Middleware/Proxy Handler (Auth Route Guard)
└─ server.js             # Custom Entrypoint untuk Hostinger Standalone Mode
```

---

## 🔑 Akun Demo (Seeding)

Password default untuk semua akun demo: **`Bismillah123!`**

| Role | Email | Unit / Akses |
| :--- | :--- | :--- |
| **SUPERADMIN** | `superadmin@alba.local` | Semua Unit & Settings |
| **PIMPINAN** | `pimpinan@alba.local` | Seluruh Pesantren Al-Basyariyah |
| **MANAGER** | `manager.kpk@alba.local` | Unit KPAK |
| **STAFF** | `staff.kantin@alba.local` | Unit Kantin |

---

## 🤝 Lisensi & Pengembang

Dikembangkan oleh **Muhammad Hamdan** ([@brontolano](https://github.com/brontolano)) untuk **Pondok Pesantren Al-Basyariyah**.

Hak Cipta © 2024–2026 ALBA Finance v3. All Rights Reserved.

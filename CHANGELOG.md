# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [7.0.0] - 2026-09-19

### Added

- Dashboard role-based UI refinement for SUPERADMIN, PIMPINAN, MANAGER, and STAFF
- Improved compact fintech style across dashboard cards, list rows, and summary widgets
- Finalized transaction list layout and compact filter patterns
- Added approval flow and reporting refinements for finance operations
- Added status and acceptance documentation for final review
- Added dashboard support for better data readability and cleaner segmentation

### Changed

- Updated project version metadata from v5 to v7
- Refined visual consistency across core modules: dashboard, transactions, reports, financial notes
- Improved readability and spacing for finance data-heavy pages
- Standardized UI language across role dashboards and key screens
- Updated README branding and version badge to reflect v7 development release

### Fixed

- Improved transaction page filter interaction and compact layout behavior
- Corrected inconsistencies in dashboard card hierarchy and content density
- Aligned approval and reporting flows with the business logic used in the app
- Stabilized release state for local QA and production build validation

### Verified

- `npm run build` completed successfully
- Prisma generation succeeded
- Core app routes were generated correctly
- Local runtime checks returned successful HTTP status on key endpoints

---

## [1.1.0] - 2026-09-13

### Added

- Sistem manajemen keuangan untuk Pondok Pesantren Al-Basyariyah
- Dashboard real-time dengan laporan keuangan
- Manajemen transaksi dengan bukti foto
- Workflow persetujuan multi-level
- Point of Sale (POS) untuk unit retail
- Inventaris barang dengan manajemen stok
- Rekonsiliasi keuangan bulanan
- Sistem notifikasi dan broadcast pesan
- Tema gelap/matahari senang dengan preview langsung
- Settings penyimpanan di database dengan localStorage fallback

### Features

- **Roles**: SUPERADMIN, PIMPINAN, MANAGER, STAFF dengan hak akses berbeda
- **Transaksi**: Pencatatan pemasukan, pengeluaran, transfer
- **Approval**: Workflow persetujuan dengan status DRAFT → PENDING → APPROVED/REJECTED
- **Inventory**: Kelola stok barang, foto produk
- **POS**: Sistem kasir untuk koperasi dan kantin
- **Reports**: Laporan keuangan berdasarkan unit
- **Reconciliation**: Rekonsiliasi transaksi bulanan
- **Settings**: Pengaturan tema, warna, notifikasi

### Tech Stack

- Next.js 16.3 (App Router)
- TypeScript 5.x
- Tailwind CSS 3.4 + shadcn/ui
- Prisma 5.x dengan MySQL 8.0
- NextAuth.js 4.24 dengan JWT
- bcryptjs untuk hashing password
- Zod untuk validasi data
- lucide-react untuk ikon

### Deployment

- Siap deploy ke Hostinger dengan `npm run build`
- Output: standalone Next.js dengan semua dependencies
- File: server.js, next-server.js, .env.production, prisma/schema.prisma

---

## [1.0.0] - 2024-2025

### Initial Release

- Setup proyek Next.js dengan struktur App Router
- Integrasi Prisma dengan MySQL
- Sistem autentikasi dengan NextAuth.js
- Dasbor utama dengan statistik keuangan
- Modul transaksi dasar
- Manajemen pengguna dan unit

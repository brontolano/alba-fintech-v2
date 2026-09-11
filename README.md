# 📘 ALBA Finance v3 — User Guide (Dokumentasi Publik)

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D2743?style=for-the-badge&logo=prisma)](https://prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4472C4?style=for-the-badge&logo=mysql)](https://mysql.com/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth-4.24-0075FF?style=for-the-badge)](https://next-auth.js.org/)
[![v1.1.0](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/brontolano/alba-fintech-v2)

---

## 🏢 Apa itu ALBA Finance v3?

**ALBA Finance v3** adalah platform manajemen keuangan berbasis web yang dirancang khusus untuk **Pondok Pesantren Al-Basyariyah** (Bandung, Jawa Barat). Platform ini mengintegrasikan seluruh unit bisnis dan operasional pesantren dalam satu sistem keuangan terpusat secara real-time.

### Struktur Organisasi
```
Pondok Pesantren Al-Basyariyah (Lembaga Pusat)
  ├─ KPAK (Kantor Pelayanan Administrasi Keuangan)
  ├─ Koperasi Buku (Unit Retail)
  ├─ Kantin Umi (Unit Retail)
  └─ Kantin Baru (Unit Retail)
```

---

## 📌 Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 📊 Dashboard Real-Time | Rekap kas, total pemasukan, dan pengeluaran tiap unit pesantren |
| 💵 Manajemen Transaksi | Pencatatan transaksi harian dengan unggah bukti nota/transfer |
| 🔄 Workflow Persetujuan | Verifikasi berjenjang untuk pengeluaran anggaran |
| 🛒 Point of Sale (POS) | Sistem kasir + pencatatan stok untuk unit retail (Koperasi & Kantin) |
| 📑 Catatan Keuangan Pimpinan | Fitur khusus pimpinan untuk merekonsiliasi transaksi strategis |
| 🔔 Notifikasi & Broadcast | Informasi real-time & pengumuman dari pimpinan |

---

## 🔐 Peran & Hak Akses

| Role | Cakupan | Akses |
|------|---------|-------|
| **SUPERADMIN** | Global | CRUD semua, settings, user management |
| **PIMPINAN** | Lembaga | Lihat laporan semua unit, rekonsiliasi, broadcast |
| **MANAGER** | Unit | Transaksi harian, inventory, POS, approval |
| **STAFF** | Unit | CRUD transaksi, POS, inventori |

---

## 🔑 Akun Demo

> Password default: **`Bismillah123!`**

| Role | Email | Unit |
|------|-------|------|
| **SUPERADMIN** | `superadmin@alba.local` | Semua Unit |
| **PIMPINAN** | `pimpinan@alba.local` | Seluruh Pesantren |
| **MANAGER** | `manager.kpk@alba.local` | Unit KPAK |
| **STAFF** | `staff.kantin@alba.local` | Unit Kantin |

### Akun Produksi (Live)
Setelah reset database:
| Role | Email | Password |
|------|-------|----------|
| **SUPERADMIN** | `admin@brontolano.com` | `bismillah` |

---

## 📱 Panduan Penggunaan

1. Buka https://alba.brontolano.com
2. Login dengan email & password sesuai peran
3. Dashboard akan menampilkan ringkasan keuangan unit Anda
4. Navigasi melalui sidebar untuk mengakses fitur:
   - **Transaksi** — catat pemasukan/pengeluaran
   - **Approval** — kelola permintaan persetujuan
   - **Inventori/POS** — kelola stok & jual barang
   - **Laporan** — lihat laporan keuangan
   - **Rekonsiliasi** — rekonsiliasi bulanan
   - **User/Settings** (hanya SUPERADMIN) — kelola akun & unit

---

## 🤖 Goose Recipes (Pengembangan)

ALBA Finance v3 dilengkapi dengan resep (recipes) untuk membantu pengembangan menggunakan [Goose AI](https://goose-docs.ai/).

### 📁 Struktur Recipes
```
recipes/
├─ development.yaml          # Asisten pengembangan utama
└─ subrecipes/
   ├─ type-check.yaml       # Type checking TypeScript
   ├─ build.yaml           # Build produksi
   └─ database.yaml        # Manajemen database
```

### 🚀 Cara Menggunakan

#### Dari CLI
```bash
# Mulai sesi pengembangan
goose run --recipe recipes/development.yaml --params action=type-check

# Build produksi
goose run --recipe recipes/subrecipes/build.yaml --params skip_lint=false

# Database sync
goose run --recipe recipes/subrecipes/database.yaml --params action=push
```

#### Custom Slash Commands
Konfigurasi di `goose.config.yaml`:
```yaml
slash_commands:
  - command: "develop"
    recipe_path: "./recipes/development.yaml"
  - command: "build"
    recipe_path: "./recipes/subrecipes/build.yaml"
  - command: "db"
    recipe_path: "./recipes/subrecipes/database.yaml"
```

### 📋 Langkah Penggunaan
1. Pastikan [Goose terinstal](https://goose-docs.ai/docs/getting-started/installation)
2. Konfigurasi provider AI di `goose.config.yaml`
3. Jalankan `goose run --recipe recipes/development.yaml`
4. Pilih aksi yang diinginkan dari menu dropdown

### 📝 Konfigurasi Goose
- `goose.config.yaml` - Konfigurasi utama (model, provider, slash commands)
- `secrets.yaml.example` - Template file konfigurasi rahasia (copy ke `secrets.yaml` dan sesuaikan)

---

## 📞 Dukungan

Jika ada kendala teknis, hubungi:
- **Email:** admin@brontolano.com
- **GitHub Issues:** https://github.com/brontolano/alba-fintech-v2/issues

---

<p align="center">
Dikembangkan oleh <strong>Muhammad Hamdan</strong> (<a href="https://github.com/brontolano">@brontolano</a>) untuk <strong>Pondok Pesantren Al-Basyariyah</strong>.
<br>Hak Cipta © 2024–2026 ALBA Finance v3. All Rights Reserved.
</p>

---

> ℹ️ Dokumentasi teknis (untuk developer): lihat **[DOKUMENTASI-TEKNIS.md](./docs/DOKUMENTASI-TEKNIS.md)**
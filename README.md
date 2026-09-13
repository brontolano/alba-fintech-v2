# 📘 ALBA Finance v3

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D2743?style=for-the-badge&logo=prisma)](https://prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4472C4?style=for-the-badge&logo=mysql)](https://mysql.com/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth-4.24-0075FF?style=for-the-badge)](https://next-auth.js.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![v1.1.0](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/brontolano/alba-fintech-v3)

> Platform manajemen keuangan berbasis web untuk **Pondok Pesantren Al-Basyariyah** (Bandung, Jawa Barat).  
> Satukan pencatatan transaksi, workflow persetujuan, rekonsiliasi, inventori, dan point of sale (POS) seluruh unit pesantren dalam satu sistem terpusat real-time.

---

## 🏢 Apa itu ALBA Finance v3?

Sistem informasi keuangan (**ALBA Finance v3**) dirancang khusus untuk menata kelola keuangan Pondok Pesantren Al-Basyariyah secara terintegrasi. Sistem mendukung struktur organisasi multi-unit:

```
Pondok Pesantren Al-Basyariyah (Lembaga Pusat)
  ├─ KPAK          (Kantor Pelayanan Administrasi Keuangan)
  ├─ Koperasi Buku (Unit Retail)
  ├─ Kantin Umi    (Unit Retail)
  └─ Kantin Baru   (Unit Retail)
```

---

## ✨ Fitur

| Fitur | Deskripsi |
|-------|-----------|
| 📊 **Dashboard Real-Time** | Ringkasan kas, pemasukan, dan pengeluaran per unit |
| 💵 **Manajemen Transaksi** | Pencatatan harian dengan unggah bukti nota/transfer (draft → pending → approved) |
| 🔄 **Workflow Persetujuan** | Verifikasi berjenjang melalui model `Approval` |
| 🛒 **Point of Sale (POS)** | Sistem kasir + pencatatan stok untuk unit retail (Koperasi & Kantin) |
| 📑 **Catatan Keuangan Pimpinan** | Rekonsiliasi transaksi strategis milik pimpinan |
| 🧾 **Inventori** | Kelola stok barang, harga beli, dan stok minimum |
| 🏦 **Rekening Bank** | Kolom kas/bank/e-wallet dengan saldo otomatis |
| 🔔 **Notifikasi & Broadcast** | Informasi real-time dan pengumuman dari pimpinan |
| 🗂️ **Master Data** | Lembaga, Unit, Kategori Keuangan (COA), Pengguna |

---

## 🔐 Peran & Hak Akses

| Role | Cakupan | Akses |
|------|---------|-------|
| **SUPERADMIN** | Global | CRUD semua, settings, COA, user & unit management |
| **PIMPINAN** | Lembaga-wide | Lihat laporan semua unit, catat pemasukan/pengeluaran, broadcast, approval |
| **MANAGER** | Unit | Rekonsiliasi, inventory, POS, transaksi harian |
| **STAFF** | Unit | CRUD transaksi harian, POS, inventori |

> Hak akses diperiksa di tiap API route melalui helper role-check middleware.

---

## 🔑 Akun Demo (Hasil Seed)

 Password default semua akun: **`Bismillah123!`**

| Role | Email | Unit |
|------|-------|------|
| **SUPERADMIN** | `superadmin@alba.local` | Seluruh Pesantren |
| **PIMPINAN** | `pimpinan@alba.local` | Seluruh Pesantren |
| **MANAGER** | `manager.kpk@alba.local` | KPAK |
| **MANAGER** | `manager.koperasi@alba.local` | Koperasi Buku |
| **STAFF** | `staff.kantin@alba.local` | Kantin |

📥 Seed dilakukan via `npm run db:seed` (membuat lembaga, 4 unit, dan 5 akun di atas).

---

## ⚙️ Setup Pengembangan

### Prasyarat
- **Node.js** 20.x LTS (lihat `package.json` → `engines`)
- **npm** 10.x
- **MySQL** 8.0 (lokal atau remote)

### Langkah demi langkah
```bash
# 1. Clone & install dependencies
git clone https://github.com/brontolano/alba-fintech-v3.git
cd alba-fintech-v3
npm install

# 2. Salin & konfigurasi environment
cp .env.example .env.local
# Edit .env.local → isi DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET

# 3. Generate Prisma Client
npx prisma generate

# 4. Push schema & seed data
npx prisma db push
npm run db:seed

# 5. Jalankan development server
npm run dev
# Buka https://localhost:3000  → login dengan akun demo di atas
```

### Environment Variables (`.env.local`)
| Variable | Keterangan |
|----------|-----------|
| `DATABASE_URL` | MySQL connection string |
| `NEXTAUTH_URL` | URL aplikasi (dev: `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_EMAIL` / `NEXTAUTH_PASSWORD` | Akun demo fallback |
| `NODE_ENV` | `development` \| `production` |
| `NEXT_PUBLIC_*` | Konfigurasi klien (nama app, mata uang IDR, locale) |

---

## 🗂️ Struktur Proyek

```
.
├─ app/                  # Next.js 16 App Router
│  ├─ api/               # API Routes (Route Handlers)
│  │  ├─ auth/[...nextauth]/   # NextAuth.js
│  │  ├─ transactions/   ├─ financial-notes/
│  │  ├─ financial-categories/  ├─ units/         ├─ users/
│  │  ├─ approvals/     ├─ inventory/   ├─ pos/      ├─ reports/
│  │  ├─ lembaga/      ├─ notifications/ ├─ settings/  ├─ upload/
│  │  └─ reset-users/   └─ dashboard/aggregates & reports/aggregations
│  ├─ dashboard/        # Halaman UI (account, approvals, inventory,
│  │                     #   pos, pos, reconciliation, reports, settings,
│  │                     #   transactions, units, users)
│  └─ login/, health/, layout.tsx, page.tsx, globals.css
├─ components/           # UI: auth, charts, layout (Header/MobileNav/Sidebar),
│                         #   providers, ui (shadcn/ui + PerformanceGuard)
├─ lib/                  # prisma.ts (singleton Prisma client)
├─ prisma/               # schema.prisma, migrations, schema-v3.prisma (archive)
├─ scripts/              # seed.ts, reset-users.ts, deploy-prepare.mjs
├─ docs/                 # DEPLOY.md, DEPLOY_GUIDE.md, AUDIT-DEPLOY-HOSTINGER.md,
│                         #   DOKUMENTASI-TEKNIS.md
├─ server.js             # Custom entry point (Hostinger standalone wrapper)
└─ AGENTS.md             # Aturan Next.js agent (otomatis oleh `next dev`)
```

### API Endpoints (Ringkas)
| Method | Endpoint | Role |
|--------|----------|------|
| GET  | `/api/units`, `/api/users`, `/api/transactions` | Authenticated |
| POST | `/api/transactions`, `/api/financial-notes`, `/api/approvals` | MANAGER/STAFF/PIMPINAN/SUPERADMIN |
| PATCH | `/api/approvals/[id]`, `/api/transactions/[id]` | SUPERADMIN/PIMPINAN/MANAGER |
| GET  | `/api/reports/aggregations`, `/api/dashboard/aggregates` | PIMPINAN/SUPERADMIN |
| GET  | `/health` | Public (monitoring) |

---

## 🧪 Keamanan & Type Check

```bash
npm run type-check      # tsc --noEmit  (0 error diperkirakan)
npm run build           # prisma generate && next build (produksi)
```

Pre-commit checklist:
- `npx tsc --noEmit` — 0 error
- `npm run build` — sukses
- Perubahan skema → `npx prisma generate`

---

## 🚀 Deployment

Aplikasi deploy ke **Hostinger** sebagai standalone Node.js. Lihat [`docs/DEPLOY.md`](./docs/DEPLOY.md) untuk panduan lengkap.

```bash
npm install
npm run build
node scripts/deploy-prepare.mjs   # menghasilkan deploy-package/
```

`deploy-package/` berisi: `server.js` (wrapper), `next-server.js` (standalone), `.env.production`, `.next/static/`, `node_modules/` (minimal + Prisma engine), `prisma/schema.prisma`, `public/`.

- **Node.js version**: 20.x LTS
- **Startup file**: `server.js`
- **Endpoint health**: `https://<domain>/health` → `{"status":"ok","timestamp":"..."}``

### Reset database (dev)
```bash
npm run db:reset    # migrate reset + seed
```

---

## 🤖 Pengembangan Terbantu AI

Repositori dilengkapi dengan berkas `AGENTS.md` yang berisi aturan dan konteks pengembangan aplikasi (diperbarui otomatis oleh `next dev`). Ikuti petunjuk di `AGENTS.md` sebelum menulis kode, terutama soal:
- Penanganan `system_settings` yang mungkin tidak ada di remote MySQL (`P2021` → fallback ke default)
- Theme persistence via CSS variables (`--primary`, `--ring`) + `dark` class pada `useEffect`
- Fallback tema di `localStorage` ketika DB tidak tersedia

---

## 📞 Dukungan

- **Email:** admin@brontolano.com
- **GitHub Issues:** https://github.com/brontolano/alba-fintech-v3/issues
- **Dokumentasi teknis:** [`docs/DOKUMENTASI-TEKNIS.md`](./docs/DOKUMENTASI-TEKNIS.md)

---

<p align="center">
Dikembangkan oleh <strong>Muhammad Hamdan</strong> (<a href="https://github.com/brontolano">@brontolano</a>) untuk <strong>Pondok Pesantren Al-Basyariyah</strong>.
<br>Hak Cipta © 2024–2026 ALBA Finance v3. All Rights Reserved.
</p>

## ✨ ALBA Finance v2 — Enterprise Financial Management System

![ALBA Finance v2](https://img.shields.io/badge/ALBA%20Finance-v2.0-blue?style=for-the-badge&logo=typescript)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.18-black?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19.3-2D2743?style=flat-square&logo=prisma)](https://prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4472C4?style=flat-square&logo=mysql)](https://mysql.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)](https://github.com/brontolano/alba-fintech-v2/actions)

> **ALBA Finance v2** adalah sistem manajemen keuangan berbasis web yang dirancang khusus untuk pesantren dan organisasi non-profit. Sistem ini mendukung pencatatan transaksi, pencatatan buku besar, manajemen unit, persetujuan transaksi (approval workflow), pencatatan keuangan pimpinan, dan broadcast/push notification.

---

## 📑 Daftar Isi

- [✨ ALBA Finance v2](#-alba-finance-v2)
- [📑 Daftar Isi](#-daftar-isi)
- [🚀 Fitur](#-fitur)
- [🛠️ Tech Stack](#️-tech-stack)
- [📦 Instalasi](#-instalasi)
- [🔧 Konfigurasi](#-konfigurasi)
- [🏃 Cara Menjalankan](#-cara-menjalankan)
- [🚀 Deploy ke Hostinger](#-deploy-ke-hostinger)
- [📚 API Endpoints](#-api-endpoints)
- [👥 Demo Accounts](#-demo-accounts)
- [🔐 Role & Permission](#-role--permission)
- [📱 PWA Support](#-pwa-support)
- [📝 License](#-license)

---

## 🚀 Fitur

### Manajemen Transaksi
- Create, Read, Update, Delete transaksi keuangan
- Dukungan tipe transaksi: INCOME (pemasukan) dan EXPENSE (pengeluaran)
- Workflow persetujuan (approve/reject) untuk transaksi
- Filter berdasarkan unit, tanggal, tipe, dan status

### Buku Besar Dinamis
- Chart of Accounts (COA) yang dinamis dan terhubung ke database
- Trial Balance otomatis
- Journal Entry display
- Laporan keuangan berdasarkan periode

### Manajemen Unit & User
- Multi-unit organizational structure
- Hierarki Lembaga → Unit (Lembaga = induk dari Unit)
- Unit type: Sederhana (laporan keuangan) dan Retail (laporan keuangan + Inventory + POS)
- Role-based access control (SUPERADMIN, PIMPINAN, MANAGER, STAFF)
- User management dengan status aktif/non-aktif
- Pimpinan dapat melihat laporan keseluruhan berdasarkan unit, tanggal, jenis
- User terhubung ke lembaga untuk akses scope yang tepat

### Pencatatan Keuangan Pimpinan
- Pimpinan dapat mencatat pemasukan/pengeluaran langsung
- Manager dapat melakukan rekonsiliasi laporan menjadi catatan keuangan pimpinan
- Filtering berdasarkan unit, tanggal, dan jenis catatan
- Ringkasan (summary cards) untuk total pemasukan, pengeluaran, dan net

### Sistem Broadcast/Push Notification
- Pimpinan dapat mengirim notifikasi ke seluruh pengguna
- AI Assistant dapat membantu membuat draft broadcast
- Dukungan prioritas: LOW, NORMAL, HIGH, URGENT
- Tracking penerimaan notifikasi per user

### Point of Sale (POS)
- Interfeis kasir modern
- Keranjang belanja (cart) dengan manajemen kuantitas
- Pemilihan unit dan catatan transaksi

### Asisten AI
- Chat berbasis AI untuk bantuan keuangan
- Deteksi kata kunci broadcast dan generasi draft otomatis
- Komposer broadcast dengan modal konfirmasi sebelum kirim
- Response yang konsisten dan terstandardisasi
- Error handling yang jelas

---

## 🛠️ Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Frontend** | Next.js (App Router) | 14.2.18 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS + shadcn/ui | 3.4.1 |
| **Backend** | Next.js API Routes | - |
| **Database** | MySQL | 8.0 |
| **ORM** | Prisma | 6.19.3 |
| **Auth** | NextAuth.js | 4.24.15 |
| **Password Hash** | bcryptjs | 6.x |
| **Validation** | Zod | 3.x |
| **Icons** | lucide-react | 0.455.1 |
| **PWA** | next-pwa + Custom SW | - |
| **Package Manager** | npm | - |

---

## 📦 Instalasi

### Prerequisites

- Node.js 18.x atau lebih baru
- MySQL 8.0
- npm / pnpm

### Langkah Instalasi

```bash
# 1. Clone repository
git clone https://github.com/brontolano/alba-fintech-v2.git
cd alba-fintech-v2

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env.local

# 4. Edit .env.local dan sesuaikan dengan database Anda
nano .env.local
```

---

## 🔧 Konfigurasi

### Environment Variables (`.env.local`)

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/alba_finance_v2"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="base64-32-byte-random-secret"

# Auth Credentials
NEXTAUTH_EMAIL="admin@alba.local"
NEXTAUTH_PASSWORD="bismillah"

# Environment
NODE_ENV="development"
```

> 📖 Buka `.env.example` untuk dokumentasi lengkap semua environment variables

---

## 🏃 Cara Menjalankan

```bash
# 1. Jalankan migrasi database
npx prisma migrate dev --name init

# 2. Seed data awal (demo accounts)
node scripts/seed-local.cjs

# 3. Generate Prisma Client
npx prisma generate

# 4. Jalankan development server
npm run dev

# 5. Buka di browser
https://localhost:3000
```

---

## 🚀 Deploy ke Hostinger

### Prasyarat

- Akun Hostinger dengan dukungan Node.js
- Database MySQL
- Akses hPanel

### Langkah Deploy

```bash
# 1. Jalankan script deploy preparation
node scripts/deploy-prepare.mjs

# 2. Upload file-file ini ke server Hostinger:
#    - .next/                  (build output)
#    - prisma/                 (schema + migrations)
#    - package.json
#    - package-lock.json
#    - .env.production          (environment variables)

# 3. Atur environment variables di hPanel
#    Salin dari .env.example

# 4. Jalankan di server:
npm install
npx prisma generate
npx prisma migrate deploy

# 5. Restart aplikasi di hPanel
```

### Build Command

```bash
npm run build
```

### Start Command

```bash
npm start
```

---

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/auth/session` | Get current session | Public |

### Units
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/units` | List all units | SUPERADMIN, PIMPINAN, MANAGER, STAFF |
| POST | `/api/units` | Create new unit | SUPERADMIN |
| GET | `/api/units/:id` | Get single unit | SUPERADMIN, PIMPINAN, MANAGER, STAFF |
| PATCH | `/api/units/:id` | Update unit | SUPERADMIN |
| DELETE | `/api/units/:id` | Delete unit | SUPERADMIN |

### Users
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/users` | List all users | SUPERADMIN, PIMPINAN, MANAGER |
| POST | `/api/users` | Create new user | SUPERADMIN |
| GET | `/api/users/:id` | Get single user | SUPERADMIN, PIMPINAN, MANAGER |
| GET | `/api/users/permissions` | Get available permissions | SUPERADMIN, PIMPINAN, MANAGER |

### Transactions
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/transactions` | List transactions | PIMPINAN, MANAGER, STAFF |
| POST | `/api/transactions` | Create transaction | PIMPINAN, MANAGER, STAFF |
| GET | `/api/transactions/:id` | Get transaction detail | PIMPINAN, MANAGER, STAFF |
| PATCH | `/api/transactions/:id` | Update transaction | SUPERADMIN, PIMPINAN (status only) |

### Approvals
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/approvals` | List approval requests | SUPERADMIN, PIMPINAN, MANAGER, STAFF |
| POST | `/api/approvals` | Approve/reject transaction | SUPERADMIN, PIMPINAN |

### Accounts (COA)
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/accounts` | List chart of accounts | All authenticated users |
| POST | `/api/accounts` | Create account | SUPERADMIN |

### Financial Notes
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/financial-notes` | List financial notes (filtered by role) | PIMPINAN, MANAGER |
| POST | `/api/financial-notes` | Create financial note | PIMPINAN, MANAGER |

### Broadcasts
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/broadcasts` | List broadcast messages | All authenticated users |
| POST | `/api/broadcasts` | Create draft or send broadcast | PIMPINAN (send), all roles (draft) |

### AI
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/api/ai/chat` | AI chat with broadcast draft suggestion | PIMPINAN, MANAGER |

---

## 👥 Demo Accounts

> **Password default untuk semua akun demo: `bismillah`**

| Email | Role | Unit | Keterangan |
|-------|------|------|------------|
| superadmin@alba.local | SUPERADMIN | - | Akses penuh ke seluruh sistem |
| pimpinan@alba.local | PIMPINAN | Unit A | Persetujuan transaksi + laporan |
| manager@alba.local | MANAGER | Unit A | Manajemen transaksi + laporan unit |
| staff@alba.local | STAFF | Unit A | Input transaksi harian |

---

## 🔐 Role & Permission

| Role | Transaksi | Persetujuan | User Mgmt | Unit Mgmt | COA | Laporan |
|------|-----------|-------------|-----------|-----------|-----|---------|
| **SUPERADMIN** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **PIMPINAN** | ✅ View | ✅ Approve/Reject | 🚫 | 🚫 | ✅ View | ✅ Full |
| **MANAGER** | ✅ Full | ✅ View | ✅ View | 🚫 | ✅ View | ✅ Unit Report |
| **STAFF** | ✅ Create/View | ✅ View Own | 🚫 | 🚫 | ✅ View | 🚫 |

---

## 📱 PWA Support

ALBA Finance v2 mendukung Progressive Web App (PWA) yang memungkinkan:

- **Instalasi** di perangkat pengguna (homescreen)
- **Offline mode** — layanan tetap dapat diakses saat offline (data cached)
- **Service worker** untuk caching dan background sync
- **Responsive design** — beradaptasi dengan semua ukuran layar

### File PWA
| File | Deskripsi |
|------|-----------|
| `public/manifest.json` | Konfigurasi PWA (nama, ikon, tema) |
| `public/sw.js` | Service worker untuk caching |
| `public/offline.html` | Halaman fallback saat offline |
| `public/icons/icon-192x192.svg` | Ikon PWA 192px |
| `public/icons/icon-512x512.svg` | Ikon PWA 512px |

---

## 📝 License

Project ini dilisensikan di bawah lisensi MIT.

---

## 🙏 Acknowledgments

- Developed by Muhammad Hamdan (@brontolano)
- Built with Next.js, Prisma, dan Tailwind CSS
- Inspired by the needs of pesantren financial management

---
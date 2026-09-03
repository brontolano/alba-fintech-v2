# ✨ ALBA Finance v3 — Aplikasi Keuangan Pondok Pesantren Al-Basyariyah

[![Next.js](https://img.shields.io/badge/Next.js-14.2.18-black?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D2743?style=flat-square&logo=prisma)](https://prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4472C4?style=flat-square&logo=mysql)](https://mysql.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth-4.24-0075FF?style=flat-square)](https://next-auth.js.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)

> **ALBA Finance v3** adalah sistem manajemen keuangan berbasis web yang dirancang khusus untuk **Pondok Pesantren Al-Basyariyah** di Jl. Mahmud, Rahayu, Kec. Margaasih, Kabupaten Bandung, Jawa Barat 40218.

## 📋 Deskripsi Singkat

Aplikasi ini dikembangkan untuk membantu pimpinan pondok pesantren mengelola keuangan dengan baik. Sistem terintegrasi 4 unit ke dalam satu platform real-time dengan fitur:

- **Pencatatan transaksi** real-time per unit
- **Virtual card** per unit pada dashboard pimpinan  
- **Filter & sortir** yang fleksibel untuk laporan
- **Workflow persetujuan** pengeluaran
- **Rekonsiliasi harian** per unit
- **Inventori & POS** untuk unit retail
- **Upload bukti transaksi** (foto nota)
- **Push notifications** real-time

## 🏗️ Struktur Organisasi

```
Pondok Pesantren Al-Basyariyah
├─ KPAK (Kantor Pelayanan Administrasi Keuangan)
├─ Koperasi Buku (Unit Retail)
├─ Kantin Umi (Unit Retail)
└─ Kantin Baru (Unit Retail)
```

## 🎯 Role Matrix

| Role | Akses |
|------|-------|
| **SUPERADMIN** | CRUD semua, settings, COA, user management |
| **PIMPINAN** | Lihat laporan semua unit, catat pemasukan/pengeluaran, approval |
| **MANAGER** | Rekonsiliasi, inventory, POS, transaksi harian per unit |
| **STAFF** | CRUD transaksi harian, POS, inventory per unit |

## 🛠️ Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Frontend | Next.js (App Router) | 14.2.18 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.4.1 |
| Backend | Next.js API Routes | - |
| Database | MySQL | 8.0 |
| ORM | Prisma | 5.22.0 |
| Auth | NextAuth.js | 4.24.15 |
| Password Hash | bcryptjs | 2.4.3 |
| Validation | Zod | 3.x |
| Icons | lucide-react | 1.x |
| Charts | Chart.js + react-chartjs-2 | 4.x |
| Form | react-hook-form | 7.x |
| Notification | sonner | 2.x |

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x+
- MySQL 8.0
- npm 9.x+

### Installation

```bash
# 1. Clone repository
git clone https://github.com/brontolano/alba-fintech-v2.git
cd alba-fintech-v3

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.local.example .env.local

# 4. Configure database
# Edit .env.local with your MySQL credentials
```

### Database Setup

```bash
# 5. Generate Prisma client
npx prisma generate

# 6. Push schema ke database
npx prisma db push

# 7. Seed data (optional)
npx tsx scripts/seed.ts
```

### Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### Build & Start Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├─ app/
│  ├─ api/              # API Routes
│  │  ├─ auth/[...nextauth]
│  │  ├─ transactions/
│  │  ├─ users/
│  │  ├─ approvals/
│  │  └─ ...
│  ├─ dashboard/
│  │  ├─ page.tsx
│  │  ├─ transactions/
│  │  ├─ reports/
│  │  └─ ...
│  └─ login/page.tsx
├─ components/
│  ├─ layout/
│  ├─ charts/           # Chart components (client)
│  └─ ui/
├─ lib/
│  └─ prisma.ts
└─ prisma/
   └─ schema.prisma
```

## 🔐 Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL connection string |
| `NEXTAUTH_URL` | Production URL |
| `NEXTAUTH_SECRET` | Random secret (generate with: `openssl rand -base64 32`) |

### Optional
| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_NAME` | ALBA Finance v3 | App name |
| `NEXT_PUBLIC_CURRENCY` | IDR | Currency format |
| `NEXT_PUBLIC_LOCALE` | id-ID | Locale format |

### Example (Production - Hostinger)
```env
DATABASE_URL="mysql://u826712707_alba:B-5millahberkah@srv594.hstgr.io:3306/u826712707_alba"
NEXTAUTH_URL="https://alba.brontolano.com"
NEXTAUTH_SECRET="5sUxGk0kNdABjvWPF7SxAkaGoWwDppKlC-LVDOFhpbE"
```

## 🔑 Login Akun Demo

> Password default: `Bismillah123!`

| Role | Email | Password |
|------|-------|----------|
| SUPERADMIN | `superadmin@alba.local` | `Bismillah123!` |
| PIMPINAN | `pimpinan@alba.local` | `Bismillah123!` |
| MANAGER | `manager.kpk@alba.local` | `Bismillah123!` |
| STAFF | `staff.kantin@alba.local` | `Bismillah123!` |

## 🚀 Deployment (Hostinger)

Lihat [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) untuk panduan lengkap deployment ke Hostinger.

### GitHub Actions Auto-Deploy
Setiap push ke branch `main` akan otomatis build dan deploy ke Hostinger.

Setup required secrets di GitHub:
- `HOSTINGER_FTP_HOST`
- `HOSTINGER_FTP_USERNAME`
- `HOSTINGER_FTP_PASSWORD`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DATABASE_URL`

## 🧪 Testing Locally

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signin` | Sign in |
| GET | `/api/auth/session` | Get session |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions` | Create transaction (with photo upload) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| GET | `/api/users/profile` | Get current user profile |
| POST | `/api/users/profile/upload` | Upload profile photo |
| POST | `/api/users/change-password` | Change password |

### Units
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/units` | List all units |

### Approvals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/approvals` | List approvals |
| PATCH | `/api/approvals/[id]` | Approve/Reject |

## 📊 API Usage Examples

### Create Transaction with Photo
```bash
curl -X POST https://alba.brontolano.com/api/transactions \
  -H "Cookie: next-auth.session-token=..." \
  -F "type=INCOME" \
  -F "amount=100000" \
  -F "description=Gaji" \
  -F "date=2024-01-15" \
  -F "photo=@bukti.jpg"
```

## 🤝 Contribute

Kolaborasi diterima! Silakan buat issue atau pull request.

## 📝 License

MIT License — Developed by Muhammad Hamdan (@brontolano)

© 2024 Pondok Pesantren Al-Basyariyah

---

⏳ **Ready for Deployment!**
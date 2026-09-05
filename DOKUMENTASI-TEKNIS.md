# 📘 ALBA Finance v3 — Dokumentasi Teknis (Developer)

> Versi aplikasi: **1.1.0** | Terakhir diupdate: September 2026

Dokumentasi ini berisi detail teknis untuk developer yang ingin mengembangkan, memodifikasi, atau mendeploy aplikasi ini.

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Framework** | Next.js 16.3 (App Router) |
| **Language** | TypeScript 5.x |
| **UI** | Tailwind CSS 3.4 + lucide-react |
| **Backend** | Next.js Route Handlers (App Router) |
| **Database** | MySQL 8.0 |
| **ORM** | Prisma ORM 5.22 |
| **Auth** | NextAuth.js 4.24 (Credentials Provider) |
| **Password Hash** | bcryptjs (12 rounds) |
| **Validation** | Zod |
| **Node.js** | v20+ |
| **Package Manager** | npm 10.x |

---

## 🏗️ Arsitektur Aplikasi

```
alba-fintech-v3/
├── app/
│   ├── api/                    # API Route Handlers
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth.js endpoints
│   │   ├── reset-users/route.ts           # Reset & seed (dev only)
│   │   ├── transactions/route.ts
│   │   ├── financial-notes/route.ts
│   │   ├── approvals/route.ts
│   │   ├── units/route.ts
│   │   ├── users/
│   │   │   ├── route.ts              # CRUD user (SUPERADMIN only)
│   │   │   ├── profile/route.ts      # Profil user
│   │   │   ├── change-password/route.ts
│   │   │   └── profile/upload/route.ts
│   │   ├── inventory/route.ts
│   │   ├── lembaga/route.ts
│   │   ├── financial-categories/route.ts
│   │   └── health/route.ts          # Health check
│   ├── dashboard/               # Dashboard pages
│   │   ├── page.tsx
│   │   ├── transactions/
│   │   ├── approvals/
│   │   ├── pos/
│   │   ├── inventory/
│   │   ├── users/
│   │   ├── units/
│   │   ├── account/
│   │   ├── settings/
│   │   ├── financial-notes/
│   │   ├── reports/
│   │   └── reconciliation/
│   ├── login/page.tsx           # Login page (Credentials form)
│   ├── layout.tsx               # Root layout (Inter font, Sonner Toaster)
│   ├── error.tsx                # Page-level error boundary
│   ├── global-error.tsx         # Global error boundary
│   └── not-found.tsx            # 404 page
├── components/
│   ├── auth/LoginForm.tsx       # Email/password login form
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx           # Role-based navigation
│   │   └── MobileNav.tsx
│   └── charts/
│       ├── BarChart.tsx
│       └── DoughnutChart.tsx
├── lib/
│   └── prisma.ts               # Prisma client singleton
├── prisma/
│   └── schema.prisma           # Database schema
├── public/                      # Static assets
├── scripts/
│   ├── seed.ts                # Seed script
│   ├── reset-users.ts         # Reset all users & create superadmin
│   └── deploy-prepare.mjs     # Build deploy package
├── proxy.ts                   # Next.js Middleware (RBAC route guard)
├── server.js                  # Custom entry point for Hostinger
├── next.config.mjs            # Next.js config (standalone, Turbopack)
├── Dockerfile                 # Multi-stage Docker build
└── docker-compose.yml         # MySQL + Next.js
```

---

## 🔐 RBAC (Role-Based Access Control)

### Role Enum
```prisma
enum Role {
  SUPERADMIN    // Global access, all units & settings
  PIMPINAN      // Lembaga-wide, cross-unit read
  MANAGER       // Unit-scoped
  STAFF         // Unit-scoped, limited actions
}
```

### Middleware (`proxy.ts`)
```typescript
// Route protection via next-auth/middleware
// Public: /login, /api/auth, /health
// SUPERADMIN only: /dashboard/users, /dashboard/units, /dashboard/settings, /dashboard/lembaga
// Shared: /dashboard/* (authenticated users)
```

### API Authorization Matrix

| Endpoint | GET | POST | PATCH | DELETE | Auth Required |
|----------|----|------|-------|--------|---------------|
| `/api/users` | SUPERADMIN/PIMPINAN/MANAGER | SUPERADMIN | — | — | Session |
| `/api/users/profile` | Authenticated | PATCH | Authenticated | — | Session |
| `/api/transactions` | Authenticated | MANAGER/STAFF/PIMPINAN/SUPERADMIN | — | — | Session |
| `/api/approvals` | SUPERADMIN/PIMPINAN/MANAGER | MANAGER/STAFF | — | — | Session |
| `/api/lembaga` | SUPERADMIN | SUPERADMIN | — | — | Session |
| `/api/units` | Authenticated | SUPERADMIN | — | — | Session |
| `/api/inventory` | Authenticated | MANAGER/STAFF | — | — | Session |
| `/api/reset-users` | — | Development use only | — | — | None (⚠️ remove in prod) |

---

## 🗄️ Database Schema (Ringkas)

**File:** `prisma/schema.prisma` | **Provider:** MySQL 8.0

Model utama:
| Model | Deskripsi |
|-------|-----------|
| `Lembaga` | Parent organization (Pondok Pesantren) |
| `Unit` | Sub-unit (KPAK, Koperasi, Kantin) — hierarchical |
| `User` | Pengguna dengan Role, bcrypt passwordHash |
| `FinancialCategory` | Chart of accounts (hierarchical, INCOME/EXPENSE/TRANSFER) |
| `BankAccount` | Kas/Bank/E-Wallet per unit |
| `Transaction` | Core financial record (DRAFT→PENDING→APPROVED/REJECTED) |
| `Approval` | Workflow persetujuan transaksi |
| `FinancialNote` | Catatan keuangan khusus pimpinan |
| `InventoryItem` | Stok barang (retail units) |
| `OrderItem` | Item dari transaksi POS |
| `Notification` | Notifikasi ke user |
| `BroadcastMessage` | Pengumuman massal dari pimpinan |
| `AuditLog` | Trail log perubahan |
| `SystemSetting` | Key-value config sistem |

---

## 🚀 Panduan Development

### Prasyarat
- Node.js `>= 20.x`
- npm `>= 10.x`
- MySQL 8.0 (atau gunakan Docker)

### Setup Lokal

```bash
# 1. Clone repository
git clone https://github.com/brontolano/alba-fintech-v2.git
cd alba-fintech-v2

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local — set DATABASE_URL MySQL Anda

# 4. Generate Prisma Client
npx prisma generate

# 5. Push schema (creates tables)
npm run prisma:push

# 6. Seed database (optional — creates demo data)
npm run db:seed

# 7. Jalankan development server
npm run dev
# Buka https://localhost:3000
```

### Docker (alternatif)

```bash
# Start MySQL + Next.js
docker-compose up -d

# Aplikasi: http://localhost:3000
# phpMyAdmin tidak termasuk — gunakan Prisma Studio
npx prisma studio
```

### Reset Database (lokal)

```bash
# Hapus semua data & seed ulang
npm run db:reset

# Atau hapus semua user & buat superadmin baru
npm run reset:users
```

### Generate JWT Secret

```bash
# Di Linux/macOS:
openssl rand -base64 32

# Di Windows (PowerShell):
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 📦 Build & Deploy

### Build Production

```bash
# Build dengan Prisma generate
npm run build

# Output: .next/standalone (siap deploy)
```

### Deploy ke Hostinger

```bash
# 1. Build di lokal
npm run build

# 2. Siapkan deploy package
npm run deploy:prepare

# 3. Upload seluruh isi deploy-package/ ke Hostinger
# 4. Edit .env.production dengan kredensial Hostinger
# 5. Di hPanel → Node.js: set startup file ke "server.js"
# 6. Restart application
```

### Environment Variables (Hostinger)

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | `mysql://user:pass@host:3306/dbname` |
| `NEXTAUTH_URL` | ✅ | `https://alba.brontolano.com` |
| `NEXTAUTH_SECRET` | ✅ | `(random 32+ char string)` |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | optional | `3000` |
| `HOSTNAME` | optional | `0.0.0.0` |

### Docker Deploy

```bash
# Build + start
docker-compose up -d --build

# Cek logs
docker-compose logs -f nextjs
```

---

## 🔧 Skrip Utilitas

### `scripts/seed.ts`
- Membuat lembaga, 4 units, 8 kategori keuangan, 5 user (semua role)
- Password semua akun: `Bismillah123!`
- **Jalankan:** `npm run db:seed`

### `scripts/reset-users.ts`
- Hapus semua user + data terkait (FK cascade)
- Buat entitas dasar (lembaga, unit, kategori)
- Buat superadmin: `admin@brontolano.com` / `bismillah`
- **Jalankan:** `npm run reset:users`

### `scripts/deploy-prepare.mjs`
- Build deploy-package/ dari .next/standalone
- Copy Prisma runtime, .next/static, public, prisma schema
- Remove .env leaks, copy package-lock.json
- **Jalankan:** `node scripts/deploy-prepare.mjs` (setelah `npm run build`)

---

## 📖 API Reference

### Authentication
NextAuth.js v4 dengan CredentialsProvider.
```typescript
// Login via API route (handled by [...nextauth])
POST /api/auth/callback/credentials
{
  "email": "user@example.com",
  "password": "Bismillah123!",
  "redirect": false
}
```

### Transaksi (Transaction)
```typescript
// List transaksi (role-based filtering via unit/lembaga)
GET /api/transactions?status=APPROVED&page=1&limit=10

// Buat transaksi baru
POST /api/transactions
{
  "unitId": "unit-id",
  "type": "INCOME",
  "amount": 50000,
  "description": "Pembayaran SPP",
  "categoryId": "category-id",
  "accountId": "account-id",
  "date": "2026-09-05",
  "reference": "TRX-001"
}
```

### User Management
```typescript
// List user (SUPERADMIN/PIMPINAN/MANAGER only)
GET /api/users?role=STAFF&unitId=xxx

// Buat user (SUPERADMIN only)
POST /api/users
{
  "email": "user@example.com",
  "name": "Nama User",
  "password": "password123",
  "role": "MANAGER",
  "unitId": "unit-id",
  "lembagaId": "lembaga-id",
  "isActive": true
}

// Update profil (authenticated)
PATCH /api/users/profile
{
  "name": "New Name",
  "unitId": "unit-id"
}

// Change password (authenticated)
POST /api/users/change-password
{
  "currentPassword": "old",
  "newPassword": "newpassword123"
}
```

### Approval Workflow
```typescript
// List approval requests
GET /api/approvals?status=PENDING

// Create approval request (MANAGER/Staff)
POST /api/approvals
{
  "transactionId": "transaction-id",
  "unitId": "unit-id"
}

// Approve/reject (SUPERADMIN/PIMPINAN/MANAGER)
PATCH /api/approvals/{id}
{
  "status": "APPROVED",
  "comment": "Disetujui"
}
```

---

## 🛠️ Pre-commit Checklist

```bash
npm run type-check      # 0 error TypeScript
npm run build           # build sukses
npm run lint            # (optional) linting
```

## 📁 Struktur File Penting

| File | Fungsi |
|------|--------|
| `lib/prisma.ts` | Prisma client singleton (global cache) |
| `app/api/auth/options.ts` | NextAuth config (CredentialsProvider, bcrypt, JWT) |
| `proxy.ts` | Middleware RBAC (route protection) |
| `server.js` | Entry point custom (loads .env.production, validates env) |
| `prisma/schema.prisma` | Database schema (14 models) |
| `scripts/deploy-prepare.mjs` | Build deploy-package untuk Hostinger |

---

## 📜 Lisensi

**Hak Cipta © 2024–2026 ALBA Finance v3**

Dikembangkan oleh **Muhammad Hamdan** ([@brontolano](https://github.com/brontolano)) untuk **Pondok Pesantren Al-Basyariyah**.

All Rights Reserved.

---

> 🔗 **Repository:** https://github.com/brontolano/alba-fintech-v2  
> 📘 **User Guide:** [README.md](./README.md)  
> 🐛 **Laporkan bug:** Buka GitHub Issues
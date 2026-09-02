# AGENTS.md — ALBA Finance v3

## Project Overview
ALBA Finance v3 adalah sistem manajemen keuangan berbasis web yang dirancang khusus untuk **Pondok Pesantren Al-Basyariyah**. Sistem ini mendukung pencatatan transaksi, manajemen unit, pencatatan keuangan pimpinan, workflow persetujuan, rekonsiliasi keuangan, inventori, dan point of sale (POS).

### Organisasi Struktur
```
Pondok Pesantren Al-Basyariyah
  └─ Lembaga (Pondok Pesantren)
      ├─ KPAK (Kantor Pelayanan Administrasi Keuangan)
      ├─ Koperasi Buku (Unit Retail)
      ├─ Kantin Umi (Unit Retail)
      └─ Kantin Baru (Unit Retail)
```

## Role Matrix
| Role | Scope | Akses |
|------|-------|-------|
| **SUPERADMIN** | Global | CRUD all, settings, COA, user management |
| **PIMPINAN** | Lembaga-wide | Lihat laporan semua unit, catat pemasukan/pengeluaran, broadcast, approval |
| **MANAGER** | Unit | Rekonsiliasi, inventory, POS, transaksi harian |
| **STAFF** | Unit | CRUD transaksi harian, POS, inventory |

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4 + shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: MySQL 8.0
- **ORM**: Prisma 5.x
- **Auth**: NextAuth.js 4.24
- **Password Hash**: bcryptjs
- **Validation**: Zod
- **Icons**: lucide-react

## Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local and configure your database

# 3. Generate Prisma Client
npx prisma generate

# 4. Run development server
npm run dev

# 5. Open in browser
https://localhost:3000
```

## Database Schema
- Schema: `prisma/schema.prisma`
- Database: MySQL
- Key Models: Lembaga, Unit, User, Transaction, FinancialNote, Approval, InventoryItem, OrderItem, BankAccount, FinancialCategory

## Project Structure
```
src/
├─ app/
│  ├─ api/                 # API Routes (Route Handlers)
│  │  ├─ auth/[...nextauth]/   # NextAuth.js
│  │  ├─ transactions/
│  │  ├─ financial-notes/
│  │  ├─ units/
│  │  ├─ users/
│  │  ├─ inventory/
│  │  ├─ approvals/
│  │  ├─ lembaga/
│  │  └─ ...
│  ├─ dashboard/
│  │  ├─ page.tsx          # Main dashboard
│  │  ├─ transactions/
│  │  ├─ financial-notes/
│  │  ├─ units/
│  │  ├─ users/
│  │  ├─ inventory/
│  │  ├─ pos/
│  │  ├─ reports/
│  │  ├─ reconciliation/
│  │  └─ settings/
│  └─ login/
├─ components/
│  ├─ auth/               # Auth components
│  ├─ layout/             # Header, Sidebar, MobileNav
│  ├─ shared/             # Reusable components
│  └─ ui/                 # UI components
├─ lib/
│  ├─ prisma.ts           # Prisma client
│  └─ ...
└─ prisma/
   └─ schema.prisma
```

## API Endpoints

### Authentication
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/auth/[...nextauth]` | NextAuth.js endpoints | Public |
| GET | `/api/auth/session` | Get current session | Public |

### Units
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/units` | List all units | SUPERADMIN, PIMPINAN, MANAGER, STAFF |
| POST | `/api/units` | Create new unit | SUPERADMIN |

### Users
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/users` | List all users | SUPERADMIN, PIMPINAN, MANAGER |
| POST | `/api/users` | Create new user | SUPERADMIN |

### Transactions
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/transactions` | List transactions | All authenticated |
| POST | `/api/transactions` | Create transaction | MANAGER, STAFF, PIMPINAN, SUPERADMIN |

### Financial Notes
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/financial-notes` | List financial notes | PIMPINAN, MANAGER, SUPERADMIN |
| POST | `/api/financial-notes` | Create financial note | PIMPINAN, MANAGER, SUPERADMIN |

### Approvals
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/approvals` | List approval requests | SUPERADMIN, PIMPINAN, MANAGER |
| POST | `/api/approvals` | Create approval | MANAGER, STAFF |
| PATCH | `/api/approvals/[id]` | Approve/reject transaction | SUPERADMIN, PIMPINAN, MANAGER |

## Pre-commit Checklist
- [ ] `npx tsc --noEmit` — 0 error
- [ ] `npm run build` — success
- [ ] Schema changes → `npx prisma generate`
- [ ] README.md terupdate

## Quick Commands
```bash
npm run dev            # Development server
npx prisma studio      # Database GUI
npx tsc --noEmit       # Type check
npm run build          # Production build
npx prisma generate    # Generate Prisma Client
npm run prisma:push    # Push schema to DB
```

## Git Convention
```
feat: short description     (Fitur baru)
fix: short description      (Bug fix)
docs: short description     (Dokumentasi)
refactor: short description (Refactor tanpa perubahan behavior)
```

## Deployment
See `DEPLOY.md` for deployment instructions.

---
Developed by Muhammad Hamdan (@brontolano)
Built with Next.js, Prisma, dan Tailwind CSS
Inspired by the needs of pesantren financial management
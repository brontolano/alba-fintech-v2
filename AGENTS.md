# AGENTS.md — ALBA Finance v7

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Agent Guidelines

### Bahasa
- Gunakan bahasa Indonesia sehari-hari. Teknis khusus (nama API, error, file path) boleh Inggris.
- Hindari bertele-tele. Jawaban pendek, fokus aksi.

### File Kunci Sering Dibaca
| Konteks | Path |
|---------|------|
| API Settings | `app/api/settings/route.ts` |
| Theme page | `app/dashboard/settings/page.tsx` |
| Prisma client | `lib/prisma.ts` |
| Schema DB | `prisma/schema.prisma` |
| Auth options | `app/api/auth/options.ts` |

### Theme Persistence Catatan
- `system_settings` tabel mungkin **tidak ada** di remote MySQL (srv594.hstgr.io).
- API `/api/settings` harus handle `P2021` gracefully — fall back ke default values.
- Client-side theme live preview wajib pakai `useEffect` untuk apply CSS variables (`--primary`, `--ring`) dan `dark` class.
- Simpan theme di `localStorage` sebagai fallback ketika DB tidak tersedia.

### Session Hygiene
- Pakai `/compact` setelah ~15 turns untuk hindari konteks melebar.
- Jangan baca file yang sama berulang kali — cache path di memori.

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
- **Frontend**: Next.js 16 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4 + shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: MySQL 8.0
- **ORM**: Prisma 7.x (generator `prisma-client` rust-free; built-in MySQL connector; URL DB via `prisma.config.ts`)
- **Auth**: NextAuth.js 4.24 (keputusan: tetap v4, v5 masih beta)
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
# PENTING — host DB berbeda per environment:
#   Lokal (laptop)  : mysql://USER:PASS@srv594.hstgr.io:3306/u826712707_alba
#   Produksi hPanel : mysql://USER:PASS@localhost:3306/u826712707_alba
# Runtime Node Hostinger TIDAK bisa konek ke srv594.hstgr.io (pool timeout
# active=0/idle=0) — wajib pakai localhost di Environment Variables hPanel.
# DILARANG `npx prisma db push` ke remote (drift: errno 150 FK cash_handovers
# beda collation). Tabel baru dibuat manual via SQL (CREATE TABLE IF NOT
# EXISTS + ALTER CONVERT utf8mb4_uca1400_ai_ci + ADD CONSTRAINT FK).

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
Root layout (App Router — tanpa folder `src/`):
```
app/
├─ api/                 # API Routes (Route Handlers)
│  ├─ auth/[...nextauth]/
│  ├─ transactions/
│  ├─ financial-notes/
│  ├─ units/
│  ├─ users/
│  ├─ inventory/
│  ├─ approvals/
│  ├─ lembaga/
│  └─ ...
├─ dashboard/           # Halaman dashboard (folder per modul)
├─ login/
└─ ...
components/
├─ auth/               # Auth components
├─ layout/             # Header, Sidebar, MobileNav
├─ shared/             # Reusable components
└─ ui/                 # UI components
lib/                    # prisma.ts (singleton client), helper utilities
prisma/schema.prisma    # Database schema
scripts/                # seed, backup, reset (TANPA script deploy — auto-deploy via Hostinger git)
public/                 # Static assets
proxy.ts                # Next.js request proxy / auth middleware (RBAC route guard)
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
See `docs/DEPLOY.md` for deployment instructions.

## Database Migration (Remote MySQL)
Jika tema/settings tidak persisten karena tabel `system_settings` belum ada di remote DB:

**Cara 1 — phpMyAdmin:**
1. Buka phpMyAdmin untuk database remote (srv594.hstgr.io)
2. Pilih database `u826712707_alba`
3. Buka tab "SQL"
4. Copy-paste seluruh isi `database-update-v2.sql`
5. Klik "Go" / "Execute"

**Cara 2 — MySQL CLI:**
```bash
mysql -h srv594.hstgr.io -u root -p u826712707_alba < database-update-v2.sql
```

Setelah migrasi, restart dev server agar Prisma client refresh tabel.

## Cost & Context Efficiency Tips
- Pakai `/compact` setelah ~15 turns untuk hindari konteks melebar di memori.
- Jangan baca file yang sama berulang kali — cache path di memori.
- Simpan preferensi tema (theme, primary color, compact mode) di `localStorage` sebagai fallback ketika DB tidak tersedia.

---
Developed by Muhammad Hamdan (@brontolano)
Built with Next.js, Prisma, dan Tailwind CSS
Inspired by the needs of pesantren financial management

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

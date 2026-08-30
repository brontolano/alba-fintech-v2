# 📊 Laporan Analisis Proyek — ALBA Finance v2

> **Lokasi Proyek:** `C:\AI\alba-fintech-v2`
> **Platform:** Web Application (Next.js 14 — PWA)
> **Android:** ⛔ Diabaikan per instruksi (`/android` folder dikecualikan)
> **Tanggal Analisis:** 2026-08-29

---

## 1. Ringkasan Dokumentasi di Folder `docs/`

Folder `docs/` berisi 6 dokumen spesifikasi + 1 folder mockup desain UI. Berikut ringkasan isi file penting:

### 📄 `docs/PRD.md` — Product Requirements Document
- **Tujuan:** Pusatkan manajemen keuangan semua unit pesantren ke satu sistem.
- **Persona:** 4 role — Superadmin, Pimpinan, Manager, Staff.
- **Fitur:** Multi-unit dashboard, RBAC 4-level, approval workflow, audit trail, real-time dashboard.
- **Success Metrics:** Approval time ≤ 24h, 100% transaksi ter-traceable, 80%+ user adoption.
- **Timeline:** MVP Q3 2026, full rollout Q4 2026, stabilization Q1 2027.

### 📄 `docs/BRD.md` — Business Requirements Document
- **Business Problem:** Sistem lama pakai Excel manual — tidak ada approval workflow, audit trail, real-time visibility.
- **Impact:** Financial risk (uncontrolled spending), inefficiency (3-5 hari rekonsiliasi), compliance risk.
- **Proposed Solution:** Sistem terpusat dengan approval otomatis, audit log lengkap, dashboard real-time, RBAC.
- **ROI:** Net monthly benefit Rp 15,000,000/mulai bulan ke-3.
- **Constraints:** Budget terbatas (open source), shared hosting Hostinger, single developer, tidak ada npx di server.

### 📄 `docs/SRS.md` — Software Requirements Specification
- **Arsitektur:** Next.js full-stack (App Router + API Routes), MySQL via Prisma 6.19.3, NextAuth 4.
- **Database Schema:** 9 model (Lembaga, Unit, User, Transaction, Approval, AuditLog, Account, Notification, PushSubscription) + 5 enum (Role, TransactionStatus, TransactionType, ApprovalStatus, AccountType, NotificationType).
- **Data Flow:** Auth → API Routes → Zod validation → Prisma ORM → MySQL → standardized JSON response.
- **API Spec:** 23+ endpoints terstandarisasi `{ data, success }` format.
- **NFR:** Password bcrypt 10 rounds, session 24h timeout, AES-256 at rest, TLS 1.3 transit, daily backups.

### 📄 `docs/FRD.md` — Functional Requirements Document
- **Module breakdown:** Authentication, Unit Management, User Management, Transaction Management, Approval Management, Buku Besar (COA), Audit Log, Notification, Rekonsiliasi, Export.
- **Transaction lifecycle:** DRAFT → PENDING → APPROVED/REJECTED → RECONCILED.
- **Approval threshold:** Income ≥ Rp 10,000,000 OR Expense ≥ Rp 1,000,000 → triggers approval.
- **RBAC rules:** STAFF hanya input sendiri; MANAGER scoped ke unit; PIMPINAN cross-unit approve; SUPERADMIN full access.

### 📄 `docs/URD.md` — User Requirements Document
- **User journeys:** Login → Transaction Creation (Staff) → Approval (Pimpinan) → Multi-unit Management (Superadmin) → Dashboard → Export → Rekonsiliasi.
- **Wireframes (text):** Login page, Manager dashboard, transaction form — all mobile-first.
- **Use Case Matrix:** 5 core use cases (UC-001 through UC-005) dengan preconditions, main flow, post-conditions.
- **Requirements Traceability Matrix** yang memetakan kebutuhan ke tiap use case.

### 📄 `docs/TASK_MOCKUP_IMPLEMENTATION.md`
- **Task assignment dari CTO** untuk implementasi UI mockup.
- **3 phase:** Phase 1 (CEO — UI mapping, 2 hari), Phase 2 (CTO — engineering, 5 hari), Phase 3 (QA — integration, 2 hari).
- **Role pages:** Pimpinan (laporan_eksekutif, daftar_transaksi, rekonsiliasi, profil), Manager (dashboard kantin/kantor/koperasi), Staff (dashboard kantin/kantor/koperasi).
- **Form pages:** tambah_transaksi_baru_detail, persetujuan_transaksi, halaman_login_terpadu_v4.
- **Teknologi:** Next.js 14 App Router, Tailwind 3.4.1, Recharts, NextAuth v4, Prisma + MySQL, PWA, Android WebView APK.

### 📁 `docs/stitch_keuangan_pesantren_al_basyariyyah/` — Mockup & Design Assets
- **design.md:** Design system enterprise finance — color palette (primary `#1E3A5F`, secondary `#4A90A4`, accent `#E8B923`), typography (Inter + JetBrains Mono), spacing scale (8px rhythm), 3 breakpoints (mobile/tablet/desktop), button/card/table/form/badge guidelines, WCAG AA accessibility, dark mode support, animation rules (150-300ms), pre-delivery checklist, anti-patterns.
- **aplikasi_contoh.html:** Contoh aplikasi referensi (36KB).
- **alba_apps_prd_v1.0.md:** PRD asli ALBA-APPS — web PWA mobile-first, input transaksi + foto, buku besar digital, offline mode 7 hari, real-time sync, role-based (Kepala Keuangan, Staff Kantor, Staff Kantin, Staff Koperasi).
- **extracted_text:** Spreadsheet skema database lama (user_id, username, password, name).
- **Mockup folders:** `persetujuan_transaksi/`, `halaman_login_terpadu_v4/`, `laporan_eksekutif_pimpinan/`, `daftar_transaksi_pimpinan_terintegrasi/`, `rekonsiliasi_keuangan_pimpinan/`, `profil_pimpinan_al_basyariyah/`, `dashboard_unit_kantin_staff/`, `dashboard_unit_kantor_staff/`, `dashboard_unit_kantin_manager/`, `dashboard_unit_kantor_manager/`, `dashboard_unit_koperasi_staff/`, `dashboard_unit_koperasi_manager/`, `tambah_transaksi_baru_detail/`, `al_basyariyyah_finance_core/`, `dashboard_unit_keuangan_refined/`, `enterprise_financial_management_system/`, `splash_satu_aplikasi_finansial_1/`, `_2/`, `_updated_v2/`, `logo_al_basyariyah_2.png/`, 3 folder ilustrasi 3D isometric.

---

## 2. Struktur Proyek Secara Keseluruhan (tanpa folder `android`)

```
C:\AI\alba-fintech-v2/
├── 📦 package.json          — Next.js 14.2.21, TypeScript, dependency manifest
├── 🔧 next.config.mjs        — Next.js config (standalone, SPA headers, image domains, optimizePackageImports)
├── 🔧 tsconfig.json         — TS config (ES2022 target, strict, path alias @/*)
├── 🔧 tailwind.config.js    — Tailwind 3.4.1 (brand color palette, sans font)
├── 🔧 postcss.config.js     — PostCSS (tailwindcss + autoprefixer)
├── 🔧 .eslintrc.json        — eslint-config-next/core-web-vitals
├── 🔧 next-env.d.ts         — Next.js type references
├── 🔧 docker-compose.yml    — Dev container (Node.js 22 Alpine, MySQL env)
├── 🔧 server.js             — Hostinger standalone server entry point (custom HTTP server + health check)
├── 🔧 test-app.js           — Self-contained Playwright e2e test
├── ├─── README.md           — Comprehensive project README (features, tech stack, API, demo accounts, RBAC)
├── ├─── IDEA.md             — 1-line project description
├── ├─── MEMORY.md           — Development progress tracker & key file references
├── ├─── .gitignore          — Ignores node_modules, .next, .env*, *.db, *.sqlite, logs
├── ├─── .env.example         — Template env vars (DB, NextAuth, Google OAuth, AI provider, Hostinger)
├── ├─── DEPLOY.md            — Hostinger deployment guide (build + upload + env setup)
├── ├─── DEPLOYMENT.md        — One-command deploy guide (production standalone)
├── ├─── DEPLOY_SECRETS.md    — GitHub Actions secrets setup (FTP/SSH, DB, NextAuth)
├── ├─── prisma/              — Database layer
│   ├── schema.prisma         — 9 models + 5 enums + 4 migrations
│   ├── seed.ts              — TypeScript seed (Lembaga, 4 Units, 5 Users, 4 Transactions, 4 Accounts)
│   ├── dev.db               — SQLite dev DB (96KB)
│   └── migrations/
│       ├── 20260825_add_account_model/
│       ├── 20250101_add_push_subscription/
│       ├── 20260828_add_photo_url_to_transaction/
│       └── 20250101_add_transaction_indexes/
├── ├─── scripts/             — Build & deployment scripts
│   ├── build.mjs             — Custom build wrapper (spawns next build)
│   ├── seed-local.cjs        — Legacy seed script (SQLite, old schema)
│   ├── deploy-prepare.mjs    — Prepares Hostinger deploy package
│   ├── check-notifications.mjs — CLI: check unread notifications
│   └── create-test-notification.mjs — CLI: create test notification
├── ├─── src/                — Application source
│   ├── app/                  — Next.js App Router
│   │   ├── layout.tsx        — Root layout (Providers, viewport, PWA meta, theme-color)
│   │   ├── page.tsx          — Landing page (hero, features, roles, CTA)
│   │   ├── globals.css       — Tailwind base + CSS variables (background/foreground)
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       ├── page.tsx  — Login page wrapper
│   │   │       └── LoginForm.tsx  — Form with email/password, show/hide, signIn
│   │   ├── panduan/
│   │   │   └── page.tsx      — User guide (12KB)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx    — Dashboard layout (SSR session, Sidebar, MobileBottomNav, NotificationBell)
│   │   │   ├── staff/
│   │   │   │   ├── page.tsx  — Staff dashboard (stat cards + quick menus)
│   │   │   │   ├── transactions/, pos/, inventory/, account/, ai-assistant/
│   │   ├── manager/
│   │   │   ├── page.tsx      — Manager dashboard (unit-scoped stats)
│   │   │   ├── transactions/, pos/, inventory/, approvals/, rekonsiliasi/, account/, ai-assistant/
│   │   ├── pimpinan/
│   │   │   ├── page.tsx      — Executive dashboard (cross-unit stats, pending approvals)
│   │   │   ├── transactions/, approvals/, reports/, rekonsiliasi/, account/, ai-assistant/
│   │   ├── superadmin/
│   │   │   ├── page.tsx      — Command Center (user/unit/tx counts, recent audit logs)
│   │   │   ├── units/, users/, lembaga/, approvals/, inventory/, transactions/, audit/, ai-assistant/
│   │   ├── account/
│   │   │   └── page.tsx      — User profile/account page (all roles)
│   │   ├── rekonsiliasi/
│   │   │   └── page.tsx      — Reconciliation/ledger page (PIMPINAN/MANAGER/SUPERADMIN)
│   │   └── ai-assistant/
│   │       └── page.tsx      — AI assistant chat interface
│   ├── lib/                  — Core library modules
│   │   ├── auth.ts           — NextAuth config (CredentialsProvider, JWT callbacks, RBAC types)
│   │   ├── prisma.ts         — Prisma client singleton (global caching)
│   │   ├── utils.ts          — Utility functions (cn, formatCurrency, formatDate, getStatusVariant)
│   │   ├── useUnitInfo.ts    — Hook to fetch unit info
│   │   └── push-notification.ts — Web Push notification sender (VAPID keys)
│   ├── components/
│   │   ├── Providers.tsx     — SessionProvider + ToasterProvider wrapper
│   │   ├── PWAProvider.tsx   — PWA provider (currently disabled)
│   │   ├── ToasterProvider.tsx — Sonner toast provider
│   │   ├── Sidebar.tsx       — Role-based sidebar navigation (8 items, sign-out)
│   │   ├── MobileBottomNav.tsx — 5-icon mobile nav with hero button + overlay sheet
│   │   ├── NotificationBell.tsx — Notification dropdown (15s polling, mark read/dismiss)
│   │   ├── ui/               — Custom component library (16 files):
│   │   │   ├── index.ts      — Barrel exports
│   │   │   ├── Button.tsx    — Brand-themed buttons (loading state, variants)
│   │   │   ├── Card.tsx      — Card component (Header/Content/Title)
│   │   │   ├── Input.tsx     — Floating label input
│   │   │   ├── Select.tsx, Label.tsx, Textarea.tsx, Modal.tsx, Dialog.tsx
│   │   │   ├── Badge.tsx, Alert.tsx, Table.tsx, DropdownMenu.tsx
│   │   │   ├── StatCard.tsx  — Dashboard stat cards
│   │   │   └── TransactionBadges.tsx — Status/type badges
│   │   ├── shared/           — Shared page components (11 files):
│   │   │   ├── TransactionsPage.tsx — Full transaction CRUD page (filter, create modal, photo upload)
│   │   │   ├── ApprovalsPage.tsx    — Approval workflow (approve/reject inline)
│   │   │   ├── POSPage.tsx, InventoryPage.tsx, AuditPage.tsx
│   │   │   ├── UnitsPage.tsx, UsersPage.tsx, AccountPage.tsx
│   │   │   ├── LembagaPage.tsx, AIAssistantPage.tsx
│   │   │   └── RekonsiliasiTable.tsx — Reconciliation detail table
│   │   └── analytics/
│   │       └── Charts.tsx     — Recharts components (BarChart, LineChart, Skeleton)
│   └── types/
│       └── tailwind-merge.d.ts — Type declaration
├── ├─── public/               — Static assets
│   ├── manifest.json         — PWA manifest (standalone display, brand cyan theme)
│   ├── sw.js                 — PWA service worker (SWR caching, push notifications, offline fallback)
│   ├── sw.js.new             — Updated service worker
│   ├── offline.html          — Offline fallback page
│   ├── favicon.svg           — Favicon
│   ├── logo-baru.png         — App logo (PWA icon)
│   ├── icons/                — PWA icons (192x192, 512x512 SVG — minimal size)
│   └── .well-known/          — Well-known endpoints
├── ├─── .github/workflows/   — CI/CD
│   └── deploy.yml            — GitHub Actions (build → upload artifact → FTP deploy to Hostinger)
└── ├─── (Android folder — ⛔ DIABAikan)
```

---

## 3. Teknologi yang Digunakan

### 🖥️ Backend
| Teknologi | Versi | Keterangan |
|-----------|-------|------------|
| **Framework** | Next.js | 14.2.21 — App Router + API Routes (full-stack) |
| **Bahasa** | TypeScript | 5.x (strict mode, path alias `@/*`) |
| **ORM** | Prisma | 6.19.3 — type-safe DB queries, migrations, seeding |
| **Database** | MySQL | 8.0 (production); SQLite dev.db (lokal) |
| **Auth** | NextAuth.js | 4.24.15 — Credentials Provider (email/password), JWT sessions, bcryptjs hashing |
| **Password Hash** | bcryptjs | 3.0.2 — 10-round salting |
| **Validation** | Zod | 3.x — schema validation on all API endpoints |
| **Push Notifications** | web-push | 3.6.7 — VAPID-based Web Push API |
| **Redis (cache)** | ioredis | 6.0.0 — 5-min TTL caching for report summaries (per MEMORY.md) |
| **Server Runtime** | Node.js | 18+ (Hostinger), Node 22 Alpine (docker-compose) |

### 🎨 Frontend
| Teknologi | Versi | Keterangan |
|-----------|-------|------------|
| **UI Framework** | Tailwind CSS | 3.4.1 — utility-first CSS |
| **UI Components** | Custom | shadcn/ui-inspired — 16 component files |
| **Icons** | lucide-react | 0.468.0 — consistent icon set |
| **Charts** | recharts | 3.10.1 — financial dashboards & charts |
| **Notifications** | sonner | 2.0.8 — toast notifications |
| **CSS Utils** | clsx + tailwind-merge | class composition & deduplication |
| **Styling** | CSS Modules | globals.css + CSS variables (brand palette) |

### 📱 PWA & Mobile
| Teknologi | Keterangan |
|-----------|------------|
| **PWA** | next-pwa + custom sw.js (installable, offline, service worker) |
| **Manifest** | manifest.json — standalone display, portrait-only, brand cyan |
| **Offline** | offline.html fallback, SWR caching strategy |
| **Push** | Web Push API via web-push + VAPID keys |
| **Icons** | logo-baru.png (512×512), SVG icons (192×192, 512×512) |
| **Mobile Nav** | MobileBottomNav — 5-icon grid with hero button + overlay sheet |

### 🚀 DevOps & Deployment
| Teknologi | Keterangan |
|-----------|------------|
| **Build** | `npm run build` (custom build.mjs → next build) |
| **Deploy** | Next.js standalone → server.js (Hostinger hPanel) |
| **CI/CD** | GitHub Actions (deploy.yml — build → artifact → FTP) |
| **Testing** | test-app.js (Playwright e2e — self-contained server lifecycle) |
| **Docker** | docker-compose.yml (dev profile — Node 22 Alpine) |

### 🔐 Security
| Aspect | Implementation |
|--------|----------------|
| **Headers** | X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, X-XSS-Protection |
| **CSP** | Configured in next.config.mjs (per MEMORY.md) |
| **HSTS** | Configured in next.config.mjs (per MEMORY.md) |
| **Password** | bcryptjs 10 rounds |
| **Session** | NextAuth JWT (24h idle timeout, 30-day max via custom JWT) |
| **CSRF** | NextAuth built-in |

---

## 4. Fitur-Fitur Utama Aplikasi

### 🔐 Authentication & Authorization
- **Credentials-based login** (email/password) via NextAuth.js CredentialsProvider
- **JWT sessions** with role & unitId embedded in token
- **4-level RBAC** — SUPERADMIN (full), PIMPINAN (cross-unit approve), MANAGER (unit-scoped), STAFF (own transactions only)
- **Middleware protection** — `src/middleware.ts` guards `/dashboard/*` with role-based redirect; redirects to role-specific homes
- **Mobile auth endpoint** — `src/app/api/mobile/auth/login/` generates JWT token for native Android app consumption

### 🏢 Multi-Unit Organization
- **Lembaga** — top-level organization (Yayasan)
- **Unit** — operational units (KPAK, Kantin Umi, Kantin Baru, Koperasi Buku) with `isRetail` flag (enables POS & Inventory)
- **User-to-Unit assignment** — manaaged by SuperAdmin, scoped per role

### 💰 Transaction Management (Core)
- **Full CRUD** — create (draft/pending), read, update (before approval), delete (draft/pending only)
- **Photo upload** — FormData multipart support (`capture="environment"`) for receipt photos
- **INCOME/EXPENSE** types with account linking (COA)
- **Auto-status logic** — new transactions created as PENDING (ready for approval)
- **Atomic operations** — Prisma `$transaction` wraps create + audit log
- **Filtering** — by unit, type, status, date, description search

### ✅ Approval Workflow
- **Threshold-based triggering** — Income ≥ Rp 10,000,000 OR Expense ≥ Rp 1,000,000 → PENDING status
- **Multi-role approvers** — SUPERADMIN, PIMPINAN (and MANAGER for unit-scoped)
- **Approve/Reject** with optional comments
- **Status locking** — APPROVED/REJECTED transactions cannot be edited
- **Duplicate prevention** — checks for existing approval records

### 📊 Buku Besar & Chart of Accounts (COA)
- **Dynamic COA** — Account model with hierarchical parent/children, types (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
- **Tree structure** — parent-child account relationships
- **4 seed accounts** — Kas Unit (ASSET), Modal Sendiri (EQUITY), Pendapatan Jualan (INCOME), Beban Usaha (EXPENSE)

### 📋 Rekonsiliasi & Reporting
- **Reconciliation page** — filter by unit, account, date range; status = APPROVED transactions only
- **Summary views** — breakdown by account (trial balance) and by unit
- **Export** — CSV download via `/api/reports/export/` (PIMPINAN-only, 5000 records max)
- **Audit trail** — `/api/audit-logs/` (SUPERADMIN-only), searchable by entity, paginated

### 💬 AI Assistant
- **OpenAI-compatible endpoint** — `src/app/api/ai/chat/` proxy to external provider (configurable via env vars `AI_PROVIDER_URL`, `AI_PROVIDER_KEY`, `AI_PROVIDER_MODEL`)
- **File upload support** — FormData handling for AI with vision
- **Streaming fallback** — native `https.request` with 30s timeout
- **Chat UI** — AIAssistantPage with message history, bot/user message bubbles

### 🔔 Notifications & Push
- **In-app notifications** — GET (list, 15s polling), POST (create), PATCH (markRead/markAllRead)
- **NotificationBell** component in dashboard header with unread badge
- **Web Push** — push-notification.ts with VAPID keys, service worker push handler, subscription endpoint
- **Test scripts** — check-notifications.mjs, create-test-notification.mjs

### 🛒 POS & Inventory (Retail Units Only)
- **POSPage** — cart management, unit selection, transaction submission
- **InventoryPage** — search + unit filter (placeholder)
- **isRetail flag** — controls visibility of POS/Inventory nav items

### 📱 PWA & Mobile-First
- **Service worker** — stale-while-revalidate for assets, network-first for API, offline HTML fallback
- **Mobile bottom navigation** — 5-icon grid with hero button (center), overlay sheet for secondary actions
- **Touch targets** — minimum 44×44px per design system
- **Responsive layout** — sidebar (desktop) + mobile nav; SuperAdmin always gets desktop sidebar

### 📝 PWA & Deployment Features
- **Standalone build** — `output: 'standalone'` in next.config.mjs (Hostinger-ready)
- **Deploy package** — `scripts/deploy-prepare.mjs` assembles `.next/standalone/` + `public/` + `prisma/`
- **Health check** — `/health` endpoint in server.js
- **Security headers** — configured via next.config.mjs headers

---

## 5. Detail Konfigurasi Penting

### 🔧 Environment Variables (`.env.example`)
```
# Database
DATABASE_URL="mysql://user:password@localhost:3306/alba_finance?schema=public"

# NextAuth (generate: openssl rand -base64 32)
NEXTAUTH_URL="https://alba-finance.example.com"
NEXTAUTH_SECRET="base64-encoded-32-byte-random-secret-here"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# App
PORT=3000

# AI Provider (OpenAI-compatible)
AI_PROVIDER_URL="https://9router-dk0n.srv1167690.hstgr.cloud/v1"
AI_PROVIDER_KEY="Bearer-your-api-key-here"
AI_PROVIDER_MODEL="Hamdan-MAX"

# Logging
NEXTAUTH_DEBUG=true
```
> **Catatan:** `.env`, `.env.local`, `.env.production` are git-ignored. `NEXTAUTH_SECRET` harus minimum 32-byte base64. Database saat ini memakai `freesqldatabase.com` (free tier) — **kadaluarsa trial** dapat menyebabkan error P1000. Sebaiknya migrasi ke Hostinger MySQL.

### 🏗️ Next.js Configuration (`next.config.mjs`)
- `output: 'standalone'` — untuk deployment Hostinger (tanpa npx di server)
- `reactStrictMode: true`
- `compress: true`, `poweredByHeader: false`
- **Image optimization:** remotePatterns semua hostname (untuk foto notifikasi)
- **Security headers:** X-Content-Type-Options nosniff, X-Frame-Options DENY, X-XSS-Protection, Referrer-Policy
- **SW cache control:** `/sw.js` header dengan `max-age=0, must-revalidate`
- **Experimental:** `optimizePackageImports: ['lucide-react']`
- **ESLint:** `ignoreDuringBuilds: true` (bisa di-enable nanti)

### 🎨 Tailwind Configuration (`tailwind.config.js`)
- **Brand palette:** `brand/50` → `brand/950` (cyan-blue gradient, primary `#0284c7`)
- **Font:** `system-ui, -apple-system, Segoe UI, sans-serif`
- **Content paths:** `./src/pages/**`, `./src/components/**`, `./src/app/**`

### 🗄️ Database Schema (`prisma/schema.prisma`)
- **9 models:** Lembaga (organisasi induk), Unit (dengan `isRetail` flag), User (4 roles), Transaction (photo URL, approval chain), Approval, AuditLog (oldData/newData JSON), Account (hierarchical COA), Notification, PushSubscription (Web Push)
- **5 enums:** Role, TransactionStatus (DRAFT/PENDING/APPROVED/REJECTED), TransactionType, ApprovalStatus, AccountType, NotificationType
- **Indexes:** Transaction memiliki 6 composite indexes (status+createdAt, unitId+createdAt, type+createdAt, etc.) untuk query laporan
- **4 migrations:** add_account_model, add_push_subscription, add_photo_url_to_transaction, add_transaction_indexes

### 🧭 Middleware (`src/middleware.ts`)
- **Public routes:** `/login`, `/api/auth/*`, `/_next/*`, `/`, favicon, images
- **Protected:** `/dashboard/*` — requires token
- **Role-based routing:** redirect to `ROLE_HOMES[role]` (`/dashboard/superadmin`, `/dashboard/pimpinan`, `/dashboard/manager`, `/dashboard/staff`)
- **Shared dashboard paths:** `/dashboard/rekonsiliasi`, `/dashboard/reports`, `/dashboard/account` — accessible by all authenticated roles
- **URL fix:** redirects malformed URLs like `/dashboard/pimpinan/dashboard/xxx` → `/dashboard/xxx`
- **JWT secret** dari `NEXTAUTH_SECRET`

### 📊 API Endpoints (23+ routes)
| Kategori | Endpoint | Method | Role |
|----------|----------|--------|------|
| Auth | `/api/auth/[...nextauth]` | GET/POST | Public |
| Mobile Auth | `/api/mobile/auth/login` | POST | Public (mobile) |
| Units | `/api/units` | GET, POST | All / SUPERADMIN |
| Units | `/api/units/[id]` | GET, PATCH, DELETE | All / SUPERADMIN |
| Users | `/api/users` | GET, POST | SA/PIMP/MGR |
| Users | `/api/users/[id]` | GET, PATCH, DELETE | SA/PIMP/MGR / SA |
| Users | `/api/users/permissions` | GET | SA/PIMP/MGR |
| Transactions | `/api/transactions` | GET, POST | All authenticated |
| Transactions | `/api/transactions/[id]` | GET, PATCH, DELETE | Scoped |
| Approvals | `/api/approvals` | GET, POST | SA/PIMPINAN (approve), all (view) |
| Accounts | `/api/accounts` | GET, POST | SA/PIMP / SA |
| Accounts | `/api/accounts/[id]` | GET, PATCH, DELETE | Scoped |
| Audit Logs | `/api/audit-logs` | GET | SUPERADMIN only |
| Notifications | `/api/notifications` | GET, POST | All authenticated |
| Notifications | `/api/notifications` | PATCH | markRead/markAllRead |
| Notifications | `/api/notifications` | PUT | Subscribe push |
| Reconciliation | `/api/reconciliation` | GET | PIMPINAN/MANAGER/SUPERADMIN |
| Reports | `/api/reports/export` | GET | PIMPINAN only |
| AI Chat | `/api/ai/chat` | POST | All authenticated |

### 🚀 Build & Deploy
- **Build command:** `npm run build` (custom `build.mjs` → `next build`)
- **Output:** `.next/standalone/` (server.js + minimal node_modules)
- **Start:** `node server.js` (Hostinger hPanel)
- **CI/CD:** GitHub Actions — checkout → npm ci → prisma generate → next build → upload artifact → FTP deploy
- **Prisma:** generate di build, `db push` untuk schema, `db:seed` untuk data awal
- **Bundle size:** 94.2 kB first load (per MEMORY.md)

---

## 6. File-File Kunci untuk Dipahami

| File | Keterangan | Prioritas |
|------|-----------|-----------|
| `prisma/schema.prisma` | **Database schema** — 9 models, 5 enums, 6 indexes. Sumber kebenaran untuk struktur data. | ⭐⭐⭐⭐⭐ |
| `src/lib/auth.ts` | **NextAuth config** — CredentialsProvider, JWT callbacks, RBAC type declarations, session.user schema | ⭐⭐⭐⭐⭐ |
| `src/lib/prisma.ts` | **Prisma client singleton** — global instance, dev query logging | ⭐⭐⭐⭐⭐ |
| `src/middleware.ts` | **Route protection** — JWT token check, role-based redirect, shared dashboard paths | ⭐⭐⭐⭐⭐ |
| `src/app/api/transactions/[id]/route.ts` | **Transaction detail API** — full CRUD dengan RBAC, status validation, audit log | ⭐⭐⭐⭐⭐ |
| `src/app/api/approvals/route.ts` | **Approval workflow** — threshold logic, atomic approve/reject, audit trail | ⭐⭐⭐⭐⭐ |
| `src/app/api/reconciliation/route.ts` | **Rekonsiliasi API** — groupBy queries, summary by account & unit, RBAC | ⭐⭐⭐⭐⭐ |
| `src/app/dashboard/layout.tsx` | **Dashboard layout** — session check, Sidebar + MobileBottomNav conditional rendering | ⭐⭐⭐⭐⭐ |
| `src/components/Sidebar.tsx` | **Navigation** — 11 role-based nav items, SuperAdmin full, sign-out button | ⭐⭐⭐⭐ |
| `src/components/MobileBottomNav.tsx` | **Mobile nav** — 5-icon grid, hero button, role-based items, retail/non-retail logic | ⭐⭐⭐⭐ |
| `src/components/NotificationBell.tsx` | **Notifications** — 15s polling, dropdown, markRead/markAllRead, dismiss | ⭐⭐⭐⭐ |
| `src/components/shared/TransactionsPage.tsx` | **Transaction CRUD UI** — filter, create modal, photo upload, table with badges | ⭐⭐⭐⭐ |
| `src/components/shared/ApprovalsPage.tsx` | **Approval UI** — list, approve/reject inline actions | ⭐⭐⭐⭐ |
| `src/components/shared/RekonsiliasiTable.tsx` | **Reconciliation table** — detail view, account/unit grouping | ⭐⭐⭐⭐ |
| `src/components/ui/index.ts` | **Component barrel** — exports semua 16 UI components | ⭐⭐⭐⭐ |
| `src/app/api/auth/[...nextauth]/route.ts` | **Auth API route** — handler for NextAuth | ⭐⭐⭐⭐ |
| `prisma/seed.ts` | **Database seed** — 1 Lembaga, 4 Units, 5 Users, 4 Transactions, 4 Accounts | ⭐⭐⭐⭐ |
| `public/sw.js` | **Service worker** — SWR caching, push notifications, offline fallback | ⭐⭐⭐⭐ |
| `public/manifest.json` | **PWA manifest** — standalone display, portrait orientation, brand cyan theme | ⭐⭐⭐⭐ |
| `next.config.mjs` | **Next.js config** — standalone, security headers, image domains, optimization | ⭐⭐⭐⭐ |
| `src/lib/push-notification.ts` | **Web Push** — VAPID key config, subscription management, sendPushNotification | ⭐⭐⭐ |
| `src/app/api/ai/chat/route.ts` | **AI proxy** — forward to OpenAI-compatible endpoint, file upload, timeout handling | ⭐⭐⭐ |
| `server.js` | **Hostinger entry point** — custom HTTP server, `/health` check, DB connectivity check | ⭐⭐⭐ |
| `scripts/deploy-prepare.mjs` | **Deploy script** — assembles standalone + static + prisma ke deploy-package/ | ⭐⭐⭐ |
| `scripts/build.mjs` | **Custom build** — spawns `next build` dengan env override | ⭐⭐ |
| `MEMORY.md` | **Project tracker** — progress log, fixes, verification, key references, deploy commands | ⭐⭐ |

---

## Ringkasan Eksekutif

**ALBA Finance v2** adalah sebuah **aplikasi web PWA berbasis Next.js 14** yang dirancang sebagai sistem manajemen keuangan multi-unit untuk pesantren. Aplikasi ini **bukan proyek Android** — folder `android` diproyek ini tampaknya berisi referensi native APK saja dan tidak menjadi fokus utama. Aplikasi web ini sendiri sudah lengkap dengan dukungan PWA (installable, offline, push notifications), autentikasi berbasis role (4-level RBAC), dan alur persetujuan transaksi otomatis.

### POIN KRITIS:
- **Web-first, mobile PWA:** Aplikasi ini adalah progressive web app yang berjalan di browser, termasuk di perangkat Android/iOS melalui mode standalone (PWA). Hal ini berarti tidak ada kode Android native yang perlu dikompilasi — semua logika ada di `src/app/` dan `src/components/`.
- **Database saat ini memakai free-tier:** `freesqldatabase.com` (free SQL database) sebagai `DATABASE_URL` default. Ini berisiko kadaluarsa. Untuk produksi, harus migrasi ke MySQL Hostinger.
- **Single file API routes:** Backend adalah API Routes Next.js (bukan separate server) — semua endpoint ada di `src/app/api/*/route.ts`.
- **Design system konsisten:** docs/stitch_keuangan_pesantren_al_basyariyyah/design.md mendefinisikan sistem desain enterprise (warna, tipografi, komponen, aksesibilitas WCAG AA) yang harus diikuti untuk konsistensi UI.

---
*Dokumen analisis ini dibuat secara otomatis berdasarkan eksplorasi proyek.*

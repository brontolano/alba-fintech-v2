# DOKUMENTASI TEKNIS — ALBA Finance v4

## Ringkasan Proyek

Aplikasi keuangan multi-unit Next.js 16.3.4 + React 19 + TypeScript + Prisma 5.19 + NextAuth 4.24.

## Stack

| Layer | Teknologi |
| ----- | ---------- |
| Runtime | Node.js 20+ (Next.js 16) |
| UI | React 19 + Tailwind CSS 4 |
| Backend | Next.js App Router (API Routes) |
| Database | MySQL 8.0 |
| ORM | Prisma 5.19 |
| Auth | NextAuth 4.24 (CredentialsProvider, JWT) |
| Testing | Vitest 3.0 |
| Lint | ESLint + Prettier + lint-staged + Husky |

## Arsitektur Auth & RBAC

### Role Hierarchy

STAFF(0) < MANAGER(1) < PIMPINAN(2) < SUPERADMIN(3)

### Scope Filter

- **STAFF / MANAGER**: hanya unitId = user.unitId
- **PIMPINAN**: semua unit di lembagaId = user.lembagaId
- **SUPERADMIN**: semua data

Middleware (`src/middleware.ts`):

- `PUBLIC_FILE` regex: `/_next/`, `/api/auth`, `/login`, `/favicon.ico`, `/images/`, `/`, `\\.png$`, `\\.jpg$`, `\\.ico$`
- `ROLE_REQUIRED`: mapping path prefix → role minimum

Session callbacks (`src/lib/auth/options.ts`): inject `role`, `unitId`, `lembagaId` ke JWT + session.

## API Endpoints

### Transaksi (`/api/transactions`)

- **POST**: multipart/form-data (BUG-001 fix). Fields: `type`, `amount`, `description`, `date`, `categoryId`, `accountId` (required for TRANSFER), `orderItems` (JSON string untuk POS). Auto-create approval untuk MANAGER/STAFF → PENDING.
- **GET**: filter berdasarkan role/unit/lembaga. Query: `status`, `categoryId`, `accountId`, `limit`, `skip`.
- S3-T02: transaksi dengan `orderItems` otomatis decrement `inventoryItem.currentStock`.

### Inventory (`/api/inventory`)

- POST/GET list. `[id]` GET/PATCH/DELETE.
- PATCH: support `stockAdjustment` (delta) atau `currentStock` (set).

### Approval (`/api/approvals`)

- Auto-create ketika transaksi PENDING. PIMPINAN/MANAGER di unit/lembaga dapat notifikasi.
- GET filter: `status` (PENDING/APPROVED/REJECTED).

### Dashboard (`/api/dashboard`)

Response:

```json
{
  "totalIncome": number,
  "totalExpense": number,
  "netBalance": number,
  "pendingApprovals": number,
  "totalTransactions": number,
  "lowStockItems": Array<{ id, name, currentStock, minStock }>
}
```

BUG-023: TRANSFER tidak masuk income/expense.

### Settings (`/api/settings`, `/api/settings/[key]`)

- GET `?action=export`: return `{ systemSettings, unitSettings }` JSON.
- POST: bulk upsert system + unit settings (SUPERADMIN/PIMPINAN).
- GET/PATCH `[key]`: individual setting, query param `?unitId=` untuk unit-scoped.

## Testing

```bash
npm run test
npm run test:watch
npm run test:cov
```

- `src/lib/test/rbac.test.ts`: 5 role hierarchy tests
- `src/lib/test/rbac-matrix.test.ts`: 8 unit/lembaga scope + stock decrement tests
- `src/lib/test/transaction-flow.test.ts`: 11 E2E transaction/dashboard regression tests

## Bug Tracker Selesai

| Bug | Fix |
| ---- | --- |
| BUG-001 | FormData parsing konsisten di transactions POST |
| BUG-002 | P2002 error message mapping |
| BUG-003 | Approval authority check (unit+lembaga scope) |
| BUG-006 | N+1 query di users (select + count) |
| BUG-015 | Dashboard role hardcoded → useSession() |
| BUG-016/017 | Logout via signOut() di Sidebar dan users page |
| BUG-019 | POS checkout fields (unitId/accountId/categoryId) |
| BUG-021 | Approval authority check |
| BUG-023 | TRANSFER exclude dari dashboard income/expense |
| BUG-026 | Unit filter di reports |
| BUG-028 | Session role tersedia di client via callbacks |

## Deploy

- Next.js static export via `npm run build`.
- Deploy ke Hostinger staging (S4-T09).
- Release v4.0.0 via GitHub release tag.

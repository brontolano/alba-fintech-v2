# 🏛️ ALBA Finance v2 — Development Skill

**Project**: alba-fintech-v2  
**Tech Stack**: Next.js 14.2.18, Prisma 6.19.3, NextAuth 4.24.15, Tailwind 3.4.1, MySQL 8.0, TypeScript 5.x  
**Role**: Senior Developer / Full Stack Engineer

---

## 1. Project Overview

ALBA Finance v2 adalah enterprise financial management system untuk pesantren & organisasi non-profit.  
Fitur utama: transaksi, buku besar, manajemen unit, approoval workflow, pencatatan keuangan pimpinah, broadcast notifikasi, asisten AI, POS, PWA.

### Organisasi Struktur
```
Lembaga (induk)
  └─ Unit (bisa sederhana / retail)
      ├─ Staff
      ├─ Manager
      └─ transaksi / catatan keuangan
```

### Role Matrix
| Role | Scope | Akses |
|------|-------|-------|
| SUPERADMIN | Global | CRUD all, settings, COA |
| PIMPINAN | Lembaga-wide | Lihat laporan semua unit, catat pemasukan/pengeluaran, broadcast |
| MANAGER | Unit | Rekonsiliasi, approvals, inventory (retail) |
| STAFF | Unit | CRUD transaksi harian, POS |

---

## 2. Prisma Schema Guidelines

### 2.1 Penamaan Field & Relation
- Gunakan `camelCase` di Prisma schema, map ke `snake_case` MySQL via `@map()`
- Semua relation wajib punya inverse relation — jangan pernah unidirectional
- Constraint names eksplisit pakai `@@index([...], map: "custom_name")` untuk hindari MySQL constraint name conflicts
- AuditLog memakai pola polymorphic: `entity`, `entityId`, `action`, `userId` — **bukan** relation array

### 2.2 Field Standar
```prisma
model Example {
  id        String   @id @default(cuid())
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now()
  updatedAt DateTime @updatedAt
  @@map("example")
}
```
- Selalu sertakan `isActive`, `createdAt`, `updatedAt`
- `@@map()` wajib untuk nama tabel MySQL

### 2.3 Enum & Relation Pattern
- Enum pakai nama singular: `Role`, `TransactionType`
- Relation ke enum gunakan nama relasional: `role Role @default(STAFF)`

---

## 3. Next.js App Router Conventions

### 3.1 Folder Structure
```
src/
├─ app/
│  ├─ api/                 # API Routes (Route Handlers)
│  ├─ dashboard/
│  │  ├─ superadmin/
│  │  ├─ pimpinan/
│  │  ├─ manager/
│  │  └─ staff/
│  └─ login/
├─ components/
│  ├─ shared/              # Komponen reusable
│  ├─ ui/                  # shadcn/ui
│  └─ icons/
├─ lib/
│  ├─ auth.ts              # NextAuth config, session types
│  ├─ prisma.ts
│  └─ utils/
├─ types/
└─ middleware.ts
```

### 3.2 API Route Pattern
```typescript
// src/app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  // 1. Auth check
  const session = await getServerSession(authConfig);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. RBAC
  const role = session.user.role;
  if (role !== 'PIMPINAN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Zod validation
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) { ... }

  // 4. Prisma query with role-based filtering
  // PIMPINAN → lembagaId from session
  // MANAGER → unitId from session
  const where = role === 'PIMPINAN'
    ? { lembagaId: session.user.lembagaId }
    : { unitId: session.user.unitId };

  // 5. Return standardized response
  return NextResponse.json({ data, summary }, { status: 200 });
}
```

### 3.3 Auth & Session
```typescript
// src/lib/auth.ts
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      unitId: string | null;
      lembagaId: string | null;  // ⚠️ selalu sertakan ini!
    } & DefaultSession['user'];
  }
}
```
- **Jika pakai `session.user.lembagaId` atau `session.user.unitId`** → pastikan sudah didefinisikan di auth.ts module augmentation
- Mobile login: termasuk `lembagaId` di token JWT-nya
- Semua field `string | null` dari DB → gunakan `?? null` di Prisma create/update

### 3.4 Zod Validation Pattern
```typescript
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  amount: z.number().positive('Jumlah harus positif'),
  type: z.enum(['PEMASUKAN', 'PENGELUARAN', 'REKONSILIASI']),
  unitId: z.string().optional(),
  lembagaId: z.string().optional(),
});
```
- Seluruh API input wajib divalidasi dengan Zod
- Schema naming: `createSchema`, `updateSchema`, `querySchema`

---

## 4. Middleware & RBAC

### 4.1 Middleware
```typescript
// Shared paths (akses semua authenticated role)
const SHARED_DASHBOARD_PATHS = [
  '/dashboard/financial-notes',
  '/dashboard/reports',
  '/dashboard/account',
];
```
- Path baru yang butuh diakses >1 role → tambahkan ke `SHARED_DASHBOARD_PATHS`
- Role-specific path: `/dashboard/{role-lowercase}/...`

### 4.2 RBAC Enforcement
- **Di API**: selalu cek `session.user.role` dan `session.user.lembagaId`/`unitId`
- **Di page**: fetch data dengan filter berdasarkan role
- **Di komponen UI**: conditional render berdasarkan role (gunakan enum constant)

---

## 5. UI/UX Conventions

### 5.1 shadcn/ui Components
- Gunakan komponen yang sudah dipasang: `Dialog`, `Label`, `Textarea`, `Select`, `DropdownMenu`, `Alert`
- Warna brand: `bg-brand-600`, `text-white`, `rounded-xl`
- Icons: gunakan `lucide-react`

### 5.2 Form Pattern
```typescript
interface CreateForm {
  name: string;
  code: string;
  isActive: boolean;
  isRetail: boolean;  // untuk Unit
  lembagaId?: string;
}
```
- Form default **wajib** include semua properti interface (hindari TS error)
- Gunakan radio button untuk boolean/toggle choice (misal isRetail)
- Submit handler: async/await, try/catch, toast notifikasi

### 5.3 Layout
- Header + Sidebar (role-based) + MobileBottomNav
- Main content: `min-h-[calc(100vh-120px)]`
- Loading state: `Loader2` dengan `animate-spin`

---

## 6. Android App Guidelines (Kotlin)

### 6.1 Folder
```
_android/                    # Active development (Gradle KTS)
android/                     # Legacy (Gradle Groovy)
```
- Fokus development: `_android/` (gunakan ini)

### 6.2 Network Layer
```kotlin
// ApiService.kt
interface ApiService {
    @GET("units")
    suspend fun getUnits(
        @Header("Authorization") token: String? = null
    ): ApiResponse<List<Unit>>
}

// AuthInterceptor.kt
class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        // Tambahkan Authorization header
    }
}
```
- Gunakan `Authorization: Bearer {token}` untuk request ke `/api/*`
- Session token simpan di `EncryptedSharedPreferences` (via SessionManager)
- Base URL: `https://alba-fintech-v2.vercel.app/api/`

### 6.3 Navigation
```
LoginScreen → DashboardScreen
            → UnitsFragment
            → TransactionsFragment
            → FinancialNotesFragment
```
- Role-based navigation: PIMPINAN → Financial Notes, MANAGER → Inventory/POS (jika retail)

---

## 7. Common Gotchas

1. **Schema Prisma + TypeScript mismatch**: Selalu jalankan `npx prisma generate` setelah edit schema.prisma
2. **Session type**: Jika pakai `session.user.lembagaId` → pastikan sudah ada di type augmentation
3. **Zod vs Prisma type**: Zod optional = `z.string().optional()` → TS type `string | undefined`
4. **date-fns**: Sudah terinstall. Pakai untuk date formatting di financial-notes page
5. **MySQL constraint**: Nama constraint unik — semua `@@index` wajib `map: "unique_name"`
6. **Build**: TypeScript strict mode — semua `string | null` harus dihandle

---

## 8. Development Workflow

```bash
# Development
npm run dev            # Next.js dev server
npx prisma studio      # DB GUI
npx tsc --noEmit       # Type check

# Build
npm run build          # Production build
npx prisma generate    # Setelah schema change

# Database Migration (jika schema berubah)
npx prisma db push       # Update DB schema (dev)
npx prisma migrate dev --name <name>  # Migrasi production
```

### Git Convention
```
feat: short description     (Fitur baru)
fix: short description      (Bug fix)
docs: short description     (Dokumentasi)
refactor: short description (Refactor tanpa perubahan behavior)
```

---

## 9. File Reference Map

| Fitur | File | Deskripsi |
|-------|------|-----------|
| Schema | `prisma/schema.prisma` | Semua model & enum |
| Auth | `src/lib/auth.ts` | NextAuth config, session types |
| Units API | `src/app/api/units/route.ts` | CRUD units dengan isRetail |
| Financial Notes | `src/app/api/financial-notes/route.ts` | PIMPINAN/MANAGER notes |
| Broadcasts | `src/app/api/broadcasts/route.ts` | Draft + send ke semua user |
| AI Chat | `src/app/api/ai/chat/route.ts` | AI chat + broadcast draft |
| Units UI | `src/components/shared/UnitsPage.tsx` | Management unit (SuperAdmin) |
| AI UI | `src/components/shared/AIAssistantPage.tsx` | AI chat + broadcast composer |
| Notes UI | `src/app/dashboard/pimpinan/financial-notes/page.tsx` | Halaman catatan keuangan |
| Sidebar | `src/components/Sidebar.tsx` | Role-based navigation |
| Mobile Nav | `src/components/MobileBottomNav.tsx` | Mobile navigation |

---

## 10. Testing & Quality

- **TypeScript**: `npx tsc --noEmit` harus 0 error
- **Build**: `npm run build` harus sukses
- **API Test**: Gunakan endpoint dengan auth header
- **DB Schema**: Validasi di `prisma generate` — semua relation harus balanced
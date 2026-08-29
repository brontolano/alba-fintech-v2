# 📜 Project Rules — ALBA Finance v2

## 1. Skill Usage Policy

> **Semua agent (web & android) Wajib membaca file skill ini sebelum bekerja.**

- Skill file: `ai-skills/roles/Senior-Developer/ALBA-Finance-v2-Skill.md`
- Jika menemukan masalah yang termasuk dalam scope skill → gunakan guidelines yang ada
- Jika tidak yakin — gunakan tools pencarian (`grep_search`, `read_file`, `file_search`) untuk cross-check sebelum memutuskan

## 2. Web Stack Rules

### 2.1 Auth & Session
- ✅ Wajib gunakan `authConfig` dari `src/lib/auth.ts` untuk semua API endpoint
- ✅ Jika pakai `session.user.lembagaId` atau `session.user.unitId` → pastikan sudah ada di module augmentation
- ✅ Mobile login (`/api/mobile/auth/login`) harus return `lembangaId` di token

### 2.2 Prisma
- ✅ Selalu jalankan `npx prisma generate` setelah edit `prisma/schema.prisma`
- ✅ Semua relation harus punya inverse (bidirectional)
- ✅ Naming convention: `@@index([...], map: "unique_name")` untuk hindari MySQL constraint conflict
- ✅ AuditLog = polymorphic (entity, entityId) — jangan pakai `AuditLog[]` relation array

### 2.3 TypeScript
- ✅ `npx tsc --noEmit` harus 0 error sebelum commit
- ✅ Zod validation wajib di semua API endpoint
- ✅ Handle `string | null` dari Prisma ke `string | null | undefined` — gunakan `?? null`

## 3. Android Rules

### 3.1 Development folder
- ✅ Fokuskan development di `_android/` (Gradle KTS), bukan `android/` (legacy)

### 3.2 Network
- ✅ Gunakan Retrofit + OkHttp interceptor (`AuthInterceptor.kt`)
- ✅ Base URL: `https://alba-fintech-v2.vercel.app/api/`
- ✅ Auth: `Authorization: Bearer {token}` header

### 3.3 Navigation
- ✅ Role-based: PIMPINAN → Financial Notes, MANAGER → Retail module, STAFF → Transactions

## 4. Build Verification

### Pre-commit checklist
1. `npx tsc --noEmit` — 0 error ✅
2. `npm run build` — success ✅
3. `npx prisma generate` — sudah dijalankan jika schema berubah ✅

## 5. Commit Convention

```
feat: short description
fix: short description
docs: short description
refactor: short description
```

## 6. Dokumentasi

- ✅ Update `MEMORY.md` setiap milestone penting
- ✅ Update `README.md` jika ada API baru atau fitur signifikan
- ✅ Skill file wajib up-to-date seiring perubahan arsitektur
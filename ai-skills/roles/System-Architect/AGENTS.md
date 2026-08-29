# AGENTS.md — System Architect Role Agent

> Persona ini mewakili **System Architect** dari ALBA Finance v2. Fokus pada desain arsitektur sistem, integrasi komponen, dan keputusan teknis jangka panjang.

## Tugas Utama
1. **High-level architecture** — menjaga keutuhan struktur Lembaga→Unit→User
2. **Modul dependencies** — memastikan modul independen & komunikasi via Service/Event
3. **Data architecture** — ERD, indexing, constraints, performance (Prisma + MySQL)
4. **Integration design** — API contracts, webhook, event-driven (broadcast notifikasi)
5. **Scalability planning** — roadmap ke multi-database, read-replica, microservices

## Tech Stack
- **Web App**: Next.js 14.2.18, Prisma 6.19.3, MySQL 8.0, NextAuth 4.24.15
- **Mobile**: Kotlin + Retrofit (di `_android/`)
- **AI**: AI Chat API (broadcast draft generation)
- **Infra**: Hostinger VPS (deployment via `docker-compose.yml`/`server.js`)

## Arsitektur Referensi

```mermaid
graph TD
    DNS[Custom Domain] --> Vercel[Next.js App]
    Vercel --> MySQL[(MySQL 8.0)]
    Vercel --> Redis[(Redis Cache)]
    Vercel --> Storage[(File Storage)]
    Android [_android/] --> Vercel
    AIChat[AI Chat API] --> Vercel
```

## Modul Dependency Graph

```
Core
├── Auth (NextAuth: SUPERADMIN, PIMPINAN, MANAGER, STAFF)
├── Units (Lembaga → Unit hierarchy)
├── Transactions (Staff CRUD, Manager approval)
├── Financial Notes (Pimpinan recording, Manager reconciliation)
├── Broadcast (Pimpinan send, all users receive)
├── AI Assistant (Broadcast draft generation)
└── Mobile (Kotlin Retrofit client)
```

## Aturan Arsitektur (WAJITU)

### 1. Tenant Isolation (Lembaga-level)
- Semua tabel domain wajib punya kolom `lembagaId` (PIMPINAN scope) atau `unitId` (MANAGER scope)
- Semua API wajib filter berdasarkan scope role dari session
- **DILARANG** query cross-lembaga / cross-unit tanpa filter role yang tepat

### 2. RBAC & Scope
- PIMPINAN scope = `session.user.lembagaId`
- MANAGER scope = `session.user.unitId`
- STAFF scope = `session.user.unitId`
- SUPERADMIN scope = global

### 3. Data Integrity
- FK ke `lembagaId` / `unitId` harus pada tenant yang sama
- Unique constraint: `(lembagaId, code)` untuk entitas ber-identifier
- Index wajib: `lembagaId`, `unitId`, `status`, `createdAt`

### 4. Security
- Satu auth (NextAuth) — TIDAK BOLEH ada modul dengan auth sendiri
- Semua request lewat middleware: auth check + RBAC + shared path check
- Audit log: gunakan entitas `AuditLog` dengan polymorphic pattern (entity, entityId)

## Scalability Roadmap

| Phase | Target | Timeline |
|---|---|---|
| T0–T3 | Single database, row-level isolation (lembagaId/unitId filter) | Sekarang |
| T3+ | Partition per lembaga | Setelah 50+ lembaga aktif |
| T4+ | Read-replica untuk reporting | Saat query report menjadi bottleneck |

## File Konfigurasi Kunci
- `prisma/schema.prisma` — semua model
- `src/lib/auth.ts` — NextAuth config + session types
- `src/middleware.ts` — route protection & RBAC
- `docker-compose.yml` — deployment config
- `server.js` — custom server (jika ada)

## Prompting Guide
> **Contoh pertanyaan ke AI:**  
> "Sebagai System Architect, desainkan cara modul Financial Notes berkomunikasi ke Broadcast saat pimpinan mengirim notifikasi keuangan ke semua unit. Jelaskan apakah pakai event, service, atau model binding — beri contoh kode."
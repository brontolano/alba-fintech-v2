# AGENTS.md — Developer (Junior) Role Agent

> Persona ini mewakili **Junior Developer** yang butuh panduan step-by-step dan banyak contoh.

## Tugas Utama
1. **Mengikuti task dari Senior Developer** — implementasi fitur kecil
2. **Menulis code yang bersih** — ikuti konvensi yang diberikan
3. **Memperbaiki bug** — dari issue tracker
4. **Belajar & bertanya** — jangan takut kesalahan, tapi pelajari

## Referensi Wajib Baca
1. `AGENTS.md` (file ini)
2. `ai-skills/roles/Senior-Developer/ALBA-Finance-v2-Skill.md`
3. `.github/PROJECT_RULES.md`
4. `docs/PRD.md` / `docs/FRD.md`

## Contoh Task
> "Tambahkan field `description` ke model BroadcastMessage di Prisma schema, update API, dan tampilkan di form AI Assistant."

### Langkah-Langkah:
1. Buka `prisma/schema.prisma` → cari model `BroadcastMessage`
2. Tambahkan field `description String?`
3. Jalankan `npx prisma generate`
4. Buka `src/app/api/broadcasts/route.ts` → update Zod schema + Prisma select
5. Buka `src/components/shared/AIAssistantPage.tsx` → tambahkan field di form
6. Jalankan `npx tsc --noEmit` — pastikan 0 error
7. Jalankan `npm run build` — pastikan sukses
8. Commit: `feat(api): add description to BroadcastMessage`

## Learning Path Pertama
1. Baca `AGENTS.md` ini + skill file Senior-Developer
2. Baca `prisma/schema.prisma` — pahami model User, Lembaga, Unit, Role
3. Baca `src/lib/auth.ts` — pahami session type & RBAC
4. Clone repo → `npm install` → `npm run dev` → login
5. Temukan issue "good first issue" → minta Senior assign

## Prompting Guide
> **Contoh pertanyaan ke AI:**  
> "Sebagai junior developer, bantu saya menambahkan field 'notes' ke model FinancialNote. Tunjukkan file apa saja yang harus diedit dan berikan contoh kode Prisma schema + Zod validation."
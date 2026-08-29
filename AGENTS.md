# AGENTS.md — ALBA Finance v2

## Project Structure
- **Web**: Next.js 14 + Prisma + NextAuth (App Router)
- **Android**: Kotlin + Retrofit (lihat `_android/`)
- **Schema**: `prisma/schema.prisma`
- **Auth**: `src/lib/auth.ts`

## Skill Reference
Baca dulu: `ai-skills/roles/Senior-Developer/ALBA-Finance-v2-Skill.md`

## Rules
Lihat `.github/PROJECT_RULES.md`

## Quick Commands
```bash
npm run dev          # development
npx tsc --noEmit     # type-check (MUST be 0 error)
npm run build        # production build
npx prisma generate  # after schema changes
```

## Pre-commit Checklist
- [ ] `npx tsc --noEmit` — 0 error
- [ ] `npm run build` — success
- [ ] Schema changes → `npx prisma generate`
- [ ] README.md + MEMORY.md terupdate
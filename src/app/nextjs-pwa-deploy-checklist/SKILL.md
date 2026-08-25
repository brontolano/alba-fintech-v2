---
skill: nextjs-pwa-deploy-checklist
category: devops
name: Next.js PWA Deployment Checklist
description: Use when preparing a Next.js 14 App Router application for production deployment with PWA capabilities, especially to Hostinger standalone hosting. Covers dependency audit, schema validation, API consistency, RBAC verification, PWA setup, and build verification steps.
---

# Next.js PWA Deployment Checklist

## Core Verification Steps

1. **Dependency Audit**
   - Verify all UI components referenced exist (`Dialog`, `Label`, `Textarea`, `Select`, `Alert`, etc.)
   - Ensure no mismatched imports between `@/components/ui` (index) vs individual file imports
   - Check `package.json` has consistent versions

2. **Schema & ORM Validation**
   - Run `npx prisma generate` after any schema changes
   - Verify all Prisma models referenced in API routes exist in `schema.prisma`
   - Run `npx prisma db push` or `prisma migrate deploy` locally

3. **API Consistency**
   - All API routes must use `{ data: ... }` response shape
   - All API routes must have Zod validation on input body
   - Use `getServerSession(authConfig)` for auth checks in every API route
   - Return proper HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500)

4. **RBAC Verification**
   - Middleware protects `/dashboard/*` routes
   - Page-level guards check session role
   - API routes validate role before processing
   - Role-based data filtering in queries (e.g., STAFF sees only own transactions)

5. **PWA Setup**
   - `manifest.json` in `/public`
   - Service worker at `/public/sw.js`
   - Offline fallback page at `/public/offline.html`
   - Icons in multiple sizes (72x72 through 512x512) — use SVG fallback if PNG not available
   - `next.config.mjs` includes proper headers for SW caching

6. **Build Verification**
   - `npm run lint` passes (or `eslint.ignoreDuringBuilds` set appropriately)
   - `npm run build` succeeds with no warnings
   - Production build tested with `npm start` locally
   - Environment variables tested with `.env.production`

## Hostinger-Specific Gotchas

- Hostinger cannot run `npx` commands — all Prisma generation and builds must happen locally
- Use `output: 'standalone'` in `next.config.mjs` for deployment compatibility
- Env vars must be set in hPanel → Node.js App
- Prisma engine binaries must be copied to standalone build if using non-local DB

## Session Learnings

### API Response Shape Fix
Many pages expected `{ data.units }` but API returned `{ data: [...units] }`. Fix: always use `{ data: result, meta: {...} }` shape and update pages to destructure correctly.

### UI Component Import Issue  
Pages import from `@/components/ui/dialog` but component files did not exist. Solutions:
1. Create the missing component files (`dialog.tsx`, `label.tsx`, `textarea.tsx`, etc.)
2. Ensure `index.ts` exports all components
3. Match shadcn/ui API style for Dropdowns, Select, etc.

### Schema/API Mismatch
`/api/accounts` referenced `prisma.account` when no `Account` model existed in schema. Always verify schema has all referenced models.

## Verification Checklist Before Deploy
```bash
npm run lint
npm run build
npm run prisma generate
npm run deploy:prepare
```

## Common Fix Patterns

### Making API responses consistent:
```ts
// Always use this pattern:
return NextResponse.json({ 
  data: result,
  meta: { count: result.length }
});
```

### Role-based middleware redirect:
```ts
const ROLE_HOMES: Record<Role, string> = {
  SUPERADMIN: '/dashboard/superadmin',
  PIMPINAN: '/dashboard/pimpinan',
  MANAGER: '/dashboard/manager',
  STAFF: '/dashboard/staff',
};
```

## Pitfalls

- Don't mix CommonJS and ESM imports — Next.js 14 App Router supports both but can cause runtime issues with NextAuth session callbacks
- Always validate Zod schema before database operations to prevent SQL injection-like errors through Prisma
- PWA service workers can cause issues during development — consider disabling in dev mode
- Hostinger's Node.js environment doesn't support `npx` — all Prisma generation must be done locally before deploy

---
name: alba-finance-development
description: "ALBA Finance v2 Next.js + Prisma development patterns and pitfalls."
version: 0.1.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [nextjs, prisma, development, patterns, pitfalls]
    related_skills: []
---

# ALBA Finance v2 Development Patterns

Development patterns and common pitfalls for the ALBA Finance v2 project (Next.js 14 App Router, Prisma 6, MySQL).

## When to Use

Use this skill when:
- Working with Prisma 6 schema and relation definitions
- Building Next.js App Router pages with client-side interactions
- Debugging build or type errors in ALBA Finance v2
- Following UI component conventions (shadcn/ui)

## Common Pitfalls & Fixes

### 1. Prisma Relation Syntax (CRITICAL)

**Problem**: Prisma v6 requires explicit space in relation field definitions

```prisma
# ❌ WRONG - causes P1012 validation error
approvedBy   User?  @relation("TransactionApprover", fields=[approvedById], references=[id])

# ✅ CORRECT - must have space after comma
approvedBy   User?  @relation("TransactionApprover", fields: [approvedById], references: [id])
```

**Error symptom**: `P1012: This line is not a valid field or attribute definition`

**Fix**: Always use `fields: [name], references: [name]` format with space after commas in relation definitions.

---

### 2. Next.js App Router Client Components

**Problem**: Components using `useState`, `useEffect`, or browser APIs must be client components

**Solution**: Always add `'use client'` at the top of page components that:
- Use React hooks (useState, useEffect, etc)
- Call fetch directly
- Use interactive elements

```tsx
'use client';

import { useEffect, useState } from 'react';
// ... rest of component
```

---

### 3. shadcn/ui Component Constants

#### Badge Variants
```tsx
// ✅ VALID variants only
<Badge variant="default" />   // blue
<Badge variant="success" />   // green  
<Badge variant="warning" />   // amber
<Badge variant="danger" />    // red (NOT 'destructive')
<Badge variant="info" />      // sky (NOT 'secondary')
<Badge variant="outline" />   // transparent/border
```

#### Modal Props
```tsx
// ✅ Modal uses 'onClose', NOT 'onOpenChange'
<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Title"
>
  Content
</Modal>
```

---

### 4. API-URL Synchronization

**Problem**: Page URLs don't always match API endpoint paths

**Solution**: Verify API routes exist before using in fetch calls:
- `/api/unit-reconciliation` - daily unit reconciliation
- `/api/transactions/[id]/reconcile` - approve/reject transaction
- `/api/reports/unit-summary` - unit financial summary
- `/api/reports/lembaga` - lembaga-wide report

---

## File Structure Reference

### API Routes
```
src/app/api/
├── unit-reconciliation/route.ts    # GET/POST per-unit daily
├── transactions/[id]/reconcile/route.ts  # PATCH approve/reject
├── reports/unit-summary/route.ts   # GET summary
└── reports/lembaga/route.ts        # GET lembaga report
```

### Dashboard Pages (Client Components)
```
src/app/dashboard/
├── manager/rekonsiliasi/page.tsx    # Daily reconciliation
└── pimpinan/reports/page.tsx        # Monthly reports
```

---

## 🔗 API Integration Pattern

Pages fetch from API endpoints:

```tsx
const fetchReconciliation = async (date: Date) => {
  const res = await fetch(`/api/unit-reconciliation?date=${date.toISOString().split('T')[0]}`);
  const result = await res.json();
  setData(result.data);
};
```

Call fetch in useEffect or event handler, not at module level for client components.

---

## Verification Checklist

Before commit:
- [ ] `npx prisma generate` - run after any schema change
- [ ] `npx tsc --noEmit` - must pass with 0 errors
- [ ] `npm run build` - must succeed
- [ ] Check all Badge/Modal variants are valid
- [ ] Ensure relation fields have proper spacing in schema.prisma
- [ ] Add `'use client'` to pages using hooks

---

## References

- `references/prisma-migration-errors.md` - error transcripts and fixes
- `references/ui-component-reference.md` - shadcn/ui variant mappings
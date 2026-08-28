# ALBA-APPS — Design System & UI/UX Guidelines

> **Sumber Inspirasi:** [UI UX Pro Max Skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)  
> **Framework:** React + TypeScript + Tailwind CSS + shadcn/ui  
> **Tanggal:** 2026-08-08

---

## 1. Design System Overview

### 1.1 Product Type & Recommended Pattern
**ALBA-APPS** adalah aplikasi **Enterprise Financial Management** (akuntansi, inventory, POS, koperasi) untuk institusi pendidikan.

**Recommended Pattern:** `Trust & Authority` + `Feature-Rich Showcase`
- Hero section menampilkan ringkasan keuangan (saldo, transaksi hari ini)
- Social proof: audit trail, approval workflow, role-based access
- CTA: "Input Transaksi", "Lihat Laporan", "Sync Data"

**Style Priority:**
1. **Soft UI Evolution** (modern enterprise, SaaS) — prioritas utama
2. **Minimalism & Swiss Style** (enterprise apps, dashboards)
3. **Dimensional Layering** (dashboards, card layouts, modals)

---

## 2. Color Palette (Enterprise Finance Theme)

### 2.1 Primary Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#1E3A5F` | Header, primary buttons, brand |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--secondary` | `#4A90A4` | Secondary actions, accents |
| `--accent` | `#E8B923` | Highlights, warnings, gold accent |
| `--success` | `#10B981` | Income, positive balance |
| `--danger` | `#EF4444` | Expense, negative, errors |
| `--warning` | `#F59E0B` | Pending approval, alerts |

### 2.2 Neutral & Surface
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `#F8FAFC` | `#0F172A` | Page background |
| `--surface` | `#FFFFFF` | `#1E293B` | Cards, modals |
| `--surface-2` | `#F1F5F9` | `#334155` | Nested surfaces |
| `--border` | `#E2E8F0` | `#475569` | Dividers, inputs |
| `--text-primary` | `#0F172A` | `#F8FAFC` | Headings, body |
| `--text-secondary` | `#64748B` | `#94A3B8` | Captions, muted |

### 2.3 Semantic Color Rules
- **Income/Positive:** Gunakan `--success` (hijau)
- **Expense/Negative:** Gunakan `--danger` (merah)
- **Pending/Neutral:** Gunakan `--warning` (amber)
- **Approved/Complete:** Gunakan `--success`

---

## 3. Typography

### 3.1 Font Stack
```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 3.2 Type Scale
| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| `h1` | 32px | 700 | 1.2 | Page titles |
| `h2` | 24px | 600 | 1.3 | Section headers |
| `h3` | 20px | 600 | 1.4 | Card titles |
| `body` | 16px | 400 | 1.5 | Default text |
| `small` | 14px | 400 | 1.5 | Secondary text |
| `caption` | 12px | 500 | 1.4 | Labels, badges |

### 3.3 Font Pairing
- **Headings:** Inter (clean, professional)
- **Body:** Inter (readability)
- **Numbers/Money:** JetBrains Mono (tabular alignment)

---

## 4. Layout & Spacing System

### 4.1 Container & Breakpoints
```css
--container-max: 1280px;
--gutter: 24px;

Breakpoints:
- Mobile: < 640px
- Tablet: 640px – 1024px
- Desktop: > 1024px
```

### 4.2 Spacing Scale (8px rhythm)
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
```

### 4.3 Layout Patterns
| Pattern | Max Width | Use Case |
|---------|-----------|----------|
| `narrow` | 800px | Forms, login, settings |
| `standard` | 1200px | Dashboards, tables |
| `wide` | 1440px | Reports, data-heavy pages |

---

## 5. Component Guidelines

### 5.1 Buttons
| Variant | Background | Text | Border | Use |
|---------|------------|------|--------|-----|
| Primary | `--primary` | White | None | Main actions |
| Secondary | Transparent | `--primary` | `--primary` | Alternative |
| Success | `--success` | White | None | Approve, Save |
| Danger | `--danger` | White | None | Delete, Reject |
| Ghost | Transparent | `--text-primary` | None | Cancel, Close |

**Rules:**
- Minimum touch target: `44×44px`
- Icon + label spacing: `8px`
- Loading state: spinner + disabled
- No emoji as icons — use **Lucide React**

### 5.2 Cards
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: var(--space-5);
}
```

**Elevation:**
- Level 0: Page background
- Level 1: Cards (default)
- Level 2: Modals, dropdowns
- Level 3: Tooltips, popovers

### 5.3 Tables
- Header: `--surface-2`, bold, uppercase 12px
- Rows: alternating `--surface` / `--surface-2`
- Hover: subtle `--primary` tint (5% opacity)
- Numbers: right-aligned, mono font
- Status badges: inline, color-coded

### 5.4 Forms
- Labels: always visible, 14px, medium weight
- Inputs: 40px height, 12px padding, border radius 8px
- Error: red border + message below field
- Helper text: gray, below input
- Required indicator: asterisk after label

### 5.5 Badges & Status
| Status | Color | Icon |
|--------|-------|------|
| Approved | `--success` | CheckCircle |
| Pending | `--warning` | Clock |
| Rejected | `--danger` | XCircle |
| Draft | `--text-secondary` | FileText |

---

## 6. Navigation & Information Architecture

### 6.1 Top Navigation (AppLayout)
```
[Logo ALBA] | Dashboard | Master Data | Transaksi | Kantin | Koperasi | Ledger | Reports | [User Avatar]
```

### 6.2 Sidebar (when needed)
- Collapsible on mobile
- Active state: left border accent + bold text
- Icons from Lucide (consistent set)

### 6.3 Breadcrumbs
```
Dashboard > Transaksi > Input Baru
```
- Use on pages deeper than 2 levels

---

## 7. Accessibility (WCAG AA)

### 7.1 Contrast Requirements
- Body text: minimum **4.5:1** against background
- Large text (18px+): minimum **3:1**
- Interactive elements: visible focus ring (2px, `--primary`)

### 7.2 Keyboard Navigation
- All interactive elements reachable via Tab
- Focus visible and logical order
- Escape key closes modals/dropdowns

### 7.3 Screen Reader
- All icons have `aria-label` or `aria-hidden`
- Form inputs have associated labels
- Tables have proper headers (`<th scope="col">`)

---

## 8. Animation & Motion

### 8.1 Duration & Easing
```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;

--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);
```

### 8.2 Allowed Animations
- Fade in/out (opacity)
- Slide up/down (transform + opacity)
- Scale (modals, tooltips) — max 1.02x

### 8.3 Forbidden
- Layout-shifting transforms (scale on hover that moves content)
- Animating width/height (use transform instead)
- Decorative-only animations without meaning

---

## 9. Dark Mode

### 9.1 Toggle
- System preference detection + manual toggle
- Persist in localStorage

### 9.2 Dark Mode Rules
- Primary text contrast ≥ 4.5:1 on dark surfaces
- Secondary text ≥ 3:1
- Borders/dividers visible in both themes
- State contrast parity (pressed/focused/disabled)

---

## 10. Pre-Delivery Checklist

Sebelum commit UI code, verifikasi:

### Visual Quality
- [ ] Tidak ada emoji sebagai icon (gunakan Lucide)
- [ ] Semua icon dari set yang konsisten
- [ ] `cursor-pointer` pada semua elemen clickable
- [ ] Tidak ada layout shift saat hover
- [ ] Contrast ratio minimal 4.5:1

### Interaction
- [ ] Touch target minimal 44×44px
- [ ] Loading state pada semua async actions
- [ ] Error handling & user feedback
- [ ] Focus states visible

### Layout
- [ ] Mobile-first responsive
- [ ] Tidak ada horizontal scroll unintended
- [ ] Consistent spacing (8px rhythm)
- [ ] Safe area compliance (jika mobile)

### Accessibility
- [ ] Alt text pada semua gambar
- [ ] ARIA labels pada icon-only buttons
- [ ] Keyboard navigation works
- [ ] Form labels visible & associated

### Light/Dark Mode
- [ ] Semua komponen support dark mode
- [ ] Border/divider visible di kedua theme
- [ ] State contrast parity

---

## 11. Technology Stack Alignment

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | React 18 + TypeScript | Strict mode enabled |
| Styling | Tailwind CSS 3.4 | Custom design tokens |
| Components | shadcn/ui + Radix | Accessible primitives |
| Icons | Lucide React | Consistent icon set |
| State | React Context + TanStack Query | Server state management |
| Forms | React Hook Form + Zod | Validation |
| Charts | Recharts | Financial visualizations |

---

## 12. Anti-Patterns to Avoid

| Anti-Pattern | Why |
|--------------|-----|
| Mixing flat & skeuomorphic randomly | Visual inconsistency |
| Emoji as icons | Unprofessional, inconsistent sizing |
| Low contrast text | Accessibility violation |
| Layout-shifting hovers | Poor UX |
| Raw hex values in components | Hard to maintain theme |
| Fixed px container widths | Breaks responsive |
| Placeholder-only labels | Accessibility issue |
| Instant state changes (0ms) | Feels broken |

---

## 13. References

- [UI UX Pro Max — Quick Reference](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/references/quick-reference.md)
- [Pro Rules & Pre-Delivery Checklist](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/references/pro-rules.md)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

*Design System ini wajib diikuti untuk semua pengembangan UI ALBA-APPS.*
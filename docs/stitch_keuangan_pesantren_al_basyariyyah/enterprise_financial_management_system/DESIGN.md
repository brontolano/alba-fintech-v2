---
name: Enterprise Financial Management System
colors:
  surface: '#faf9fc'
  surface-dim: '#dad9dd'
  surface-bright: '#faf9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f7'
  surface-container: '#eeedf1'
  surface-container-high: '#e9e7eb'
  surface-container-highest: '#e3e2e6'
  on-surface: '#1a1c1e'
  on-surface-variant: '#43474e'
  inverse-surface: '#2f3033'
  inverse-on-surface: '#f1f0f4'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f87'
  primary: '#022448'
  on-primary: '#ffffff'
  primary-container: '#1e3a5f'
  on-primary-container: '#8aa4cf'
  inverse-primary: '#adc8f5'
  secondary: '#16677a'
  on-secondary: '#ffffff'
  secondary-container: '#a2e7fd'
  on-secondary-container: '#1b697c'
  tertiary: '#341f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#503300'
  on-tertiary-container: '#c69b5f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#adc8f5'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#2d486d'
  secondary-fixed: '#b1ecff'
  secondary-fixed-dim: '#8cd1e6'
  on-secondary-fixed: '#001f27'
  on-secondary-fixed-variant: '#004e5e'
  tertiary-fixed: '#ffddb2'
  tertiary-fixed-dim: '#edbf7f'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#60410c'
  background: '#faf9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e3e2e6'
typography:
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  small:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
  tabular-nums:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  space-1: 4px
  space-2: 8px
  space-3: 12px
  space-4: 16px
  space-5: 24px
  space-6: 32px
  space-7: 48px
  space-8: 64px
  gutter: 24px
  container-max: 1280px
---

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
1. **Soft UI Evolution** (modern enterprise, SaaS) — prioritas utama dengan sudut membulat (pill-shaped)
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

---

## 5. Shape Language (Pill-shaped)

The system utilizes a high degree of roundedness (`roundedness: 3`) to soften the enterprise interface.
- **Base radius (DEFAULT):** 1rem (16px) for standard components and inputs.
- **Large radius (lg/xl):** 2rem to 3rem for main containers and large cards.

---

## 6. Component Guidelines

### 6.1 Buttons
| Variant | Background | Text | Border | Use |
|---------|------------|------|--------|-----|
| Primary | `--primary` | White | None | Main actions (pill-shaped) |
| Secondary | Transparent | `--primary` | `--primary` | Alternative (pill-shaped) |
| Success | `--success` | White | None | Approve, Save |
| Danger | `--danger` | White | None | Delete, Reject |
| Ghost | Transparent | `--text-primary` | None | Cancel, Close |

---
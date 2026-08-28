---
name: Al-Basyariyyah Finance Core
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#414754'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc0'
  primary: '#0059bb'
  on-primary: '#ffffff'
  primary-container: '#0070ea'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc7ff'
  secondary: '#705d00'
  on-secondary: '#ffffff'
  secondary-container: '#fcd400'
  on-secondary-container: '#6e5c00'
  tertiary: '#006b24'
  on-tertiary: '#ffffff'
  tertiary-container: '#008730'
  on-tertiary-container: '#f7fff2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc7ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#ffe16d'
  secondary-fixed-dim: '#e9c400'
  on-secondary-fixed: '#221b00'
  on-secondary-fixed-variant: '#544600'
  tertiary-fixed: '#83fc8e'
  tertiary-fixed-dim: '#66df75'
  on-tertiary-fixed: '#002106'
  on-tertiary-fixed-variant: '#00531a'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base-unit: 8px
  gutter-sm: 16px
  gutter-lg: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  max-content-width: 1280px
---

## Brand & Style

The design system for Pondok Pesantren Al-Basyariyyah centers on a **Corporate / Modern** aesthetic, specifically tailored for institutional financial management. The brand personality is rooted in three pillars: **Trust (Amanah)**, **Clarity (Wadhah)**, and **Efficiency (Kifayah)**.

The UI should evoke a sense of stability and professional oversight. By leveraging a structured layout with generous whitespace, the design system minimizes cognitive load for administrators handling complex tuition, endowment, and operational data. It balances the traditional values of the institution with a contemporary, data-driven interface that feels reliable and future-proof.

## Colors

The palette is derived directly from the institution's heritage while being optimized for digital accessibility.

- **Primary Blue (#007BFF):** Used for primary actions, navigational elements, and brand identity. It represents professionalism and authority.
- **Secondary Gold (#FFD700):** Used sparingly as an accent for highlights, premium status, or specific "featured" financial milestones.
- **Tertiary Green (#28A745):** Utilized for success states, "Inflow" indicators, and completed payment confirmations, symbolizing growth and vitality.
- **Neutrals:** A range of cool grays and off-whites provides the foundation for the UI, ensuring that the primary colors remain impactful without overwhelming the user.

## Typography

This design system uses a triple-font approach to maximize legibility and hierarchy:

- **Manrope (Headlines):** A modern, geometric grotesque that provides a professional and balanced look for page titles and section headers.
- **Work Sans (Body):** Selected for its exceptional readability at small sizes, crucial for scanning financial statements and long-form ledgers.
- **IBM Plex Sans (Labels & Data):** A systematic font used for technical data, form labels, and UI controls. Its clear structure helps differentiate interactive elements from static text.

All numerical data should use tabular figures (monospaced numbers) to ensure decimal points align perfectly in financial tables.

## Layout & Spacing

The system employs a **Fixed Grid** philosophy for desktop to maintain structural integrity of complex financial dashboards, transitioning to a fluid model for mobile.

- **Desktop (12-column):** 1280px max-width, 24px gutters, 48px outer margins. Content is organized in a "Dashboard Layout" with a persistent left sidebar.
- **Tablet (8-column):** Fluid width, 16px gutters, 32px outer margins. Sidebar collapses into a drawer.
- **Mobile (4-column):** Fluid width, 16px gutters, 16px outer margins. Lists replace wide tables.

Spacing follows a strict 8px linear scale. Internal card padding should consistently be `24px` to allow data to breathe.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Low-Contrast Outlines**.

- **Surface Levels:** The background uses a light neutral (#F8F9FA). Interactive cards and containers use a pure white (#FFFFFF) surface.
- **Outlines:** Instead of heavy shadows, use a 1px border (#E9ECEF) for containers. This keeps the interface feeling "flat" and professional, like a physical ledger.
- **Shadows:** Use a single, subtle "Ambient Shadow" for floating elements (modals, dropdowns): `0px 4px 20px rgba(0, 0, 0, 0.05)`.
- **Active State:** Deepen the border color or add a subtle inner glow to signify focus or selection.

## Shapes

The design system adopts a **Pill-shaped** language. This significant roundedness (16px - 48px) balances modern approachability with a friendly, contemporary aesthetic.

- **Buttons & Inputs:** 16px (Pill-style) to maintain a soft, friendly, and highly modern edge.
- **Cards & Modals:** 32px (Rounded-xl) to soften the container edges and define clear, approachable content areas.
- **Status Pills:** 999px (Full Pill) for quick scanning of transaction statuses.

## Components

- **Buttons:** Primary buttons use the Primary Blue with white text and a 16px corner radius. Ghost buttons use a 1px Blue border. Destructive actions use a subtle red, while secondary "save" actions can utilize the Tertiary Green.
- **Input Fields:** Standardized height of 44px with a 16px corner radius. Use a subtle gray border (#DEE2E6) that turns Primary Blue on focus. Labels must always be visible above the field.
- **Cards:** The primary vehicle for information, featuring a prominent 32px corner radius. Every card should have a 1px border and a subtle white-to-gray vertical gradient to suggest depth.
- **Data Tables:** High-density rows (48px height) with light dividers. Use "Zebra Striping" for tables with more than 10 rows.
- **Status Chips:** Full pill-shaped indicators.
    - *Paid:* Green background (10% opacity) with Green text.
    - *Pending:* Gold background (10% opacity) with Dark Gold text.
    - *Overdue:* Red background (10% opacity) with Red text.
- **Financial Summary Cards:** Large-scale components at the top of dashboards featuring Primary Blue icons and Manrope Bold typography for "Total Balance" or "Monthly Revenue."
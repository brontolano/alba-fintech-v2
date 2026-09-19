# Finzo Design Analysis

## Overview

Finzo adalah aplikasi fintech dengan dua mode tema: Light Mode dan Dark Mode.

## Color Palette

### Light Mode

- **Primary Color**: #6366F1 (Indigo 500) - digunakan untuk tombol utama dan aksi penting
- **Secondary Color**: #8B5CF6 (Violet 500) - akcent dan elemen tidak utama
- **Background**: #F9FAFB (Gray 50) - latar belakang utama
- **Surface**: #FFFFFF (White) - kartu dan elemen datar
- **Text Primary**: #1F2937 (Gray 800) - teks utama
- **Text Secondary**: #6B7280 (Gray 500) - teks sekunder
- **Border**: #E5E7EB (Gray 200) - batas elemen

### Dark Mode

- **Primary Color**: #6366F1 (Indigo 500) - konsisten dengan light mode
- **Secondary Color**: #A855F7 (Violet 500) - sedikit lebih terang untuk kontras
- **Background**: #111827 (Gray 900) - latar belakang gelap
- **Surface**: #1F2937 (Gray 800) - permukaan gelap
- **Text Primary**: #F9FAFB (Gray 50) - teks utama pada latar gelap
- **Text Secondary**: #9CA3AF (Gray 400) - teks sekunder
- **Border**: #374151 (Gray 700) - batas gelap

## Typography

### Font Family

- **Primary Font**: Inter (atau font sans-serif system)
- **Font Weights**: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)

### Text Hierarchy

| Element | Size | Weight | Color (Light) | Color (Dark) |
| ------- | ---- | ------ | ------------- | ------------ |
| H1      | 32px | 700    | Gray 900      | Gray 50      |
| H2      | 24px | 600    | Gray 800      | Gray 100     |
| H3      | 20px | 600    | Gray 700      | Gray 200     |
| Body    | 16px | 400    | Gray 800      | Gray 100     |
| Small   | 14px | 400    | Gray 600      | Gray 300     |
| Caption | 12px | 400    | Gray 500      | Gray 400     |

## Spacing Scale

- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 20px
- **2xl**: 24px
- **3xl**: 32px
- **4xl**: 40px

## Components

### Buttons

- **Primary Button**: Background Indigo 500, White text, Rounded corners (8px)
- **Secondary Button**: Transparent background, Indigo 500 border, Indigo 500 text
- **Ghost Button**: Transparent background, Gray 600 text, no border

### Cards

- **Background**: White (Light) / Gray 800 (Dark)
- **Border Radius**: 12px
- **Shadow**: Light: 0 1px 3px rgba(0,0,0,0.1); Dark: 0 1px 3px rgba(0,0,0,0.3)

### Input Fields

- **Background**: White (Light) / Gray 800 (Dark)
- **Border**: Gray 300 (Light) / Gray 600 (Dark)
- **Focus Ring**: Indigo 500

### Navigation

- **Sidebar**: Fixed width 250px
- **Top Nav**: Height 64px
- **Active State**: Indigo 500 background with 20% opacity

## Icons

- **Library**: Phosphor Icons (@phosphor-icons/react)
- **Style**: Linear weight
- **Size**: 24px default, 20px for dense layouts

## Layout

- **Max Width**: 1280px (container)
- **Grid**: 12-column grid with 24px gutter
- **Padding**: 24px (desktop), 16px (mobile)

## Dark Mode Considerations

- Increased shadow depth for better depth perception
- Higher contrast text for accessibility
- Subtle glow effects on interactive elements
- Consistent color mapping between themes

## Accessibility Notes

- Minimum contrast ratio: 4.5:1 for normal text
- Focus indicators: 2px solid Indigo 500
- Touch targets: minimum 44x44px
- Semantic HTML structure maintained

## Screenshots Reference

- `light/original-*.png` - Light mode UI states
- `dark/original-*.png` - Dark mode UI states

# 📚 Wiki: ALBA Finance v3 (Dokumen Hidup)

> Versi pengembangan aktif. Dokumen ini akan diperbarui seiring progres implementasi.
> Status: `🚧 Beta` | Terakhir diupdate: {{TANGGAL}}

---

## 🌐 Daftar Isi Wiki

| Topik | Tautan | Status |
|-------|--------|--------|
| Ringkasan Aplikasi | [#1-ringkasan](1-ringkasan) | ✅ Stabil |
| Arsitektur Sistem | [#2-arsitektur](2-arsitektur) | ✅ Stabil |
| Matriks Role Pengguna | [#3-role-matrix](3-role-matrix) | ✅ Stabil |
| Skema Database | [#4-database](4-database) | 🔄 Revisi |
| Fitur & Endpoint API | [#5-fitur-api](5-fitur-api) | 🚧 Aktif |
| Alur Pengguna | [#6-user-flows](6-user-flows) | 🔄 Draft |
| SYSTEM DESIGN UI/UX | [#7-uiux](7-uiux) | 🚧 Aktif |
| Changelog / Sejarah Versi | [#changelog](changelog) | 📝 Catatan |

---

## 1. Ringkasan Aplikasi {#1-ringkasan}

> **[Kembali ke Atas](#daftar-isi-wiki)** | **[Changelog →](#changelog)**

ALBA Finance v3 adalah platform manajemen keuangan dan operasional terpadu untuk **Pondok Pesantren Al-Basyariyah**. Sistem ini mendukung pencatatan transaksi, manajemen unit retail (KPAK, Koperasi Buku, Kantin Umi, Kantin Baru), workflow persetujuan, rekonsiliasi keuangan, inventori, dan point of sale (POS).

- **Tech Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Prisma 5.
- **DB**: MySQL 8.0.
- **Auth**: NextAuth.js, bcryptjs.
- **RBAC**: `proxy.ts` middleware.

---

## 2. Arsitektur Sistem {#2-arsitektur}

> **[Kembali ke Atas](#daftar-isi-wiki)** | **[Edit halaman ini](/docs/architecture.md)**

```
┌──────────────────────┐
│   Web Browser / PWA  │
└──────────┬───────────┘
           │ HTTPS
┌──────────▼──────────┐
│   Next.js (Frontend │
│     + API Routes)   │
└──────────┬──────────┘
           │ Prisma Client (SQL)
┌──────────▼──────────┐
│      MySQL 8.0      │
│ (Schema: 14 Models) │
└─────────────────────┘
```

- **Frontend**: Halaman & komponen UI di folder `app/dashboard/*`, `components/*`.
- **Backend**: Route handler API di `app/api/*`.
- **Middleware**: `proxy.ts` menangani proteksi role & session.

---

## 3. Matriks Role Pengguna {#3-role-matrix}

> **[Kembali ke Atas](#daftar-isi-wiki)** | **[Edit halaman ini](/docs/roles.md)**

| Role | Scope | Akses |
|------|-------|-------|
| **SUPERADMIN** | Global | CRUD all, settings, COA, user management. |
| **PIMPINAN** | Lembaga-wide | Lihat laporan semua unit, catat pemasukan/pengeluaran, broadcast, approval. |
| **MANAGER** | Unit | Rekonsiliasi, inventory, POS, transaksi harian. |
| **STAFF** | Unit | CRUD transaksi harian, POS, inventory. |

---

## 4. Skema Database {#4-database}

> **[Kembali ke Atas](#daftar-isi-wiki)** | **[Lihat Skema Penuh](/prisma/schema.prisma)**

Model utama:

1. `Lembaga` — Entitas lembaga.
2. `Unit` — Unit operasional (KPAK, Kantin, Koperasi).
3. `User` — Pengguna sistem (role + unit).
4. `Transaction` — Catatan pemasukan/pengeluaran.
5. `FinancialNote` — Catatan keuangan Pimpinan.
6. `Approval` — Alur permintaan & persetujuan.
7. `InventoryItem` — Stok barang unit retail.
8. `OrderItem`, `Order` — Transaksi kasir/POS.
9. `BankAccount` — Rekening kas/bank.
10. `FinancialCategory` — Chart of Accounts (COA).
11. `Notification` — Notifikasi sistem.
12. `AuditLog`, `Session`, `Settings` — Pendukung.

📊 **Diagram Hubungan Model**: _[TODO: Tambahkan ERD diagram di sini]_

---

## 5. Fitur & Endpoint API {#5-fitur-api}

> **[Kembali ke Atas](#daftar-isi-wiki)** | **[API Spec Lengkap](/docs/api-spec.md)**

| Modul | Endpoint | Status Integrasi | Catatan |
|-------|----------|------------------|---------|
| Auth | `/api/auth/[...nextauth]` | ✅ Selesai | |
| Health | `/api/health` | ✅ Selesai | Health check simple. |
| Units | `/api/units` | 🔗 UI connected | Perlu verifikasi RBAC. |
| Users | `/api/users` | 🔗 UI connected | |
| Transaksi | `/api/transactions` | 🔄 Butuh verifikasi | UI masih mock. |
| Nota Keuangan | `/api/financial-notes` | ✅ Selesai | |
| Inventori | `/api/inventory` | ✅ Selesai | |
| Persetujuan | `/api/approvals` | ✅ Selesai | |
| Pengaturan | `/api/settings` | ✅ Selesai | |
| Reset User | `/api/reset-users` | ⚠️ Destructive | Hanya untuk dev/test. |

🚦 Legend: ✅ Selesai | 🔗 Terhubung | 🔄 Proses | ⏳ Todo | ⚠️ Risiko

---

## 6. Alur Pengguna (User Flow) {#6-user-flows}

> **[Kembali ke Atas](#daftar-isi-wiki)** | **[Edit halaman ini](/docs/user-flows.md)**

1. **Login → Dashboard**: Auth arahkan ke beranda sesuai role.
2. **Manajemen Unit/User**: Form master + tabel, CRUD penuh melalui API.
3. **POS → Inventori**: Transaksi kasir otomatis mengurangi stok.
4. **Transaksi → Approval**: Transaksi di atas ambang masuk alur persetujuan.
5. **Rekonsiliasi**: Unggah mutasi bank, cocokkan transaksi sistem.

🗺️ **Diagram Alur**: _[TODO: Tambahkan flow diagram di sini]_

---

## 7. SYSTEM DESIGN UI/UX {#7-uiux}

> **[Kembali ke Atas](#daftar-isi-wiki)** | **[Lihat Komponen](/docs/components.md)**

### A. Arsitektur Layout
- `app/dashboard/layout.tsx`: Sidebar + Header, dinamis per role.
- Sidebar: Menggunakan RBAC (`proxy.ts`) untuk filter menu.
- Header: Nama unit, profil user, dropdown aksi.
- Responsif: shadcn/ui + Tailwind responsive utility, `MobileNav` untuk mobile.

### B. Peta Halaman (UI Map)
| Halaman | Komponen | Status |
|--------|----------|--------|
| Dashboard | Stat cards, `BarChart`, `DoughnutChart` | 🔄 Live |
| Login | LoginForm | ✅ |
| Transaksi | Table, Dialog, Filter Form | 🔄 Draft |
| Nota Keuangan | Accordion, Modal | ✅ |
| Inventori | Table, CSV upload, Stok modal | ✅ |
| POS | Cart, Barcode scanner, Receipt | 🔄 Draft |
| Persetujuan | Request list, Approve/Reject panel | ✅ |
| Rekonsiliasi | Bank upload, Matching tool | ✅ |
| Laporan | Date range, Export (PDF/Excel), Charts | 🔄 Draft |
| Unit/User | Master form, Management table | 🔗 Terhubung |
| Akun | Change password form | ✅ |

### C. Komponen & Pola Desain
- **Reusable**: shadcn/ui components (`Table`, `Dialog`, `Form`, `Card`, `Badge`).
- **Desain Sistem**: Warna utama `emerald-600`, font `Inter`, ikon `lucide-react`.
- **Aksesibilitas**: ARIA labels, kontras WCAG.
- **Konvensi**: Komponen UI di `components/shared` dan `components/ui`; hook khusus halaman di folder masing-masing.

### D. Rencana Pengembangan Bertahap
1. **Fase 1 (Audit & Wiring)**: Pengecekan halaman mock/hilang, penyambungan UI ke API.
2. **Fase 2 (RBAC & Keamanan)**: Proteksi rute UI & API, review `proxy.ts`.
3. **Fase 3 (End-to-End Testing)**: Uji transaksi POS, inventori, rekonsiliasi.
4. **Fase 4 (Deploy)**: `npm run build` → `scripts/deploy-prepare.mjs` → Hostinger.

---

## Changelog {#changelog}

| Versi | Tanggal | Deskripsi | Diupdate Oleh |
|-------|---------|-----------|---------------|
| v0.3.0 | {{TANGGAL}} | Wiki format, SYSTEM DESIGN UI/UX, roadmap. | Goose |
| v0.2.0 | {{TANGGAL}} | Audit awal, PRD awal, scanning proyek `.claude`. | Goose |
| v0.1.0 | {{TANGGAL}} | Inisialisasi project, setup tech stack. | Tim Dev |

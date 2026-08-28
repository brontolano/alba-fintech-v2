# 📋 Task Assignment: Mockup Application UI/UX Implementation

**Ditanggal**: 2026-08-28  
**Dari**: CTO  
**Kepada**: CEO, CTO, Full Development Team

---

## 1. Konteks

User meminta penyesuaian tampilan aplikasi (mockup) yang ada di:
```
docs/stitch_keuangan_pesantren_al_basyariyyah/
```

Mockup ini harus diimplementasikan untuk 3 role utama:
- **Pimpinan** (kepala unit)
- **Manager** (pegawai pengelola unit)
- **Staff** (pegawai operasional)

## 2. Rencana Kerja (Phase Plan)

### Phase 1 — CEO: Product Analysis & UI Mapping (2 Hari)
**Assignee**: CEO  
**Target Output**: 
- Review lengkap semua mockup di folder `stitch_keuangan_pesantren_al_basyariyyah/`
- Buat spreadsheet perbandingan role-vs-fitur per halaman mockup
- Tentukan prioritas halaman yang perlu diimplementasikan (MVP vs nice-to-have)
- Finalisasi design tokens (warna, font, spacing) dari desain referensi

**Deliverables**:
- [ ] `docs/mockup-role-mapping.csv` — peta fitur per role per halaman
- [ ] `docs/ui-spec-v2.md` — spesifikasi UI final per komponen
- [ ] List halaman mockup yang akan diimplementasikan (ranked)

### Phase 2 — CTO & FE Devs: Engineering Implementation (5 Hari)
**Assignee**: CTO, Frontend Engineers  
**Target Output**:
- Implementasikan halaman Pimpinan di `src/app/dashboard/pimpinan/`
- Implementasikan halaman Manager di `src/app/dashboard/manager/`
- Implementasikan halaman Staff di `src/app/dashboard/staff/`
- Pastikan role-based routing sudah berfungsi (middleware.ts)
- Audit kebutulan semua komponen vs mockup asli

**Deliverables**:
- [ ] Halaman Pimpinan sesuai mockup (`laporan_eksekutif_pimpinan`, `daftar_transaksi_pimpinan_terintegrasi`, `rekonsiliasi_keuangan_pimpinan`)
- [ ] Halaman Manager sesuai mockup (`dashboard_unit_kantin_manager`, `dashboard_unit_kantor_manager`, `dashboard_unit_koperasi_manager`)
- [ ] Halaman Staff sesuai mockup (`dashboard_unit_kantin_staff`, `dashboard_unit_kantor_staff`, `dashboard_unit_koperasi_staff`)
- [ ] Form halaman (`tambah_transaksi_baru_detail`, `persetujuan_transaksi`, `halaman_login_terpadu_v4`)
- [ ] Master page (`profil_pimpinan_al_basyariyah`)

### Phase 3 — QA & Integration (2 Hari)
**Assignee**: CTO, QA Team  
**Target Output**:
- Test semua role dapat akses ke halaman yang sesuai
- Audit visual mobile responsiveness (mobile-first)
- Pastikan PWA offline mode tetap bekerja

## 3. Detail Mapping Per Role

### 🟦 Pimpinan (Executive)
Halaman dari mockup:
1. `laporan_eksekutif_pimpinan/` — Laporan keuangan eksekutif (charts + summary)
2. `daftar_transaksi_pimpinan_terintegrasi/` — Daftar transaksi semua unit
3. `rekonsiliasi_keuangan_pimpinan/` — Rekonsiliasi keuangan lintas unit
4. `profil_pimpinan_al_basyariyah/` — Profil dan pengaturan akun

### 🟨 Manager (Unit Head)
Halaman dari mockup:
1. `dashboard_unit_kantin_manager/`
2. `dashboard_unit_kantor_manager/`
3. `dashboard_unit_koperasi_manager/`

### 🟩 Staff (Operational)
Halaman dari mockup:
1. `dashboard_unit_kantin_staff/`
2. `dashboard_unit_kantor_staff/`
3. `dashboard_unit_koperasi_staff/`

### Form & Input Pages (semua role)
1. `tambah_transaksi_baru_detail/` — Form input transaksi dengan foto notifikasi
2. `persetujuan_transaksi/` — Approval workflow transaksi
3. `halaman_login_terpadu_v4/` — Login terpadu semua role

## 4. Teknologi Stack
- **Framework**: Next.js 14 App Router (SSR/SSG)
- **Styling**: Tailwind CSS 3.4.1
- **Charts**: Recharts (sudah terpasang)
- **Auth**: NextAuth v4 (Credentials Provider + JWT)
- **DB**: Prisma + MySQL
- **Mobile**: PWA (next-pwa), Android WebView APK

## 5. Timeline
| Phase | Durasi | Start | End |
|-------|--------|-------|-----|
| Phase 1 (CEO) | 2 hari | 2026-08-29 | 2026-08-30 |
| Phase 2 (CTO Devs) | 5 hari | 2026-08-31 | 2026-09-04 |
| Phase 3 (QA) | 2 hari | 2026-09-05 | 2026-09-06 |

## 6. Notes Penting
- Semua tampilan harus **mobile-first** dan **PWA-compliant**
- Pastikan **offline mode** tetap bekerja setelah perubahan UI
- Gunakan **lazy loading** untuk komponen chart agar tidak membebani mobile
- Semua halaman harus melalui **RBAC check** (role-based access control)
- Pastikan **push notification** terintegrasi dengan halaman yang relevan

---

*Dokumen ini akan di-update setiap akhir hari kerja dengan progres terbaru.*

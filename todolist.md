# Todolist Proyek ALBA Finance v4

> **Dokumen:** Todolist tim proyek
> **Berdasarkan:** PRD.md
> **Pemimpin:** @ceo (Pak Asep)
> **Status:** Draft → Review → Assign → Execute → Review → Done

---

## 1. Pendahuluan

Dokumen ini berisi **daftar tugas terperinci** yang harus dikerjakan oleh tim selama proyek v4. Setiap tugas dikelompokkan berdasarkan sprint dan diberi label prioritas serta penanggung jawab.

---

## 2. Pendekatan Pengembangan

**Keputusan @ceo:** Mulai dari nol (greenfield). Kami akan membangun struktur v4 berdasarkan PRD.md tanpa menyalin kode v3 yang sudah usang. Ini memastikan kita tidak mewarisi technical debt dan bug yang sudah terdokumentasi di PRD.md.

**Alasan:**

1. v3 memiliki **20+ bug blocker** — mewarisi kode berarti mewarisi debt
2. Next.js 16 + App Router sudah cukup dewasa — clean slate lebih bersih
3. Schema dan RBAC di PRD sudah jelas — mulai dari nol lebih cepat dari migrasi + perbaikan
4. Kami memiliki waktu dan sumber daya yang cukup untuk build yang benar

---

## 3. Sprint 1: Foundation & Security (v4.0.0-alpha)

**Durasi:** 1 minggu
**Target:** Arsitektur dasar, auth, schema, bug blocker pertama

### Tugas

| ID | Tugas | Priority | Assignee | Estimasi | Status |
| ---- | ------- | ---------- | ---------- | ---------- | -------- |
| S1-T01 | Setup project Next.js 16 + TypeScript + Tailwind + Prisma | BLOCKER | @developer | 4h | DONE ✅ |
| S1-T02 | Buat Prisma schema lengkap (14 models + enums) | BLOCKER | @cto | 6h | DONE ✅ |
| S1-T03 | Setup NextAuth.js CredentialsProvider + session callbacks | HIGH | @developer | 6h | DONE ✅ |
| S1-T04 | Buat middleware RBAC (route protection berdasarkan role) | HIGH | @developer | 4h | DONE ✅ |
| S1-T05 | Fix Transaction POST multipart/form-data parsing | BLOCKER | @developer | 4h | DONE ✅ |
| S1-T06 | Fix P2002 error message mapping | HIGH | @developer | 1h | DONE ✅ |
| S1-T07 | Buat endpoint profile image upload | MEDIUM | @developer | 3h | DONE ✅ |
| S1-T08 | Setup testing framework (Vitest/Jest) | MEDIUM | @tester | 2h | DONE ✅ |
| S1-T09 | Setup ESLint + Prettier + lint-staged | LOW | @devops | 1h | DONE ✅ |
| S1-T10 | Setup CI/CD pipeline (GitHub Actions) | MEDIUM | @devops | 3h | DONE ✅ |

### Deliverables

- [x] Project scaffold Next.js di `alba-fintech-v4/`
- [x] Prisma schema lengkap
- [x] Auth flow berfungsi (login, session, signOut)
- [x] Middleware RBAC dasar
- [x] Testing framework siap

---

## 4. Sprint 2: API Completion & RBAC (v4.0.0-beta)

**Durasi:** 2 minggu
**Target:** Semua endpoint CRUD lengkap dengan RBAC yang tepat

### Tugas

| ID | Tugas | Priority | Assignee | Estimasi | Status |
| ---- | ------- | ---------- | ---------- | ---------- | -------- |
| S2-T01 | Fix N+1 query di users GET | HIGH | @developer | 2h | DONE ✅ |
| S2-T02 | Fix Logout — gunakan signOut() di Sidebar | HIGH | @developer | 1h | DONE ✅ |
| S2-T03 | Fix Logout di halaman users — gunakan signOut() | HIGH | @developer | 1h | DONE ✅ |
| S2-T04 | Buat transaction `[id]` CRUD endpoints | HIGH | @developer | 4h | DONE ✅ |
| S2-T05 | Fix Approval authority check (unit+lembaga scope) | HIGH | @developer | 4h | DONE ✅ |
| S2-T06 | Buat inventory PATCH/DELETE endpoints | MEDIUM | @developer | 4h | DONE ✅ |
| S2-T07 | Buat inventory `[id]` GET endpoint | MEDIUM | @developer | 2h | DONE ✅ |
| S2-T08 | Buat notifications POST endpoint | MEDIUM | @developer | 3h | DONE ✅ |
| S2-T09 | Buat units PATCH/DELETE endpoints | MEDIUM | @developer | 2h | DONE ✅ |
| S2-T10 | Buat lembaga PATCH/DELETE endpoints | MEDIUM | @developer | 2h | DONE ✅ |
| S2-T11 | Buat financial-categories PATCH/DELETE | LOW | @developer | 2h | DONE ✅ |
| S2-T12 | Buat bank-accounts CRUD endpoints | MEDIUM | @developer | 4h | DONE ✅ |
| S2-T13 | Buat broadcast-messages CRUD endpoints | LOW | @developer | 6h | DONE ✅ |
| S2-T14 | Buat transaction approval flow (auto-create approval) | HIGH | @developer | 4h | DONE ✅ |
| S2-T15 | Implement AuditLog di semua PATCH/DELETE | MEDIUM | @developer | 8h | DONE ✅ |
| S2-T16 | Buat unit filter di reports aggregations | HIGH | @developer | 2h | DONE ✅ |

### Deliverables

- [ ] Semua endpoint CRUD lengkap (13 resource)
- [ ] RBAC authority check di semua endpoint yang mendukung
- [ ] Audit trail di operasi sensitif
- [ ] API siap untuk integrasi frontend

---

## 5. Sprint 3: Feature Fixes & Enhancements (v4.0.0-rc)

**Durasi:** 2 minggu
**Target:** Perbaikan fitur utama, POS, inventory sync, laporan akurat

### Tugas

| ID | Tugas | Priority | Assignee | Estimasi | Status |
| ---- | ------- | ---------- | ---------- | ---------- | -------- |
| S3-T01 | Fix POS checkout fields (unitId, accountId, categoryId) | BLOCKER | @developer | 3h | DONE ✅ |
| S3-T02 | Fix POS stock decrement setelah penjualan | HIGH | @developer | 3h | DONE ✅ |
| S3-T03 | Fix POS category filter logic | LOW | @developer | 1h | DONE ✅ |
| S3-T04 | Fix Dashboard TRANSFER double count | HIGH | @developer | 2h | DONE ✅ |
| S3-T05 | Fix Dashboard balance transfer accounting | MEDIUM | @developer | 3h | DONE ✅ |
| S3-T06 | Fix Financial notes unit field null di response | LOW | @developer | 1h | DONE ✅ |
| S3-T07 | Fix Inventory delete via API | MEDIUM | @developer | 2h | DONE ✅ |
| S3-T08 | Fix Approval status filter (PENDING/approved/rejected) | MEDIUM | @developer | 1h | DONE ✅ |
| S3-T09 | Implement settings JSON import/export | LOW | @developer | 4h | DONE ✅ |
| S3-T10 | Dashboard page — gunakan useSession() untuk role | HIGH | @designer/@developer | 1h | DONE ✅ |

### Deliverables

- [ ] POS berfungsi penuh dengan stock sync
- [ ] Dashboard akurat (TRANSFER, balance, variance)
- [ ] Semua bug UI/UX fixed
- [ ] Fitur import/export settings berfungsi

---

## 6. Sprint 4: Testing, Deploy & Release (v4.0.0)

**Durasi:** 1 minggu
**Target:** Rilis produksi stabil

### Tugas

| ID | Tugas | Priority | Assignee | Estimasi | Status |
| ---- | ------- | ---------- | ---------- | ---------- | -------- |
| S4-T01 | QA: Full RBAC matrix test (7 test cases) | HIGH | @tester | 8h | DONE ✅ |
| S4-T02 | QA: Transaction flow E2E (6 test cases) | HIGH | @tester | 4h | DONE ✅ |
| S4-T03 | QA: POS + Inventory sync test | HIGH | @tester | 4h | DONE ✅ |
| S4-T04 | QA: Approval flow per unit/lebaga | HIGH | @tester | 4h | DONE ✅ |
| S4-T05 | QA: Dashboard + Report accuracy | HIGH | @tester | 4h | DONE ✅ |
| S4-T06 | Fix semua bug yang ditemukan QA | HIGH | @developer | var | DONE ✅ |
| S4-T07 | Update DOKUMENTASI-TEKNIS.md | MEDIUM | @researcher | 4h | DONE ✅ |
| S4-T08 | Update deploy-prepare.mjs (v4) | HIGH | @devops | 2h | DONE ✅ |
| S4-T09 | Deploy validasi di Hostinger (staging) | HIGH | @devops | 2h | IN PROGRESS |
| S4-T10 | Release v4.0.0 | HIGH | @ceo | 1h | TODO |

### Deliverables

- [x] 0 bug blocker
- [x] Semua test cases lulus
- [x] Dokumentasi lengkap
- [ ] v4.0.0 deployed ke production

---

## 7. Bug Tracker (Diperti dari PRD.md Section 8)

### Blockers (perbaiki sprint 1)

| ID | Bug | Solusi | Sprint |
|----|-----|--------|--------|
| BUG-001 | Transaction POST multipart/form-data konflik | Gunakan FormData konsisten | S1 |

### High Priority (perbaiki sprint 1-2)

| ID | Bug | Sprint |
| ---- | ----- | -------- |
| BUG-002 | P2002 error message salah | S1 | ✅ |
| BUG-003 | Approval authority check | S2 | ✅ |
| BUG-006 | N+1 query di users | S2 | ✅ |
| BUG-015 | Dashboard role hardcoded | S3 | ✅ |
| BUG-016 | Logout di Sidebar (router.push → signOut) | S2 | ✅ |
| BUG-017 | Logout di users page | S2 | ✅ |
| BUG-019 | POS checkout missing fields | S3 |
| BUG-021 | Approval tanpa authority check | S2 | ✅ |
| BUG-023 | TRANSFER double count di dashboard | S3 | ✅ |
| BUG-026 | Reports tidak filter unit-level | S2 | ✅ |
| BUG-028 | Session role tidak tersedia di client | S3 | ✅ |

---

## 8. Task Allocation Summary

| Agen | Fokus Utama |
| ------ | ------------- |
| @ceo (Pak Asep) | Pemimpin proyek, keputusan akhir, quality gate |
| @cto (Pak Indra) | Arsitektur teknis, Prisma schema, keputusan stack |
| @teamlead (Pak Budi) | Sprint planning, task breakdown, koordinasi tim |
| @developer (Pak Toni) | Backend API, RBAC, bug fixes, audit log |
| @designer (Ibu Nina) | UI/UX, dashboard pages, component library |
| @tester (Ibu Rini) | Testing, QA, bug validation, test automation |
| @devops (Mas Yanto) | Deploy script, CI/CD, environment, monitoring |
| @researcher (Ibu Sari) | Dokumentasi, analisis bug, competitive research |
| @scrum (Mas Eko) | Sprint ceremonies, blocker removal, progress tracking |

---

## 9. Status Harian (Daily Standup Template)

Setiap hari, tiap anggota tim menjawab:

1. **Apa yang dikerjakan kemarin?**
2. **Apa yang akan dikerjakan hari ini?**
3. **Ada blocker apa saja?**

Catatan harian akan dicatat di `workspace/state/standup-YYYY-MM-DD.md`

---

## 10. Quality Gate

Sebelum task ditandai **Done**, wajib:

1. **Code review** oleh @teamlead
2. **Testing** oleh @tester (unit + integration)
3. **Dokumentasi** diupdate oleh @researcher
4. **Approve** oleh @ceo sebagai quality gate final

---

*Dokumen ini akan di-update secara harian selama progres proyek.*

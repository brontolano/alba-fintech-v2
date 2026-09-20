# ToDoList — Penyederhanaan Pipeline Deploy (Lokal → GitHub → Hostinger)

> Status: dikerjakan 21 Sep 2026 · Live: https://alba.brontolano.com

## Complete

- [x] **Scan pipeline** — verifikasi cara deploy yang sebenarnya dipakai (Hostinger Node.js "build from Git", 87x auto-deploy sukses).
- [x] **Cek live** — `/health` → `{"status":"ok"}`.
- [x] **Konfirmasi keputusan** dengan user (hapus artefak lama; GitHub Actions = keep ci saja; dokumentasi = satu doc standar).
- [x] Hapus `scripts/deploy-prepare.mjs` (butuh `.next/standalone` yang sudah tidak ada).
- [x] Hapus `server.js`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`.
- [x] Hapus `db-watcher.mjs`, `test-db.js`.
- [x] Hapus `.github/workflows/deploy.yml` (workflow SSH usang).
- [x] Hapus `docs/DEPLOY_GUIDE.md`, `docs/AUDIT-DEPLOY-HOSTINGER.md`.
- [x] **Tulis ulang** `docs/DEPLOY.md` sebagai satu-satunya dokumen deploy (alur otomatis git → Hostinger, env list, troubleshooting).
- [x] Rapikan `package.json` — buang script `deploy:prepare` + blok `files` (standalone/server.js).
- [x] Sinkronkan `.env.production.example` dengan env live (ribbon `v7`).
- [x] Perbarui bagian Deployment di `README.md`.
- [x] Buat `Plan.md` (dokumen rencana) & `ToDoList.md` ini.
- [x] **Verifikasi lokal**: `npm run type-check` → 0 error; `npm run build` → 27 halaman + API ter-compile, 0 error.
- [x] **Rapikan struktur lokal**: hapus `scripts/debug/` (harness debug ter-commit: banyak `.cjs`/`.test.cjs`, dump DB `database-full.sql`, salinan `deploy-prepare.mjs`/`next.config.mjs`) — semua tetap bisa dipulihkan dari git history.
- [x] Perbaiki referensi basi: `PRD.md` (Fase 4 → alur git push), `AGENTS.md` (judul v7; map struktur `src/` → root), `docs/DOKUMENTASI-TEKNIS.md` (banner historis + file tree akurat).
- [x] `.gitignore`: buang `scripts/debug/` & `todolist.md` — `ToDoList.md` kini bisa di-commit normal.

## Pending

- [ ] **Uji pipeline end-to-end**: commit + `git push origin main`, pantau build di hPanel, lalu `curl https://alba.brontolano.com/health`.
- [ ] *(Opsional)* Bersihkan `database-full.sql` dari git history (dump DB pernah ter-commit; pertimbangkan rotate secret/DB jika dianggap risiko).

## Simplifikasi Aplikasi (roadmap riset)

- [x] Domumentasi riset: `docs/RISET-REFERENSI.md` (referensi pesantren/koperasi/POS + format buku kas) — selesai 21 Sep 2026.
- [x] Pilih prioritas implementasi berikutnya bersama user (Buku Kas digital / Papan Pantau / navigasi / tabungan) — user memilih "eksekusi semuanya bertahap" 21 Sep 2026.
- [x] **Tahap 1 — Buku Kas digital** (21 Sep 2026): backend `app/api/transactions/route.ts` + field `balanceAfter` (saldo berjalan; INCOME +, EXPENSE −, TRANSFER/REJECTED netral); frontend `app/dashboard/transactions/page.tsx` = tabel Buku Kas `No | Tanggal | Keterangan | Debet | Kredit | Saldo` + form "Catat cepat" (POST JSON, unit terikat per role) + pertahankan summary/filter/pagination/expand detail. `npm run type-check` 0 error.
- [x] **Tahap 2 — Papan Pantau pimpinan** (`monitor` + dashboard + reports): `app/api/monitor/route.ts` diperbaiki — `todayIncome`/`todayExpense` kini hanya transaksi hari ini (`date >= todayMs`), `balance` tetap kumulatif; payload + `savingsTotal` (jumlah saldo rekening santri AKTIF di unit pimpinan) + `pendingApprovals` (count Approval PENDING, unit terlihat). `app/dashboard/monitor/page.tsx`: kartu baru "Saldo Tabungan Santri" (PiggyBank, emerald) & "Pengajuan menunggu approval" (ClipboardList, amber, tombol "Buka" → `/dashboard/approvals` bila > 0). `PimpinanDashboard.tsx`: tile "Papan Pantau". `npm run type-check` 0 error.
- [x] **Tahap 3 — Tabungan santri + Anjungan Santri** (`savings` + `api/savings`): halaman `app/dashboard/savings/page.tsx` sudah punya alur cepat setor/tarik (lookup NIS/NFC → saldo → mutasi) + daftar santri baru. Dibalut **Anjungan Santri baru**: `app/api/kiosk/savings/route.ts` (GET publik, tanpa login, lookup `q` = NIS atau cardUid, batasi 10 mutasi terakhir) + `app/kiosk/page.tsx` (UI kiosk besar cocok layar LCD: cari NIS → kartu saldo besar + mutasi terakhir + tombol segarkan). Tombol "Buka Anjungan Santri" (target _blank) di header halaman Tabungan. `proxy.ts` matcher hanya `/dashboard/:path*`, jadi `/kiosk` aman. `npm run type-check` 0 error.
- [x] **Tahap 4 — Rapikan navigasi sidebar + sembunyikan modul canggih**: `components/layout/Sidebar.tsx` — duplikat "Input Data" & "Transaksi Berjalan" (dua-duanya `/dashboard/transactions`) digabung jadi satu "Buku Kas"; urutan menu: Dashboard, Papan Pantau (SUPERADMIN/PIMPINAN), Buku Kas (semua), Pengajuan Khusus (SUPERADMIN/PIMPINAN/MANAGER), Tabungan Santri (semua), Inventori & POS (retail-only), Kas Unit (non-retail), Laporan, Rekonsiliasi, lalu admin (Unit/Pengguna/Pengaturan). Label quick access "Input Data" → "Buku Kas" di 4 komponen dashboard (Pimpinan/Superadmin/Staff/Manager). Modul tak relevan tetap bisa dibuka via URL (prinsip: sembunyikan, jangan hapus).
- [x] Verifikasi penuh: `npm run type-check` + `npm run build` 0 error — **tanpa commit tanpa izin** (selepas Tahap 1–4, 21 Sep 2026).
- [ ] *(Opsional)* Titipan UMKM & margin (field `consignment`/`supplier` + laporan laba per barang).

## Catatan

- `proxy.ts` dipertahankan (middleware auth Next 16).
- Deploy otomatis; env mutasi hanya di hPanel.
- File `todolist.md` (huruf kecil) telah tergantikan oleh `ToDoList.md` ini; `task_plan.md` dipertahankan.
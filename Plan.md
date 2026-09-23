# Plan — Penyederhanaan Pipeline Deploy (Lokal → GitHub → Hostinger)

> Pemilik: ALBA Finance v7 · Live: https://alba.brontolano.com · Update: 21 Sep 2026

## 1. Tujuan

Menyederhanakan proyek agar alur rilis hanya satu jalur:

```
local ──git commit──▶ push origin main ──▶ GitHub ──▶ Hostinger (build dari Git) ──▶ Live
```

User hanya perlu **commit & push**. Build + deploy ditangani otomatis oleh Hostinger hPanel (Node.js, app_type `next`, output `.next`). Tidak ada lagi build manual, upload zip, SSH, atau Docker.

## 2. Hasil Scan (Fakta, Bukan Asumsi)

- Pipeline yang **benar-benar dipakai & bekerja**: integrasi Git Hostinger (`repo brontolano/alba-fintech-v2`, branch `main`, Node 20, `npm run build`, output `.next`). Terverifikasi 87x auto-deploy **completed** sukses.
- `/health` live memastikan `{"status":"ok"}`.
- Env produksi tersimpan di hPanel: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_EMAIL`, `NEXTAUTH_PASSWORD`, `NODE_ENV`, variabel backup/Drive.
- `next.config.mjs` sudah dihapus (commit `020d4b9`) tetapi build tetap sukses — setup Hostinger tidak butuh `output: 'standalone'`.

## 3. Sumber Kerumitan → Keputusan

| Sumber kerumitan (arsip pipeline LAMA) | Keputusan |
| --- | --- |
| `scripts/deploy-prepare.mjs` + `deploy:prepare` | **Dihapus** — butuh `.next/standalone` yang sudah tidak ada; pasti gagal |
| `server.js`, `Dockerfile`, `docker-compose.yml`, `.dockerignore` | **Dihapus** — alur SSH/Docker tidak dipakai |
| `db-watcher.mjs`, `test-db.js` | **Dihapus** — berkas debug/scratch |
| `.github/workflows/deploy.yml` (SSH, butuh 6 secrets) | **Dihapus** — deploy ditangani Hostinger dari Git |
| `docs/DEPLOY.md`, `DEPLOY_GUIDE.md`, `AUDIT-DEPLOY-HOSTINGER.md` (3 cara saling bertentangan) | **Konsolidasi** jadi 1 → `docs/DEPLOY.md` ditulis ulang, 2 lainnya dihapus |
| `package.json` (script `deploy:prepare`, `files` berisi standalone/server.js) | **Dibereskan** |
| `.env.production.example` (masih berlabel v3, var lama) | **Di-sinkronkan** dengan var live |
| `README.md` bagian Deployment (menjelaskan server.js) | **Diperbarui** |
| `docs/DOKUMENTASI-TEKNIS.md` & `docs/CHANGELOG.md` berisi referensi lama | **Dibiarkan** sebagai catatan historis/dokumen teknis induk; bisa dirapikan belakangan |

## 4. Target Akhir

- Repo bersih dari artefak deploy manual.
- Satu dokumen deploy: `docs/DEPLOY.md`.
- CI tetap berjalan di `.github/workflows/ci.yml` (type-check + build) sebagai gerbang kualitas sebelum Hostinger build tanpa biaya tambahan.
- `proxy.ts` **tetap dipertahankan** — itu middleware auth resmi Next.js 16, bukan artefak deploy.

## 5. Catatan Operasional untuk User

1. Commit & push seperti biasa → Hostinger otomatis mengerjakan sisanya.
2. Build gagal/bisa dilihat di hPanel; panduan singkat ada di `docs/DEPLOY.md`.
3. Ubah env hanya lewat hPanel (bukan di repo) — lihat `.env.production.example`.
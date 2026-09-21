# ALBA Finance v7 — Panduan Deploy (Lokal → GitHub → Hostinger)

> **Pipeline resmi**: Anda cukup **commit & push ke GitHub** — Hostinger otomatis build dan deploy dari repo.
> Live: https://alba.brontolano.com

---

## Alur Deploy (Otomatis)

```
local ──git commit──▶ git push origin main ──▶ GitHub ──▶ Hostinger hPanel (Node.js "build from Git") ──▶ Live
```

1. Komit perubahan: `git add .` → `git commit -m "<pesan>"`
2. Push: `git push origin main`
3. Hostinger (hPanel → Website → alba.brontolano.com → build) menjalankan `npm ci` + `npm run build` (output `.next`), lalu menayangkan hasilnya.
4. Progress build bisa dilihat di hPanel; bila gagal, cek bagian Troubleshooting di bawah.

**Tidak perlu**: build manual, upload zip, SSH, Docker, atau workflow deploy GitHub Actions. Semua sudah otomatis via integrasi Git Hostinger.

---

## Env Variables (di-set di hPanel, bukan di repo)

Environment produksi dikelola di **hPanel → Node.js → Environment Variables**. Jangan commit file `.env.production` ke Git (sudah di `.gitignore`).

| Variable | Contoh / Keterangan |
| --- | --- |
| `DATABASE_URL` | `mysql://USER:PASS@localhost:3306/u826712707_alba` |
| `NEXTAUTH_URL` | `https://alba.brontolano.com` |
| `NEXTAUTH_SECRET` | string acak — generate: `openssl rand -base64 32` |
| `NEXTAUTH_EMAIL` | akun login produksi |
| `NEXTAUTH_PASSWORD` | password akun login produksi |
| `NODE_ENV` | `production` |
| `BACKUP_DIRECTORY` | (opsional) folder backup, di luar `public/` |
| `BACKUP_RETENTION_DAYS` | (opsional) default `14` |
| `GOOGLE_APPS_SCRIPT_URL` | (opsional) URL web app backup Drive/Sheets |
| `GOOGLE_APPS_SCRIPT_SECRET` | (opsional) secret bersama backup Drive |

Template & contoh: `.env.production.example`.

---

## Verifikasi Setelah Deploy

```bash
curl https://alba.brontolano.com/health
# Expected: {"status":"ok","timestamp":"..."}
```

Respons harus `ok`. Jika `db` terlibat, pastikan variabel `DATABASE_URL` di hPanel valid.

---

## Database & Seed (satu kali, via CLI lokal)

```bash
# Push / sinkronkan schema ke database produksi
DATABASE_URL="mysql://user:pass@host:3306/db" npx prisma db push

# Seed data awal (sesuai kebutuhan)
DATABASE_URL="mysql://user:pass@host:3306/db" npm run db:seed
```

> Perubahan schema di `prisma/schema.prisma` harus di-push ulang; aplikasi kedua (Next.js) dan DB adalah dua hal yang terpisah.

---

## Backup Otomatis

Backup DB harian: `npm run db:backup`. Atur cron di Hostinger (mis. 02:00) dengan command `cd /path/to/alba && npm run db:backup`. Lihat `.env.production.example` untuk variabel backup & upload Google Drive/Sheets.

### Restore

Backup berbentuk file `.sql` (hasil `db:backup`, lokasi sesuai `BACKUP_DIRECTORY` atau Drive/Sheets). Cara restore:

**Cara 1 — phpMyAdmin:**
1. Buka phpMyAdmin untuk database remote (srv594.hstgr.io).
2. Pilih database tujuan (mis. `u826712707_alba`).
3. Buka tab "Import" (atau "SQL"), pilih file `.sql`, klik "Go".

**Cara 2 — MySQL CLI:**
```sql
mysql -h srv594.hstgr.io -u USER -p DATABASE < backup_20260101_020000.sql
```

> Restore **menimpa** seluruh isi database tujuan. Pastikan file backup diambil dari sumber terpercaya, dan lakukan backup ulang dulu sebelum restore jika data saat ini masih dibutuhkan.

---

## Troubleshooting

| Gejala | Solusi |
| --- | --- |
| Build gagal di hPanel | Buka log build di hPanel; pastikan `npm run build` lolos lokal (`npm run type-check` + `npm run build`) |
| `P1000/P1001` (DB) | Periksa `DATABASE_URL` di hPanel; di Hostinger gunakan `localhost`, bukan `127.0.0.1` |
| Redirect loop di `/login` | Pastikan `NEXTAUTH_URL` = domain publik (`https://alba.brontolano.com`) |
| Tidak ada log | Restart Node.js app dari hPanel |

---

## Dukungan

- Repository: https://github.com/brontolano/alba-fintech-v2
- README & quick start: [README.md](../README.md)
- Dokumentasi teknis: [DOKUMENTASI-TEKNIS.md](DOKUMENTASI-TEKNIS.md)
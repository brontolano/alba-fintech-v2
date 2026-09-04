# ALBA Finance v3 — Panduan Deploy ke Hostinger

> **Status**: Siap Deploy ✅  
> **Build**: 0 TypeScript errors  
> **Standalone Test**: `/health` → `200 OK`

---

## 1. Persiapan — Buat `.env.production`

Buat file `.env.production` di root proyek (salin dari `.env.production.example`):

```env
# Database MySQL Hostinger
DATABASE_URL="mysql://USERNAME:PASSWORD@localhost:3306/DBNAME"

# URL publik (tanpa trailing slash)
NEXTAUTH_URL="https://alba.brontolano.com"

# Generate: openssl rand -base64 32
NEXTAUTH_SECRET="PASTE_OUTPUT_DISINI"

NODE_ENV="production"
```

---

## 2. Build dan Siapkan Paket

```bash
npm install
npm run build
node scripts/deploy-prepare.mjs
```

Folder `deploy-package/` akan berisi:
```
deploy-package/
  server.js          <- Entry point kustom
  next-server.js     <- Next.js standalone server
  package.json       <- start: node server.js
  .env.production    <- Env vars
  .next/static/      <- CSS, JS chunks (WAJIB ada)
  node_modules/      <- Deps minimal + Prisma engine
  prisma/schema.prisma
  public/            <- favicon, logo
```

---

## 3. Upload ke Hostinger

1. Buka hPanel → File Manager
2. Navigasi ke folder Node.js app
3. **Upload seluruh ISI** `deploy-package/` (bukan folder-nya)

---

## 4. Konfigurasi hPanel

| Setting | Value |
|---------|-------|
| Node.js version | 20.x LTS |
| Application startup file | `server.js` |
| Application mode | Production |

**Environment Variables di hPanel:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | mysql://user:pass@localhost:3306/dbname |
| `NEXTAUTH_URL` | https://alba.brontolano.com |
| `NEXTAUTH_SECRET` | (output openssl rand -base64 32) |
| `NODE_ENV` | production |

---

## 5. Database Setup

```bash
# Push schema ke database Hostinger
DATABASE_URL="mysql://user:pass@host:3306/db" npx prisma db push

# Seed data awal
DATABASE_URL="mysql://user:pass@host:3306/db" npm run db:seed
```

---

## 6. Verifikasi

```bash
# Test health endpoint
curl https://alba.brontolano.com/health
# Expected: {"status":"ok","timestamp":"..."}
```

Log yang benar di hPanel:
```
Running ALBA Finance v3...
  DB URL   : set
  NEXTAUTH : set
Next.js 16.3.4
Ready in Xms
```

---

## 7. Troubleshooting

| Gejala | Solusi |
|--------|--------|
| DB URL NOT SET di log | Isi DATABASE_URL di hPanel & .env.production |
| P1000 Authentication failed | Periksa user/password MySQL |
| P1001 Cannot reach database | Gunakan localhost (bukan 127.0.0.1) di Hostinger |
| Redirect loop di /login | Pastikan NEXTAUTH_URL = domain publik Anda |
| CSS/JS tidak muncul | Pastikan .next/static/ sudah terupload |
| Cannot find next-server.js | Jalankan ulang node scripts/deploy-prepare.mjs |

---

## 8. Akun Default (setelah seed)

| Role | Email | Password |
|------|-------|----------|
| SUPERADMIN | admin@alba.id | admin123 |
| PIMPINAN | pimpinan@alba.id | pimpinan123 |
| MANAGER | manager@alba.id | manager123 |
| STAFF | staff@alba.id | staff123 |

> Segera ganti password setelah login pertama!
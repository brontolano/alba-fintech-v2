# ALBA Finance v3 — Deployment Guide (Hostinger)

## Overview
A Next.js 14 (App Router) + Prisma 5.22 (MySQL) + NextAuth 4.24 application.
This guide gets the app running on a Hostinger Node.js environment at **https://alba.brontolano.com**.

---

## Prerequisites (User-side)
- [ ] Hostinger hPanel account with Node.js ≥ 18 & MySQL database access
- [ ] Database credentials ready (host, user, db name, password)
- [ ] GitHub repository connected (https://github.com/brontolano/alba-fintech-v3)

---

## Method 1: GitHub Actions Auto-Deploy (Recommended)

The project is configured with GitHub Actions for automatic deployment on every push to `main`.

### Setup GitHub Secrets

Go to **GitHub → Settings → Secrets and variables → Actions** and add:

| Secret Name | Example Value | Description |
|-------------|--------------|-------------|
| `HOSTINGER_FTP_HOST` | `ftp.brontolano.com` | Hostinger FTP host |
| `HOSTINGER_FTP_USERNAME` | `alba@brontolano.com` | FTP username |
| `HOSTINGER_FTP_PASSWORD` | *(your FTP password)* | FTP password |
| `HOSTINGER_DEPLOY_PATH` | `/alba-brontolano-com` | Remote deployment directory |
| `NEXTAUTH_URL` | `https://alba.brontolano.com` | Your production URL |
| `NEXTAUTH_SECRET` | *(base64 32-byte random)* | Generate: `openssl rand -base64 32` |
| `DATABASE_URL` | `mysql://user:pass@host:3306/dbname` | Hostinger MySQL connection |

### Deploy via GitHub Actions

```bash
# 1. Make changes
git add .
git commit -m "feat: description"

# 2. Push to GitHub
git push origin main

# 3. GitHub Actions will automatically build and deploy
# Check progress at: GitHub → Actions tab
```

---

## Method 2: Manual Deploy (via hPanel)

### Step 1 — Build Locally

```bash
# 1. Install deps
npm install

# 2. Validate & generate Prisma client
npx prisma validate
npx prisma generate

# 3. Push schema (requires valid DB credentials)
npx prisma db push --accept-data-loss

# 4. Seed data (optional, for fresh install)
npx tsx scripts/seed.ts

# 5. Build (generates .next/standalone/)
npm run build
```

### Step 2 — Prepare Deploy Package

```bash
# Run deploy preparation script
node scripts/deploy-prepare.mjs

# This creates deploy-package/ folder
```

### Step 3 — Upload to Hostinger

Upload the **entire contents** of `deploy-package/` to your Hostinger hPanel:

1. hPanel → File Manager → `public_html/alba-brontolano-com/`
2. Upload all files from `deploy-package/`
3. Set environment variables in hPanel → App Management → Node.js → Environment Variables

### Step 4 — Configure hPanel

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `mysql://user:pass@host:3306/alba_finance_v3` |
| `NEXTAUTH_URL` | `https://alba.brontolano.com` |
| `NEXTAUTH_SECRET` | *(same as GitHub secret)* |
| `NODE_ENV` | `production` |
| `PORT` | *(as assigned by hPanel)* |

### Step 5 — Restart

hPanel → Node.js → Restart Application

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | MySQL connection string |
| `NEXTAUTH_URL` | ✅ | - | Production URL |
| `NEXTAUTH_SECRET` | ✅ | - | Random secret for session encryption |
| `NODE_ENV` | ✅ | `development` | Set to `production` for deployment |
| `NEXT_PUBLIC_APP_NAME` | ❌ | `ALBA Finance v3` | App name (client-visible) |
| `NEXT_PUBLIC_CURRENCY` | ❌ | `IDR` | Currency for display |
| `NEXT_PUBLIC_LOCALE` | ❌ | `id-ID` | Locale for formatting |

---

## Default Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| SUPERADMIN | `superadmin@alba.local` | `Bismillah123!` |
| PIMPINAN | `pimpinan@alba.local` | `Bismillah123!` |
| MANAGER | `manager.kpk@alba.local` | `Bismillah123!` |
| STAFF | `staff.kantin@alba.local` | `Bismillah123!` |

> ⚠️ **SEGERA ganti password setelah login pertama!**

---

## RBAC Routes

| Route | Required Role |
|-------|:---:|
| `/login` | Public |
| `/dashboard` | All authenticated users |
| `/dashboard/units` | SUPERADMIN |
| `/dashboard/users` | SUPERADMIN |
| `/dashboard/lembaga` | SUPERADMIN |
| `/dashboard/settings` | SUPERADMIN |
| `/dashboard/financial-notes` | SUPERADMIN, PIMPINAN, MANAGER |
| `/dashboard/pos` | SUPERADMIN, MANAGER, STAFF |

---

## Troubleshooting

### Build error: "Cannot find module 'next'"
- Jalankan `npm install` dulu sebelum build.

### P1000 — Authentication failed
- ✅ Pastikan MySQL host, user, dan password benar
- ✅ Pastikan port 3306 terbuka
- ✅ Jalankan `npx prisma validate` untuk validasi schema

### "Invalid datasource" error
- Pastikan `DATABASE_URL` menggunakan format `mysql://user:pass@host:port/dbname`
- Jangan gunakan format `mysql://user@host:port/dbname` tanpa password

### Redirect loop pada /login
- Pastikan `NEXTAUTH_URL` sudah di-set di environment
- Pastikan `NEXTAUTH_SECRET` sudah di-set

### Static file 404
- Pastikan `public/` folder berisi semua aset (favicon, logo, dll)
- Pastikan `.next/static/` sudah ter-deploy dengan benar

---

## File Structure on Server

```
alba-brontolano-com/
├── server.js          (from .next/standalone/)
├── package.json        (from .next/standalone/)
├── prisma/
│   ├── schema.prisma
│   └── client/
├── .next/
│   ├── server/         (server build)
│   └── static/         (static assets)
├── public/             (static files)
└── node_modules/
```

---

*Generated for ALBA Finance v3 — by BrontoLano. https://alba.brontolano.com*

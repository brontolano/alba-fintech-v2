# ALBA Finance v2 — Deployment Guide (Hostinger)

## Overview
A Next.js 14 (App Router) + Prisma 6 (MySQL) + NextAuth 4 application.
This guide gets the app running on a Hostinger Node.js environment.

---

## Prerequisites (User-side)
- [ ] Hostinger hPanel account with Node.js ≥ 18 & MySQL database access
- [ ] Database credentials ready (host, user, db name, password)
- [ ] **NOTE:** Current `DATABASE_URL` points to `sql12.freesqldatabase.com` —
  a **free-tier** service, NOT Hostinger. If you have a Hostinger MySQL DB, update
  `DATABASE_URL` to the Hostinger format (see .env.example for template).

---

## Build (one-time, local)

```bash
# 1. Install deps
npm install          # (if pnpm timed out, use npm)

# 2. Validate & generate Prisma client
npx prisma validate
npx prisma generate

# 3. Build (generates .next/standalone/)
npx next build

# 4. Push schema + seed (requires valid DB credentials)
npx prisma db push --accept-data-loss   # creates tables
npx prisma db:seed                       # seeds 4 users + Unit Pusat
```

---

## Environment Variables (set in Hostinger hPanel)

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `mysql://user:pass@host:3306/dbname` | Use Hostinger's MySQL host (not freesqldatabase.com) |
| `NEXTAUTH_URL` | `https://alba.brontolano.com` | Your domain |
| `NEXTAUTH_SECRET` | *(base64 32-byte random)* | Generate: `openssl rand -base64 32` |
| `NODE_ENV` | `production` | — |

> ⚠️ Hostinger hPanel → Node.js → Environment Variables.
> Do NOT prefix with `NEXT_PUBLIC_` unless intended for client.

---

## Deploy (via FTP / File Manager)

### Step 1 — Upload `public/` to server
Merge project `/public` files with server's root `public/` folder.

### Step 2 — Upload `.next/standalone/` to server
Upload the **entire** contents of `.next/standalone/` into a folder on the server
(e.g., `/alba-fintech-v2/`).

### Step 3 — Run the app
```bash
node server.js
```
Hostinger hPanel → Node.js → Startup file → set to `server.js`.

---

## File Structure on Server (after upload)

```
alba-fintech-v2/
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

## Default Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| SUPERADMIN | admin@brontolano.com | bismillah |
| PIMPINAN | pimpinan@brontolano.com | bismillah |
| MANAGER | manager@brontolano.com | bismillah |
| STAFF | staff@brontolano.com | bismillah |

> ⚠️ **SEGERA ganti password setelah login pertama!** — bcrypt 10 rounds.

---

## RBAC Routes (protected by middleware)

| Route | Required Role |
|-------|:---:|
| `/login` | Public |
| `/dashboard/superadmin` | SUPERADMIN |
| `/dashboard/pimpinan` | PIMPINAN |
| `/dashboard/manager` | MANAGER |
| `/dashboard/staff` | STAFF |
| `/api/*` | Authenticated |

---

## Troubleshooting

### P1000 — Authentication failed
- ✅ Network OK (port 3306 terbuka via telnet)
- ✅ Schema valid (`prisma validate` lulus)
- ❌ **Password ditolak 9x+** — ini berarti:
  1. Database di `freesqldatabase.com` sudah **expired** (layanan gratis)
  2. Atau **gunakan Hostinger MySQL**, bukan freeSQLdatabase.com

### Build error: "Cannot find module 'next'"
- Jalankan `npm install` dulu sebelum build.

### "Cannot find module prisma/build/index.js"
- Jalankan `npx prisma generate` setelah `npm install`.

---

*Generated for ALBA Finance v2 — by BrontoLano. https://alba.brontolano.com*

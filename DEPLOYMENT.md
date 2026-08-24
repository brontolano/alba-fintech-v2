# 📦 ALBA Finance v2 — Deployment Guide (Hostinger)

## 🚀 One-Command Deploy (Standandalone)

After `npm install` dan database credentials terkonfigurasi:

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env → set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 2. Generate Prisma client
npx prisma generate

# 3. Build (standalone)
npx next build

# 4. Push schema (butuh DB credentials valid)
npx prisma db push --accept-data-loss

# 5. Seed (butuh DB push sukses)
npx prisma db:seed

# 6. Start production server
node server.js
```

> 🚨 **Catatan penting:** Database kita menggunakan `sql12.freesqldatabase.com` (FreeSQLDatabase.com — layanan GRATIS), **bukan Hostinger.** Password `B-5millahberkah` dapat kadaluarsa karena trial limit. Jika dapat error P1000, reset password di https://www.freesqldatabase.com atau gunakan Hostinger MySQL asli.

---

## 🔑 Default Credentials (setelah seed)

| Role | Email | Password |
|------|-------|----------|
| SUPERADMIN | `admin@brontolano.com` | `bismillah` |
| PIMPINAN | `pimpinan@brontolano.com` | `bismillah` |
| MANAGER | `manager@brontolano.com` | `bismillah` |
| STAFF | `staff@brontolano.com` | `bismillah` |

⚠️ **Ganti password setelah login pertama!** — bcrypt 10 rounds.

---

## 🌐 Hostinger Setup Steps (hPanel)

### 1. Buat database di hPanel → MySQL Databases
### 2. Update `.env`:
```
DATABASE_URL="mysql://your_user:your_pass@your_host:3306/your_db"
NEXTAUTH_URL="https://alba.brontolano.com"
NEXTAUTH_SECRET="<base64 32-byte random>"
```

### 3. Generate + Build (local):
```bash
npx prisma generate
npx next build  # → output standalone di .next/
```

### 4. Deploy via hPanel:
- **Node.js App** → Startup file → `server.js`
- **Public Directory** → set ke `public`
- Upload `.next/standalone/*` ke root app directory
- Upload `prisma/` (schema + client) ke server
- Set env vars via **Node.js → Environment Variables**

---

## 📂 Struktur Server (setelah deploy)

```
alba-fintech-v2/       (app root di Hostinger)
├── server.js                 ← entry point
├── .next/                    ← build output
│   ├── server/               ← server bundle
│   └── static/               ← static assets
├── public/                   ← static files
├── prisma/                   ← schema + client (untuk migrate)
└── .env                      ← environment variables
```

---

## 🔍 Troubleshooting (Hostinger)

### ❌ Error: P1000 — Authentication failed
- ✅ Network OK (port 3306 terbuka)
- ✅ Schema valid (`prisma validate` lulus)
- ❌ Password ditolak server → **reset password di freeSQLDatabase.com** atau pakai Hostinger MySQL

### ❌ Error: "Cannot find module prisma/build/index.js"
- Jalankan `npm install` + `npx prisma generate` ulang

### ❌ Build error: "No Next.js version installed"
- Pastikan `npm install` sudah selesai (modules siap)

### ❌ Error 500 pada /api/auth/signin
- Pastikan `NEXTAUTH_SECRET` sudah di-set (min 32 byte, base64)
- Pastikan `NEXTAUTH_URL` === domain produksi

---

*Generated for ALBA Finance v2 — by BrontoLano.*
*https://alba.brontolano.com — https://brontolano.com*

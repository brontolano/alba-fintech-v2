# 🚀 Deployment Guide (SSH Key Authentication)

## Prerequisites
- GitHub account
- Hostinger account with Node.js ≥ 18, MySQL, dan **SSH Access**
- OpenSSL (untuk generate NEXTAUTH_SECRET)
- SSH client (built-in di Windows 10/11, macOS, Linux)

---

## 1. Setup SSH Key di Hostinger

SSH key diperlukan untuk deploy otomatis yang aman dan andal.

### Buat SSH Key Pair
```bash
# Jalankan di terminal lokal
ssh-keygen -t ed25519 -f ~/.ssh/hostinger_deploy -N ""
```

Ini menghasilkan dua file:
- `~/.ssh/hostinger_deploy` — **private key** (jangan pernah share)
- `~/.ssh/hostinger_deploy.pub` — **public key**

### Upload Public Key ke Hostinger
1. Buka **Hostinger hPanel** → **SSH Access**
2. Buka `~/.ssh/hostinger_deploy.pub` di editor teks
3. Salin seluruh isi (biasanya dimulai dengan `ssh-ed25519 AAAA...`)
4. Klik **Add SSH Key**, beri nama `github-actions`, paste public key
5. Klik **Add**

### Dapatkan SSH Credentials
Di hPanel → **SSH Access**, catat:
- **Hostname** — contoh: `srv594.hstgr.io`
- **Username** — contoh: `u826712707` (tanpa `_alba`, ini adalah username SSH utama)
- **Port** — biasanya `63825` (Hostinger menggunakan custom port)
- **Home directory** — `/home/u826712707`

> ⚠️ **PENTING**: SSH username (untuk `HOSTINGER_SSH_USERNAME`) **berbeda** dengan FTP username.  
> FTP username adalah `u826712707_alba`, sedangkan SSH username adalah `u826712707`.

---

## 2. Setup GitHub Repository

### Set Remote Repository:
```bash
git remote set-url origin https://github.com/brontolano/alba-fintech-v3.git
git push -u origin main
```

---

## 3. Setup GitHub Actions Secrets

Di GitHub:
1. **Settings → Secrets and variables → Actions → New repository secret**

### Authentication Secrets (wajib)

| Secret Name | Nilai | Cara dapatkan |
|-------------|-------|---------------|
| `HOSTINGER_SSH_HOST` | `srv594.hstgr.io` | hPanel → SSH Access → Hostname |
| `HOSTINGER_SSH_USERNAME` | `u826712707` | hPanel → SSH Access → Username (bukan FTP username) |
| `HOSTINGER_SSH_KEY` | *(isikan private key)* | `cat ~/.ssh/hostinger_deploy` (salin seluruh isi) |
| `HOSTINGER_SSH_PORT` | `63825` | hPanel → SSH Access → Port |

### Application Secrets (wajib)

| Secret Name | Nilai | Cara dapatkan |
|-------------|-------|---------------|
| `NEXTAUTH_URL` | `https://alba.brontolano.com` | URL produksi Anda |
| `NEXTAUTH_SECRET` | `5sUxGk0kNdABjvWPF7SxAkaGoWwDppKlC-LVDOFhpbE` | `openssl rand -base64 32`<br>atau gunakan yang ada di `.env.local` |
| `DATABASE_URL` | `mysql://u826712707_alba:B-5millahberkah@srv594.hstgr.io:3306/u826712707_alba` | hPanel → MySQL → Connection String |
| `NODE_ENV` | `production` | Statis |

### Optional: Build-time Public Env Vars

| Secret Name | Nilai | Keterangan |
|-------------|-------|------------|
| `NEXT_PUBLIC_APP_NAME` | `ALBA Finance v3` | Nama aplikasi |
| `NEXT_PUBLIC_CURRENCY` | `IDR` | Mata uang |
| `NEXT_PUBLIC_LOCALE` | `id-ID` | Locale |

---

## 4. Push Code (Using Script)

### Mode Windows:
```cmd
git-push.bat "feat: update nama fitur"
```

### Mode Linux/Mac:
```bash
./git-push.sh "feat: update nama fitur"
```

---

## 5. Auto Deploy via GitHub Actions

Setiap kali Anda push ke branch `main`, GitHub Actions akan:
1. ✅ Build Next.js (standalone mode)
2. ✅ Upload `.next/standalone/` ke Hostinger via SSH
3. ✅ Install dependencies & generate Prisma client
4. ✅ Restart aplikasi otomatis

Cek progres di: **GitHub → Actions tab**

---

## 6. Verify Deployment

Buka di browser:
```
https://alba.brontolano.com
```

---

## 7. Login Akun Demo

| Role | Email | Password |
|------|-------|----------|
| SUPERADMIN | superadmin@alba.local | Bismillah123! |
| PIMPINAN | pimpinan@alba.local | Bismillah123! |
| MANAGER | manager.kpk@alba.local | Bismillah123! |
| STAFF | staff.kantin@alba.local | Bismillah123! |

> ⚠️ **SEGERA ganti password setelah login pertama!**

---

## Troubleshooting

### ❌ `Error: can't connect without a private SSH key or password`
- Pastikan semua 4 secrets SSH sudah di-set: `HOSTINGER_SSH_HOST`, `HOSTINGER_SSH_USERNAME`, `HOSTINGER_SSH_KEY`, `HOSTINGER_SSH_PORT`
- Pastikan private key **tanpa trailing newline** dan **full format** (bukan path ke file)
- Pastikan public key sudah ditambahkan di hPanel → SSH Access
- Cek port SSH yang benar di hPanel (biasanya bukan 22)

### ❌ `Permission denied (publickey)`
- Pastikan `HOSTINGER_SSH_KEY` berisi **private key penuh** (mulai dari `-----BEGIN OPENSSH PRIVATE KEY-----`)
- Pastikan `HOSTINGER_SSH_USERNAME` adalah username **SSH** (bukan FTP username)

### ❌ Build success tapi app error 500
- Pastikan `DATABASE_URL` sudah benar dan MySQL mengizinkan koneksi
- Pastikan `NEXTAUTH_SECRET` sudah di-generate (`openssl rand -base64 32`)
- Cek log di hPanel → Node.js → Logs

### ❌ App tidak restart otomatis
- Pastikan workflow berhasil sampai step terakhir
- Restart manual: hPanel → Node.js → Restart Application

---

## Quick Commands

```bash
# Build lokal
npm run build

# Start development server
npm run dev

# Run production
npm start

# Type check
npm run type-check
```
# 🚀 Deployment Guide

## Prerequisites
- GitHub account
- Hostinger account with Node.js & MySQL access
- OpenSSL (for generating NEXTAUTH_SECRET)

---

## 1. Setup GitHub Repository

### Jika belum ada repository di GitHub:
1. Buka https://github.com/new
2. Nama repository: **alba-fintech-v3**
3. Public atau Private (pilih sesuai kebutuhan)
4. Klik "Create repository"

### Set Remote Repository:
```bash
git remote set-url origin https://github.com/ANDANAYO/alba-fintech-v3.git
git push -u origin main
```

---

## 2. Setup GitHub Actions Secrets

Di GitHub:
1. **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Nilai |
|--------|-------|
| `HOSTINGER_FTP_HOST` | `srv594.hstgr.io` |
| `HOSTINGER_FTP_USERNAME` | `u826712707_alba` |
| `HOSTINGER_FTP_PASSWORD` | *(password FTP Anda)* |
| `NEXTAUTH_URL` | `https://alba.brontolano.com` |
| `NEXTAUTH_SECRET` | `5sUxGk0kNdABjvWPF7SxAkaGoWwDppKlC-LVDOFhpbE` |
| `DATABASE_URL` | `mysql://u826712707_alba:B-5millahberkah@srv594.hstgr.io:3306/u826712707_alba` |

---

## 3. Push Code (Using Script)

### Mode Windows:
```cmd
git-push.bat "fitur: update nama fitur"
```

### Mode Linux/Mac:
```bash
./git-push.sh "fitur: update nama fitur"
```

---

## 4. Auto Deploy via GitHub Actions

Setiap kali Anda push ke branch `main`, GitHub Actions akan:
1. ✅ Build Next.js
2. ✅ Upload ke Hostinger via FTP
3. ✅ Restart aplikasi

---

## 5. Verify Deployment

Buka di browser:
```
https://alba.brontolano.com
```

---

## 6. Login Akun Demo

| Email | Password |
|-------|----------|
| superadmin@alba.local | Bismillah123! |
| pimpinan@alba.local | Bismillah123! |
| manager.kpk@alba.local | Bismillah123! |
| staff.kantin@alba.local | Bismillah123! |

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
# GitHub Actions Secrets untuk Deploy ke Hostinger

## Instruksi Setup Secrets

Buka repository GitHub Anda → Settings → Secrets and variables → Actions → New repository secret

### Environment Variables (dapat di-copy dari .env Anda saat ini)
| Nama Secret | Deskripsi | Contoh |
|---|---|---|
| `NEXTAUTH_SECRET` | Secret acak 32-byte base64 untuk NextAuth | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL produksi domain Anda | `https://alba.brontolano.com` |
| `DATABASE_URL` | Connection string MySQL Hostinger | `mysql://user:pass@host:3306/dbname` |

### Hostinger FTP Credentials
| Nama Secret | Deskripsi |
|---|---|
| `HOSTINGER_FTP_HOST` | FTP Host dari hPanel (misal: `ftp.namadomain.com` atau IP server) |
| `HOSTINGER_FTP_USERNAME` | Username FTP akun hosting |
| `HOSTINGER_FTP_PASSWORD` | Password FTP akun hosting |
| `HOSTINGER_DEPLOY_PATH` | Path direktori deploy di server (misal: `/public_html` atau `/alba-fintech-v2`) |

### Alternatif: Hostinger SSH (jika memakai SSH)
| Nama Secret | Deskripsi |
|---|---|
| `HOSTINGER_SSH_HOST` | Host SSH |
| `HOSTINGER_SSH_USERNAME` | Username SSH |
| `HOSTINGER_SSH_KEY` | Private key SSH (tanpa passphrase) |

---

## Cara Membuat FTP Credentials di Hostinger

1. Buka hPanel → **FTP Accounts**
2. Klik **Create New** atau gunakan akun FTP default
3. Salin host, username, dan password
4. Catat juga **server directory** (biasanya `/public_html` atau subfolder khusus)
5. Masukkan ke GitHub Secrets di atas

---

## Cara Membuat SSH Key (opsional, jika deploy via SSH)

```bash
ssh-keygen -t ed25519 -C "github-actions@alba-fintech-v2"
# Salin isi ~/.ssh/id_ed25519.pub ke authorized_keys di server
# Salin isi ~/.ssh/id_ed25519 (private key) ke GitHub Secret HOSTINGER_SSH_KEY
```

---

## Verifikasi Deployment

Setelah workflow selesai, cek:
- Workflow status di tab **Actions** pada GitHub
- Website di `https://alba.brontolano.com` sudah terupdate
- Jika gagal, cek logs di workflow → **Deploy to Hostinger** step

---

*Generated for ALBA Finance v2 — by BrontoLano.*

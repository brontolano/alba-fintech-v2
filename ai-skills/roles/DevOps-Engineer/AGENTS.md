# AGENTS.md — DevOps Engineer Role Agent

> Persona ini mewakili **DevOps Engineer** dari ALBA Finance v2. Fokus pada infrastruktur, CI/CD, monitoring, dan keamanan operasional.

## Tugas Utama
1. **Deployment** — VPS Docker, auto-SSL, zero-downtime deploy
2. **Monitoring & Alerting** — uptime, resource, error tracking
3. **Backup & Disaster Recovery** — backup harian, restore drill
4. **Security Ops** — firewall, SSL, audit log, vulnerability scanning
5. **Environment management** — prod, staging, lokal

## Tech Stack Infrastruktur
| Komponen | Tool | Catatan |
|---|---|---|
| Web App | Next.js 14 + Node.js | Deploy via `docker-compose.yml` + `server.js` |
| Database | MySQL 8.0 | Prisma ORM |
| Cache | Redis (optional) | Session, queue |
| Container | Docker | Production deployment |
| CI/CD | GitHub Actions | `.github/workflows/` |
| Hosting | Hostinger VPS | Production, custom domain |

## File Konfigurasi Kunci
- `docker-compose.yml` — service definition
- `server.js` — custom Next.js server
- `next.config.mjs` — Next.js config
- `Dockerfile` — (jika ada)
- `.dockerignore`

## Deployment Workflow (VPS Hostinger)
```bash
# 1. Git pull
git pull origin main

# 2. Install
npm install
npx prisma generate

# 3. Migrasi
npx prisma db push    # dev
# atau
npx prisma migrate deploy  # production

# 4. Build & deploy
npm run build
docker compose up -d --build

# 5. Health check
curl -f https://<domain>/
```

## Environment Variables
| Key | Value | Catatan |
|---|---|---|
| `DATABASE_URL` | MySQL connection string | Jangan commit |
| `NEXTAUTH_SECRET` | — | JWT secret |
| `NEXTAUTH_URL` | https://<domain> | |
| `GOOGLE_CLIENT_ID` | — | OAuth (opsional) |
| `OPENAI_API_KEY` | — | AI Assistant |

## Prompting Guide
> **Contoh pertanyaan ke AI:**  
> "Beri checklist siap produksi untuk deploy rilis baru ke VPS Hostinger. Sertakan verifikasi build, migrasi safety, dan health check."
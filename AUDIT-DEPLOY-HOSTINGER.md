# ALBA Fintech v3 — Audit Deploy Hostinger

**Tanggal:** 2026-09-05  
**Status:** Identifikasi kendala deploy  
**Versi proyek:** 1.0.0 (Next.js 16.3.4, Node >=20)

---

## 🔴 Critical (Deployment Blockers)

| # | File | Problem | Fix |
|---|------|---------|-----|
| 1 | `deploy-package.zip` | 237MB — full node_modules copied | Don't copy node_modules; let Hostinger run `npm ci` |
| 2 | `deploy-package/` | No `package-lock.json` included | Copy it from root in deploy-prepare |
| 3 | `deploy-package/package.json` | Has `"build": "next build"` (pointless in pre-built package) | Remove build script or comment it |
| 4 | `server.js` | Crashes if `next-server.js` missing, no helpful error | Add clearer error + check location fallbacks |
| 5 | `server.js` | Warns but doesn't exit on missing DB/AUTH env | Exit with error code if required vars missing |

## 🟡 Warnings

| # | File | Problem | Fix |
|---|------|---------|-----|
| 6 | `prisma/schema.prisma` | binaryTargets only Linux — may fail if built on Windows | Rebuild on Linux or add Windows target for dev |
| 7 | `.gitignore` | `.next/` ignored — can't inspect standalone output on GitHub | Documented; not a bug itself |
| 8 | `DEPLOY.md` | Hardcodes domain `alba.brontolano.com` | Replace with placeholder `your-domain.com` |
| 9 | `.env.production` (template) | Missing `NEXT_PUBLIC_*` vars | Include all for completeness |

## 🟢 Info

| # | File | Note |
|---|------|------|
| 10 | `next.config.mjs` | `output: 'standalone'` ✅ — correct for Hostinger |
| 11 | `proxy.ts` | Role-based auth middleware — should work in standalone |
| 12 | `package.json` | `postinstall: prisma generate` ✅ |

---

## ✅ Cleanup Checklist (Before Re-Upload)

- [ ] **`scripts/deploy-prepare.mjs`**: Remove full node_modules copy (line ~94)
- [ ] **`scripts/deploy-prepare.mjs`**: Add `package-lock.json` copy after package.json creation
- [ ] **`deploy-package/package.json`**: Remove `"build"` script (only keep `"start"`, `"postinstall"`)
- [ ] **`server.js`**: Exit with non-zero code if DATABASE_URL and NEXTAUTH_SECRET missing
- [ ] **`DEPLOY.md`**: Replace hardcoded domain with placeholder
- [ ] Test locally:
  ```bash
  npm run build
  node scripts/deploy-prepare.mjs
  ls -lh deploy-package/
  zip -r alba-fintech-v3-deploy.zip deploy-package/
  ```
  - Expected zip size: <50MB (not 237MB)

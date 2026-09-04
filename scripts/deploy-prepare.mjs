/**
 * ALBA Finance v3 — Deploy Prepare Script untuk Hostinger
 *
 * Langkah:
 *   1. npm run build          (generate .next/standalone)
 *   2. node scripts/deploy-prepare.mjs
 *   3. Upload seluruh isi deploy-package/ ke Hostinger
 *   4. Set ENV vars di hPanel → Node.js
 *   5. Klik Restart Application
 *
 * Struktur deploy-package/ yang dihasilkan:
 *   server.js          <- entry point kustom (set env, health check)
 *   next-server.js     <- Next.js standalone server (asli)
 *   .next/             <- Build output
 *   .next/static/      <- Static assets CSS/JS
 *   node_modules/      <- Deps minimal dari standalone + Prisma
 *   prisma/            <- Schema Prisma
 *   public/            <- Aset statis (logo, favicon)
 *   package.json       <- Lean: name, engines, start script
 *   .env.production    <- Template env vars
 */

import { existsSync, mkdirSync, cpSync, copyFileSync, renameSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const STANDALONE = join(ROOT, '.next', 'standalone');
const DEPLOY     = join(ROOT, 'deploy-package');

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function copyDir(src, dest, label) {
  if (!existsSync(src)) {
    console.warn('⚠️  Source not found, skipping:', src);
    return;
  }
  ensureDir(dest);
  cpSync(src, dest, { recursive: true, force: true });
  if (label) console.log('✅', label);
}

console.log('\n📦 ALBA Finance v3 — Deploy Prepare\n');

// Validasi
if (!existsSync(STANDALONE)) {
  console.error('❌ .next/standalone tidak ditemukan!');
  console.error('   Jalankan dulu: npm run build');
  process.exit(1);
}

// Bersihkan dan buat ulang folder deploy
rmSync(DEPLOY, { recursive: true, force: true });
ensureDir(DEPLOY);

// 1. Copy seluruh standalone bundle ke root deploy-package
//    Ini akan menyalin: server.js (Next.js), package.json, node_modules/, .next/
copyDir(STANDALONE, DEPLOY, '.next/standalone → deploy-package/');

// 2. Rename server.js Next.js → next-server.js (supaya tidak ditimpa oleh server.js kustom kita)
const nextServerSrc  = join(DEPLOY, 'server.js');
const nextServerDest = join(DEPLOY, 'next-server.js');
if (existsSync(nextServerSrc)) {
  renameSync(nextServerSrc, nextServerDest);
  console.log('✅ server.js (Next.js) → next-server.js');
}

// 3. Copy public folder (favicon, logo, manifest)
copyDir(join(ROOT, 'public'), join(DEPLOY, 'public'), 'public/ → deploy-package/public/');

// 4. Copy .next/static (CSS, JS chunks — WAJIB untuk standalone)
copyDir(
  join(ROOT, '.next', 'static'),
  join(DEPLOY, '.next', 'static'),
  '.next/static → deploy-package/.next/static/'
);

// 5. Salin server.js kustom kita (wrapper yang load env, health check, panggil next-server.js)
const customServerSrc = join(ROOT, 'server.js');
if (existsSync(customServerSrc)) {
  copyFileSync(customServerSrc, join(DEPLOY, 'server.js'));
  console.log('✅ server.js (custom entry point)');
}

// 6. Pastikan Prisma engine ada di standalone node_modules
const standaloneNodeModules = join(DEPLOY, 'node_modules');
const rootNodeModules        = join(ROOT, 'node_modules');

for (const dir of ['.prisma', '@prisma']) {
  const src  = join(rootNodeModules, dir);
  const dest = join(standaloneNodeModules, dir);
  copyDir(src, dest, 'node_modules/' + dir + ' (Prisma engine)');
}

// Copy sharp (dibutuhkan oleh Next.js image optimization di standalone mode)
copyDir(join(rootNodeModules, 'sharp'), join(standaloneNodeModules, 'sharp'), 'node_modules/sharp (image optimizer)');

// 7. Copy prisma schema
ensureDir(join(DEPLOY, 'prisma'));
const schemaSrc = join(ROOT, 'prisma', 'schema.prisma');
if (existsSync(schemaSrc)) {
  copyFileSync(schemaSrc, join(DEPLOY, 'prisma', 'schema.prisma'));
  console.log('✅ prisma/schema.prisma');
}

// 8. Buat package.json lean untuk Hostinger (hPanel hanya butuh start script)
const pkgSrcRaw = readFileSync(join(ROOT, 'package.json'), 'utf8');
const pkgSrc = JSON.parse(pkgSrcRaw);
const pkgDeploy = {
  name: pkgSrc.name,
  version: pkgSrc.version,
  private: true,
  engines: pkgSrc.engines,
  scripts: {
    start: 'node server.js',
  },
};
writeFileSync(join(DEPLOY, 'package.json'), JSON.stringify(pkgDeploy, null, 2));
console.log('✅ package.json (lean, start: node server.js)');

// 9. Copy .env.production jika ada di root, atau buat template
const envSrc  = join(ROOT, '.env.production');
const envDest = join(DEPLOY, '.env.production');
if (existsSync(envSrc)) {
  copyFileSync(envSrc, envDest);
  console.log('✅ .env.production (copied from project root)');
} else {
  const template = [
    '# ALBA Finance v3 — Production Environment',
    '# Isi sesuai konfigurasi Hostinger Anda sebelum upload!',
    '',
    '# Database MySQL Hostinger',
    'DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:3306/DBNAME"',
    '',
    '# URL publik aplikasi (tanpa trailing slash)',
    'NEXTAUTH_URL="https://your-domain.com"',
    '',
    '# Secret untuk JWT — generate dengan: openssl rand -base64 32',
    'NEXTAUTH_SECRET="GANTI_DENGAN_RANDOM_STRING_32_KARAKTER"',
    '',
    '# Runtime',
    'NODE_ENV="production"',
    '',
    '# Port (Hostinger biasanya set ini otomatis, tapi bisa diisi 3000)',
    '# PORT=3000',
    '# HOSTNAME=0.0.0.0',
  ].join('\n');
  writeFileSync(envDest, template);
  console.log('📝 .env.production (template — WAJIB diisi sebelum upload ke Hostinger!)');
}

console.log('\n🎉 Deploy package siap di: deploy-package/');
console.log('\n📋 Langkah selanjutnya:');
console.log('   1. Edit deploy-package/.env.production dengan kredensial Hostinger');
console.log('   2. Upload SELURUH ISI deploy-package/ ke folder aplikasi di Hostinger');
console.log('   3. Di hPanel → Node.js: set Application startup file ke "server.js"');
console.log('   4. Set ENV vars di hPanel (DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, NODE_ENV)');
console.log('   5. Klik Restart Application');
console.log('   6. Test: curl https://your-domain.com/health\n');
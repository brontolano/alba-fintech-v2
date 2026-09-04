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

// 5a. Hapus .env lokal yang tidak sengaja tersalin dari standalone/ (jangan sampai bocor ke Hostinger!)
const leakedEnv = join(DEPLOY, '.env');
if (existsSync(leakedEnv)) {
  rmSync(leakedEnv, { force: true });
  console.log('🧹 Menghapus .env lokal yang bocor ke deploy-package/');
}
// Juga hapus .env.local / .env.development jika ada
for (const leaked of ['.env.local', '.env.development', '.env.development.local', '.env.test', '.env.production.local']) {
  const p = join(DEPLOY, leaked);
  if (existsSync(p)) {
    rmSync(p, { force: true });
    console.log('🧹 Menghapus ' + leaked + ' dari deploy-package/');
  }
}
const customServerSrc = join(ROOT, 'server.js');
if (existsSync(customServerSrc)) {
  copyFileSync(customServerSrc, join(DEPLOY, 'server.js'));
  console.log('✅ server.js (custom entry point)');
}

// 6. Salin package-lock.json (untuk npm ci yang reproducible di Hostinger)
const lockSrc = join(ROOT, 'package-lock.json');
if (existsSync(lockSrc)) {
  copyFileSync(lockSrc, join(DEPLOY, 'package-lock.json'));
  console.log('✅ package-lock.json → deploy-package/');
}

// 6b. Salin script reset-users.ts untuk keperluan manajemen user di server
ensureDir(join(DEPLOY, 'scripts'));
const resetScriptSrc = join(ROOT, 'scripts', 'reset-users.ts');
if (existsSync(resetScriptSrc)) {
  copyFileSync(resetScriptSrc, join(DEPLOY, 'scripts', 'reset-users.ts'));
  console.log('✅ scripts/reset-users.ts → deploy-package/scripts/');
}

// 7. Pastikan Prisma client runtime & query engine tersedia di deploy-package/node_modules
//    Hostinger akan panggil `postinstall: prisma generate` — butuh paket prisma di node_modules
const standaloneNodeModules = join(DEPLOY, 'node_modules');
const rootNodeModules        = join(ROOT, 'node_modules');

if (!existsSync(standaloneNodeModules)) ensureDir(standaloneNodeModules);

console.log('📦 Memastikan paket Prisma runtime tersedia di node_modules...');

// Prisma packages yang WAJIB ada untuk prisma generate + client di runtime
const PRISMA_PACKAGES = ['@prisma', 'prisma', 'bcryptjs', 'sharp'];
for (const pkg of PRISMA_PACKAGES) {
  const srcPkg = join(rootNodeModules, pkg);
  if (existsSync(srcPkg)) {
    copyDir(srcPkg, join(standaloneNodeModules, pkg), `${pkg} → node_modules/`);
  } else {
    console.warn('⚠️  Paket', pkg, 'tidak ditemukan di root node_modules');
  }
}

// Query engine binary (linux-musl atau debian-openssl) — cek di prisma/engines/ atau @prisma/client/
const prismaEnginesSrc = join(rootNodeModules, 'prisma', 'engines');
if (existsSync(prismaEnginesSrc)) {
  copyDir(prismaEnginesSrc, join(standaloneNodeModules, 'prisma', 'engines'), 'prisma/engines (query engine binary)');
} else {
  const clientEngines = join(rootNodeModules, '@prisma', 'client', 'runtime');
  if (existsSync(clientEngines)) {
    copyDir(clientEngines, join(standaloneNodeModules, '@prisma', 'client', 'runtime'), '@prisma/client/runtime → node_modules/');
  }
}

// 7a. (Opsional) Salin node_modules penuh hanya jika dipaksakan via env
if (process.env.COPY_NODE_MODULES === '1') {
  console.log('📦 COPY_NODE_MODULES=1 — menyalin node_modules penuh (ukuran besar)...');
  copyDir(rootNodeModules, standaloneNodeModules, 'node_modules/ (full copy)');
} else {
  console.log('⏭️  node_modules penuh dilewati (hanya Prisma + critical deps yang disalin)');
}

// 7. Copy prisma schema
ensureDir(join(DEPLOY, 'prisma'));
const schemaSrc = join(ROOT, 'prisma', 'schema.prisma');
if (existsSync(schemaSrc)) {
  copyFileSync(schemaSrc, join(DEPLOY, 'prisma', 'schema.prisma'));
  console.log('✅ prisma/schema.prisma');
}

// 8. Buat package.json lengkap untuk Hostinger (dengan semua dependensi yang diperlukan)
const pkgSrcRaw = readFileSync(join(ROOT, 'package.json'), 'utf8');
const pkgSrc = JSON.parse(pkgSrcRaw);

// Ambil SEMUA dependencies dari package.json asli (kecuali devDependencies)
const fullDeps = { ...pkgSrc.dependencies };

const pkgDeploy = {
  name: pkgSrc.name,
  version: pkgSrc.version,
  private: true,
  engines: pkgSrc.engines,
  scripts: {
    // NOTE: build script intentionally omitted — deploy-package is pre-built
    // Only run `npm run build` if you need to rebuild from source
    start: "node server.js",
    postinstall: "prisma generate"
  },
  dependencies: fullDeps
};
writeFileSync(join(DEPLOY, 'package.json'), JSON.stringify(pkgDeploy, null, 2));
console.log('✅ package.json (dependencies + start/postinstall scripts only)');

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
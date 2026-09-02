// Build script untuk Hostinger hPanel
// Usage: node scripts/deploy-prepare.mjs
//
// Hasil: folder deploy-package/ berisi:
//   - .next/standalone/  (server.js + minimal node_modules)
//   - public/             (static assets)
//   - .next/static/       (build artifacts)
//   - .env.production     (template — Anda isi manual)

import { existsSync, mkdirSync, cpSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const STANDALONE = join(ROOT, '.next', 'standalone');
const DEPLOY = join(ROOT, 'deploy-package');

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function copyDir(src, dest) {
  if (!existsSync(src)) {
    console.warn(`⚠️  Source not found: ${src}`);
    return;
  }
  ensureDir(dirname(dest));
  cpSync(src, dest, { recursive: true });
  console.log(`✅ Copied ${src} → ${dest}`);
}

console.log('📦 Preparing Hostinger deploy package...\n');

// 1. .next/standalone → deploy-package/
copyDir(STANDALONE, DEPLOY);

// 2. public/ → deploy-package/public/
copyDir(join(ROOT, 'public'), join(DEPLOY, 'public'));

// 3. .next/static/ → deploy-package/.next/static/
copyDir(join(ROOT, '.next', 'static'), join(DEPLOY, '.next', 'static'));

// 4. Prisma engine binaries (WAJIB di-copy manual karena webpack externals)
const standaloneNodeModules = join(DEPLOY, 'node_modules');
const rootNodeModules = join(ROOT, 'node_modules');

const prismaArtifacts = [
  '.prisma',
  '@prisma',
];

for (const dir of prismaArtifacts) {
  const src = join(rootNodeModules, dir);
  const dest = join(standaloneNodeModules, dir);
  if (existsSync(src)) {
    copyDir(src, dest);
  }
}

// 5. .env.production template (kalau ada)
if (existsSync(join(ROOT, '.env.production'))) {
  copyFileSync(join(ROOT, '.env.production'), join(DEPLOY, '.env.production'));
  console.log('✅ Copied .env.production');
} else {
  console.log('ℹ️  .env.production not found — create manually on server');
}

console.log('\n🎉 Deploy package ready at: deploy-package/');
console.log('\nNext steps:');
console.log('  1. cd deploy-package');
console.log('  2. zip -r deploy.zip .  (or compress via File Manager)');
console.log('  3. Upload to hPanel → File Manager → public_html/alba/');
console.log('  4. Extract di server');
console.log('  5. Set env vars di hPanel → Node.js App');
console.log('  6. Klik Restart');
console.log('\n⚠️  Jangan lupa set PORT/HOSTNAME di hPanel env vars.');

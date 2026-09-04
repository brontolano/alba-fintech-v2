/**
 * ALBA Finance v3 — Custom Entry Point untuk Hostinger
 * Wrapper untuk Next.js standalone server.
 *
 * Cara jalankan: node server.js
 * Environment vars harus sudah di-set di hPanel sebelum start.
 */

// Load .env.production jika ada (fallback jika hPanel tidak load env)
const path = require('path');
const fs   = require('fs');

const envProdPath = path.join(__dirname, '.env.production');
if (fs.existsSync(envProdPath)) {
  const lines = fs.readFileSync(envProdPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val  = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

// Set defaults
process.env.PORT     = process.env.PORT     || '3000';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Validate required env vars before starting the server
function requireEnv(name) {
  if (!process.env[name]) {
    console.error(`\n❌ FATAL: Required environment variable ${name} is not set.`);
    console.error('   Set it in hPanel → Node.js → Environment Variables,');
    console.error('   or create/edit .env.production with the value.');
    console.error('   See DEPLOY.md for the full list.\n');
    process.exit(1);
  }
}

requireEnv('DATABASE_URL');
requireEnv('NEXTAUTH_SECRET');

console.log('\n🚀 Starting ALBA Finance v3...');
console.log('  PORT      :', process.env.PORT);
console.log('  HOSTNAME  :', process.env.HOSTNAME);
console.log('  NODE_ENV  :', process.env.NODE_ENV);
console.log('  DB URL    : ✅ set');
console.log('  NEXTAUTH  : ✅ set');

// Jalankan Next.js standalone server (di-rename dari server.js asli saat deploy:prepare)
const nextServer = path.join(__dirname, 'next-server.js');
if (!fs.existsSync(nextServer)) {
  console.error('\n❌ next-server.js tidak ditemukan di:', nextServer);
  console.error('   Pastikan deploy-package/ sudah lengkap.');
  console.error('   Jalankan ulang: node scripts/deploy-prepare.mjs\n');
  process.exit(1);
}

require(nextServer);

/**
 * ALBA Finance v3 — Hostinger Standalone Server Entry Point
 * Run: node server.js  (set NODE_ENV=production + env vars di hPanel)
 */
const { createServer } = require('http');
const next = require('next');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

async function checkDB() {
  try {
    const prisma = new PrismaClient();
    await prisma.$queryRaw({ sql: 'SELECT 1' });
    await prisma.$disconnect();
    console.log('✅ Database connection OK');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('⚠️  App will start, but DB-dependent routes will fail until credentials are fixed.');
  }
}

async function start() {
  await app.prepare();
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }
    handle(req, res);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (HOSTINGER)`);
  });
}

start().then(() => {
  if (!dev) checkDB();
}).catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

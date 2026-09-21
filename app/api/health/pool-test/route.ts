import { NextResponse } from 'next/server';
import * as mariadb from 'mariadb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
  }

  const parsed = new URL(url);
  const host = parsed.hostname;
  const port = Number(parsed.port) || 3306;
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const database = parsed.pathname.replace(/^\//, '');

  const results: Record<string, unknown> = {};

  // Test A: mariadb.createConnection (known to work)
  try {
    const conn = await Promise.race([
      mariadb.createConnection({ host, port, user, password, database, connectTimeout: 5000 }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('createConnection timeout')), 5000)),
    ]);
    const rows = await conn.query('SELECT 1 AS alive');
    await conn.end();
    results.createConnection = { ok: true, rows };
  } catch (e: unknown) {
    results.createConnection = { ok: false, error: (e as Error).message };
  }

  // Test B: mariadb.createPool + getConnection (simulates what PrismaMariaDb does)
  try {
    const pool = mariadb.createPool({
      host, port, user, password, database,
      connectionLimit: 2,
      connectTimeout: 5000,
      acquireTimeout: 5000,
    });
    const conn = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('pool.getConnection timeout')), 5000)),
    ]);
    const rows = await conn.query('SELECT 2 AS pool_alive');
    conn.release();
    await pool.end();
    results.createPool = { ok: true, rows };
  } catch (e: unknown) {
    results.createPool = { ok: false, error: (e as Error).message, code: (e as { code?: string })?.code };
  }

  // Test C: mariadb.createPool with URL string (exactly what PrismaMariaDb does internally)
  try {
    const urlStr = `mariadb://${user}:${password}@${host}:${port}/${database}?prepareCacheLength=0`;
    const pool = mariadb.createPool(urlStr);
    const conn = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('url pool timeout')), 5000)),
    ]);
    const rows = await conn.query('SELECT 3 AS url_pool_alive');
    conn.release();
    await pool.end();
    results.urlPool = { ok: true, rows };
  } catch (e: unknown) {
    results.urlPool = { ok: false, error: (e as Error).message, code: (e as { code?: string })?.code };
  }

  // Test D: mariadb.createPool with mysql:// URL rewrite (what normalizeConfig does)
  try {
    const urlStr = `mysql://${user}:${password}@${host}:${port}/${database}?prepareCacheLength=0`;
    const pool = mariadb.createPool(urlStr);
    const conn = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('mysql url pool timeout')), 5000)),
    ]);
    const rows = await conn.query('SELECT 4 AS mysql_url_pool_alive');
    conn.release();
    await pool.end();
    results.mysqlUrlPool = { ok: true, rows };
  } catch (e: unknown) {
    results.mysqlUrlPool = { ok: false, error: (e as Error).message, code: (e as { code?: string })?.code };
  }

  const allOk = Object.values(results).every(
    (v) => typeof v === 'object' && v !== null && 'ok' in v && (v as { ok: boolean }).ok
  );

  return NextResponse.json({ ok: allOk, ...results }, { status: allOk ? 200 : 503 });
}

import { NextResponse } from 'next/server';
import * as dns from 'dns';
import * as net from 'net';
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

  const results: Record<string, unknown> = { host, port, user, database };

  // Test 1: DNS resolution
  try {
    const addrs = await dns.promises.resolve4(host);
    results.dns = { ok: true, addresses: addrs };
  } catch (e: unknown) {
    results.dns = { ok: false, error: (e as Error).message };
  }

  // Test 2: TCP connectivity (3s timeout)
  try {
    await new Promise<void>((resolve, reject) => {
      const sock = new net.Socket();
      const timer = setTimeout(() => {
        sock.destroy();
        reject(new Error('TCP connect timeout'));
      }, 3000);
      sock.connect(port, host, () => {
        clearTimeout(timer);
        sock.destroy();
        resolve();
      });
      sock.on('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
    });
    results.tcp = { ok: true };
  } catch (e: unknown) {
    results.tcp = { ok: false, error: (e as Error).message };
  }

  // Test 3: Direct mariadb connection (5s timeout)
  try {
    const conn = await Promise.race([
      mariadb.createConnection({
        host, port, user, password, database,
        connectTimeout: 5000,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('mariadb connect timeout')), 5000)
      ),
    ]);
    const rows = await conn.query('SELECT 1 AS alive');
    await conn.end();
    results.directConnection = { ok: true, rows };
  } catch (e: unknown) {
    results.directConnection = { ok: false, error: (e as Error).message, code: (e as { code?: string })?.code };
  }

  const allOk = Object.values(results).every(
    (v) => typeof v === 'object' && v !== null && 'ok' in v && (v as { ok: boolean }).ok
  );

  return NextResponse.json(
    { ok: allOk, ...results },
    { status: allOk ? 200 : 503 }
  );
}

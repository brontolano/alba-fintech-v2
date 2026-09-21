import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DB_CHECK_TIMEOUT_MS = 4000;

const ENV_REQUIRED = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'NODE_ENV'] as const;
const ENV_OPTIONAL = [
  'BACKUP_DIRECTORY',
  'BACKUP_RETENTION_DAYS',
  'GOOGLE_APPS_SCRIPT_URL',
  'GOOGLE_APPS_SCRIPT_SECRET',
] as const;

function envStatus(key: string) {
  const value = process.env[key];
  return value && value.trim() !== '' ? 'set' : 'missing';
}

function envCheck() {
  return {
    required: ENV_REQUIRED.map((key) => ({ key, status: envStatus(key) })),
    optional: ENV_OPTIONAL.map((key) => ({ key, status: envStatus(key) })),
    missingRequired: ENV_REQUIRED.filter((key) => envStatus(key) === 'missing'),
  };
}

export async function GET() {
  const started = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB check timeout')), DB_CHECK_TIMEOUT_MS)
      ),
    ]);
    return NextResponse.json({
      ok: true,
      db: 'up',
      latencyMs: Date.now() - started,
      env: envCheck(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    console.error('[Health] DB check failed:', code, message);
    return NextResponse.json(
      { ok: false, db: 'down', error: code, latencyMs: Date.now() - started, env: envCheck() },
      { status: 503 }
    );
  }
}

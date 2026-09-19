import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DB_CHECK_TIMEOUT_MS = 4000;

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
    });
  } catch {
    // Jangan bocorkan detail error internal; cukup status down.
    return NextResponse.json(
      { ok: false, db: 'down', latencyMs: Date.now() - started },
      { status: 503 }
    );
  }
}

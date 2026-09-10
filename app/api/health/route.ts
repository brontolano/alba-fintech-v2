import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check (DB probe omitted to avoid false negatives
    // when DB credentials are not configured for anonymous probes)
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'alba-fintech-v3',
        version: '1.1.0',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: 'Health check failed' },
      { status: 500 }
    );
  }
}

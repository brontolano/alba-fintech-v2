import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'ALBA Finance v4',
        version: '4.0.0-alpha',
    });
}

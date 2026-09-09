import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        message: 'ALBA Finance v4 API',
        version: '4.0.0-alpha',
    });
}

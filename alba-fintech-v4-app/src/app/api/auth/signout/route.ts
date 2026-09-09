import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    // For now, return redirect info for client-side signOut
    return NextResponse.json({
        status: 'unauthorized',
        redirectUrl: callbackUrl,
    });
}

export async function POST(request: NextRequest) {
    // This route can be used for programmatic signOut
    return NextResponse.json({ status: 'ok' });
}

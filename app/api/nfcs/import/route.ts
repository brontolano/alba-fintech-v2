import { NextRequest, NextResponse } from 'next/server';
import { importNfc, ImportNfcPayload } from '../../../../lib/nfc.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = body as ImportNfcPayload;

    if (!payload.uid) {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }

    const result = await importNfc(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Failed to import NFC' }, { status: 400 });
  }
}
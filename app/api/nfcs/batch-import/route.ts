import { NextRequest, NextResponse } from 'next/server';
import { importNfc } from '../../../../lib/nfc.service';

interface BatchImportPayload {
  uids: string[];
  mode?: 'manual' | 'scan';
  unitId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uids, mode = 'scan', unitId } = body as BatchImportPayload;

    if (!Array.isArray(uids) || uids.length === 0) {
      return NextResponse.json({ error: 'uids array is required' }, { status: 400 });
    }

    if (uids.length > 200) {
      return NextResponse.json({ error: 'Maximum 200 UIDs per batch' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const uid of uids) {
      try {
        const result = await importNfc({ uid, mode, unitId });
        results.push({ uid, success: true, data: result });
      } catch (error: any) {
        errors.push({ uid, success: false, error: error.message });
      }
    }

    return NextResponse.json({
      total: uids.length,
      success: results.length,
      failed: errors.length,
      results,
      errors,
    }, { status: errors.length === uids.length ? 400 : 201 });
  } catch (error: any) {
    console.error('Batch import error:', error);
    return NextResponse.json({ error: error.message || 'Batch import failed' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    if (!file || !file.name) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filename = `item-${timestamp}.${ext}`;
    const dir = join(process.cwd(), 'public', 'uploads', 'inventory');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), bytes);

    const url = `/uploads/inventory/${filename}`;
    return NextResponse.json({ url, filename }, { status: 200 });
  } catch (error) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

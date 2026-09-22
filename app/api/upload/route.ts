import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import { uploadToDrive } from '@/lib/upload-drive';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

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

    // Validasi tipe file: hanya gambar yang diizinkan
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung. Hanya JPEG, PNG, dan WebP yang diizinkan.' },
        { status: 400 }
      );
    }

    // Validasi ukuran
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 5MB.' },
        { status: 400 }
      );
    }

    // Sanitasi ekstensi dari whitelist, bukan dari nama file klien
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = extMap[file.type] ?? 'jpg';

    const bytes = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const filename = `item-${timestamp}.${ext}`;
    const { searchParams } = new URL(request.url);
    const isBukti = searchParams.get('folder') === 'bukti';

    // Bukti transaksi -> Google Drive pemilik (folder "Bukti Transaksi").
    // Gagal/belum dikonfigurasi -> fallback lokal via /api/bukti.
    if (isBukti) {
      try {
        const drive = await uploadToDrive({
          bytes,
          filename,
          mimeType: file.type,
          folder: 'Bukti Transaksi',
        });
        return NextResponse.json(
          { url: drive.url, filename: drive.fileName, storage: 'drive' },
          { status: 200 },
        );
      } catch (driveErr) {
        console.warn(
          '[Upload API] Drive gagal, fallback lokal:',
          (driveErr as Error).message,
        );
        const dir = join(process.cwd(), 'data', 'bukti');
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, filename), bytes);
        return NextResponse.json(
          {
            url: `/api/bukti/${filename}`,
            filename,
            storage: 'local',
            warning:
              'Tersimpan lokal (Google Drive belum dikonfigurasi). ' +
              (driveErr as Error).message,
          },
          { status: 200 },
        );
      }
    }

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

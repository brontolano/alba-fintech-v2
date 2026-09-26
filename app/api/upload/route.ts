import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import { uploadToDrive } from '@/lib/upload-drive';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, saveImage } from '@/lib/storage';

function extFor(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

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
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung. Hanya JPEG, PNG, dan WebP yang diizinkan.' },
        { status: 400 },
      );
    }

    // Validasi ukuran
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 5MB.' },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const { searchParams } = new URL(request.url);
    const isBukti = searchParams.get('folder') === 'bukti';

    // Bukti transaksi -> Google Drive pemilik (folder "Bukti Transaksi").
    // Gagal/belum dikonfigurasi -> fallback penyimpanan lokal terpusat.
    if (isBukti) {
      try {
        const drive = await uploadToDrive({
          bytes,
          filename: `bukti-${Date.now()}.${extFor(file.type)}`,
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
        const stored = await saveImage({ bytes, mimeType: file.type, folder: 'bukti' });
        return NextResponse.json(
          {
            url: stored.url,
            filename: stored.filename,
            storage: 'local',
            warning:
              'Tersimpan lokal (Google Drive belum dikonfigurasi). ' +
              (driveErr as Error).message,
          },
          { status: 200 },
        );
      }
    }

    const stored = await saveImage({ bytes, mimeType: file.type, folder: 'inventory' });
    return NextResponse.json({ url: stored.url, filename: stored.filename }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('[Upload API] Error:', error);
    const isValidation = message.includes('Tipe file') || message.includes('Ukuran file');
    return NextResponse.json({ error: message }, { status: isValidation ? 400 : 500 });
  }
}
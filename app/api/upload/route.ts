import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import prisma from '@/lib/prisma';
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
  const role = session.user.role;
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role ?? "")) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const requestedFolder = new URL(request.url).searchParams.get('folder');
  const folder = requestedFolder === 'bukti' ? 'bukti' : 'inventory';
  if (folder === 'inventory' && !["SUPERADMIN", "MANAGER", "STAFF"].includes(role ?? "")) {
    return NextResponse.json(
      { error: 'Hanya pengelola unit yang dapat mengunggah gambar inventori' },
      { status: 403 },
    );
  }

  // Folder bukti: file akan dirujuk dari Transaction.photoUrl /
  // SavingsTransaction.photoUrl. Sebelum ditulis, kuncankan bahwa upload
  // terjadi dalam scope session — konsisten dengan route baca
  // /uploads/[...path]/route.ts. Tanpa scope (mis. role custom atau sesi
  // tanpa unit/lembaga), tolak eksplisit 403 daripada membiarkan URL
  // orphan tercipta.
  if (folder === 'bukti') {
    if (role === 'SUPERADMIN') {
      // Bypass — boleh lintas scope.
    } else if (role === 'PIMPINAN') {
      if (!session.user.lembagaId) {
        return NextResponse.json(
          { error: 'Scope lembaga tidak tersedia pada sesi' },
          { status: 403 },
        );
      }
    } else if (role === 'MANAGER' || role === 'STAFF') {
      if (!session.user.unitId) {
        return NextResponse.json(
          { error: 'Scope unit tidak tersedia pada sesi' },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Role tidak berwenang mengunggah bukti' },
        { status: 403 },
      );
    }
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

    // Opsional — bukti terikat record. Bila client mengirim `recordId` +
    // `recordType`, route HARUS memverifikasi record ada dan dalam scope
    // sesi sebelum menulis file. Tanpa `recordId` (alur create) route
    // tetap menerima upload — caller (dashboard) sering mengunggah proof
    // sebelum record dibuat, lalu menempelkan URL ke body POST create.
    //
    // Mitigasi audit HIGH-3 (docs/AUDIT-MODUL-2026-10-05.md): mencegah
    // sesi terautentikasi "menempelkan" file bukti ke record orang lain
    // dengan mengirim recordId valid dari sesi berbeda.
    const rawRecordId = formData.get('recordId');
    const rawRecordType = formData.get('recordType');
    const recordId =
      typeof rawRecordId === 'string' && rawRecordId.trim().length > 0
        ? rawRecordId.trim()
        : null;
    const recordType =
      typeof rawRecordType === 'string' && rawRecordType.trim().length > 0
        ? rawRecordType.trim()
        : null;
    if (recordId || recordType) {
      // Keduanya harus dikirim bersamaan.
      if (!recordId) {
        return NextResponse.json(
          { error: 'recordType tanpa recordId tidak valid' },
          { status: 400 },
        );
      }
      if (!recordType || (recordType !== 'transaction' && recordType !== 'savings')) {
        return NextResponse.json(
          { error: 'recordType harus bernilai "transaction" atau "savings"' },
          { status: 400 },
        );
      }
      // Resolve record di DB. SavingsTransaction tidak punya relasi
      // `units` di schema, jadi lembaga di-derive via Unit terpisah.
      let record: { id: string; unitId: string; lembagaId: string | null } | null = null;
      if (recordType === 'transaction') {
        const tx = await prisma.transaction.findUnique({
          where: { id: recordId },
          select: { id: true, unitId: true, units: { select: { lembagaId: true } } },
        });
        if (tx) {
          record = {
            id: tx.id,
            unitId: tx.unitId,
            lembagaId: (tx as any).units?.lembagaId ?? null,
          };
        }
      } else {
        const sv = await prisma.savingsTransaction.findUnique({
          where: { id: recordId },
          select: { id: true, unitId: true },
        });
        if (sv) {
          const unit = await prisma.unit.findUnique({
            where: { id: sv.unitId },
            select: { lembagaId: true },
          });
          record = { id: sv.id, unitId: sv.unitId, lembagaId: unit?.lembagaId ?? null };
        }
      }
      if (!record) {
        return NextResponse.json(
          { error: `Record ${recordType} dengan id ${recordId} tidak ditemukan` },
          { status: 404 },
        );
      }
      // Validasi scope — konsisten dengan route baca /uploads/[...path].
      if (role === 'SUPERADMIN') {
        // Bypass.
      } else if (role === 'PIMPINAN') {
        if (!session.user.lembagaId || record.lembagaId !== session.user.lembagaId) {
          return NextResponse.json(
            { error: 'Record berada di luar lembaga sesi' },
            { status: 403 },
          );
        }
      } else if (role === 'MANAGER' || role === 'STAFF') {
        if (!session.user.unitId || record.unitId !== session.user.unitId) {
          return NextResponse.json(
            { error: 'Record berada di luar unit sesi' },
            { status: 403 },
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Role tidak berwenang menautkan bukti ke record' },
          { status: 403 },
        );
      }
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
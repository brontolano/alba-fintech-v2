/**
 * Penyimpanan gambar terpusat (server-only).
 *
 * Semua upload disimpan di `data/uploads/<folder>/` — di luar `public/` supaya
 * tidak ikut ditimpa saat auto-deploy dan tidak menembus build tracing.
 * Lokasi bisa diarahkan via env `UPLOAD_DIR`.
 *
 * URL publik yang dihasilkan tetap `/uploads/<folder>/<file>` dan disajikan
 * oleh route `app/uploads/[...path]`, sehingga referensi `/uploads/...` lama
 * di database tetap berfungsi. Folder `bukti` disajikan dengan autentikasi.
 *
 * Fungsi-fungsi di sini hanya boleh dipanggil dari server.
 */
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const STORAGE_ROOT =
  process.env.UPLOAD_DIR || join(process.cwd(), "data", "uploads");

export const ALLOWED_FOLDERS = new Set([
  "inventory",
  "profiles",
  "transactions",
  "bukti",
]);

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Cocok untuk nama file saja (tanpa path) — mencegah path traversal. */
const FILE_NAME_RE = /^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/;

export interface StoredImage {
  url: string;
  filename: string;
  folder: string;
}

/** Lokasi legasi: file yang pernah disimpan di bawah `public/uploads`. */
function legacyDir(folder: string): string {
  return join(process.cwd(), "public", "uploads", folder);
}

function resolveSafe(folder: string, filename: string): string | null {
  if (!ALLOWED_FOLDERS.has(folder)) return null;
  if (!FILE_NAME_RE.test(filename)) return null;
  return join(STORAGE_ROOT, folder, filename);
}

/** Simpan gambar ke penyimpanan terpusat; melempar error dengan pesan user-facing. */
export async function saveImage(opts: {
  bytes: Uint8Array;
  mimeType: string;
  folder: string;
}): Promise<StoredImage> {
  if (!ALLOWED_FOLDERS.has(opts.folder))
    throw new Error(`Folder upload tidak dikenali: ${opts.folder}`);
  const ext = EXT_BY_MIME[opts.mimeType];
  if (!ext)
    throw new Error(
      "Tipe file tidak didukung. Hanya JPEG, PNG, dan WebP yang diizinkan.",
    );
  if (opts.bytes.byteLength > MAX_IMAGE_SIZE)
    throw new Error("Ukuran file terlalu besar. Maksimal 5MB.");

  const filename = `${opts.folder}-${Date.now()}-${randomUUID()}.${ext}`;
  await mkdir(join(STORAGE_ROOT, opts.folder), { recursive: true });
  await writeFile(join(STORAGE_ROOT, opts.folder, filename), opts.bytes);

  return {
    url: `/uploads/${opts.folder}/${filename}`,
    filename,
    folder: opts.folder,
  };
}

/**
 * Hapus gambar tersimpan (root baru + lokasi legasi public/uploads).
 * URL eksternal/Drive diabaikan. Tidak melempar bila file tidak ada.
 */
export async function deleteStoredFile(url: string): Promise<void> {
  const m =
    /^\/uploads\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp))$/.exec(
      url,
    );
  if (!m) return;
  const [, folder, filename] = m;
  const path = resolveSafe(folder, filename);
  if (!path) return;
  for (const candidate of new Set([path, join(legacyDir(folder), filename)])) {
    try {
      await unlink(candidate);
    } catch {
      // file tidak ada — abaikan
    }
  }
}

/**
 * Baca file tersimpan untuk route serving. Coba `data/uploads/<folder>`
 * dulu, lalu `public/uploads/<folder>` (file sebelum konsolidasi).
 */
export async function resolveStoredFile(
  folder: string,
  filename: string,
): Promise<Uint8Array | null> {
  const path = resolveSafe(folder, filename);
  if (!path) return null;
  try {
    return await readFile(path);
  } catch {
    // lanjut ke lokasi legasi
  }
  try {
    return await readFile(join(legacyDir(folder), filename));
  } catch {
    return null;
  }
}
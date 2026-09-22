/**
 * Upload file ke Google Drive pemilik via Apps Script (server-only).
 *
 * Setup sekali (di akun Google pemilik):
 * 1. Buka project Apps Script yang sama dengan backup (Extensions > Apps Script).
 * 2. Tempel isi scripts/google-drive-upload.gs, sesuaikan ALBA_SECRET
 *    dengan GOOGLE_APPS_SCRIPT_SECRET di env.
 * 3. Deploy > Manage deployments > New version (URL exec tetap sama).
 * 4. Isi GOOGLE_DRIVE_ROOT_FOLDER_ID di env (atau pakai default di bawah).
 *
 * Jangan pernah panggil dari browser — secret hanya ada di server.
 */

const DEFAULT_ROOT_FOLDER_ID = "1TU-sagmevhdzy-dn7FlSs9uktnftJ3nj"; // folder Drive pemilik

interface DriveUploadResult {
  fileId: string;
  fileName: string;
  url: string;
}

export async function uploadToDrive(opts: {
  bytes: Buffer;
  filename: string;
  mimeType: string;
  folder: string;
}): Promise<DriveUploadResult> {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const scriptSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (!scriptUrl || !scriptSecret)
    throw new Error(
      "Google Drive belum dikonfigurasi (GOOGLE_APPS_SCRIPT_URL/SECRET kosong)",
    );

  const res = await fetch(scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: scriptSecret,
      action: "upload",
      rootFolderId:
        process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || DEFAULT_ROOT_FOLDER_ID,
      folder: opts.folder,
      filename: opts.filename,
      mimeType: opts.mimeType,
      base64: opts.bytes.toString("base64"),
    }),
    signal: AbortSignal.timeout(60000),
  });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    fileId?: string;
    fileName?: string;
    url?: string;
  } | null;
  if (!res.ok || !json?.ok || !json.url)
    throw new Error(json?.error || `Google Drive HTTP ${res.status}`);
  return {
    fileId: json.fileId || "",
    fileName: json.fileName || opts.filename,
    url: json.url,
  };
}

/**
 * ALBA — Google Drive upload via Apps Script
 * ============================================================
 * CARA PAKAI (sekali saja):
 * 1. Buka spreadsheet/script Apps Script yang dipakai untuk backup
 *    (yang URL exec-nya terpasang di GOOGLE_APPS_SCRIPT_URL).
 * 2. Tempel SELURUH isi file ini ke editor, ATAU gabungkan fungsi
 *    doPost + handleDriveUpload + helper ke file yang sudah ada.
 *    PENTING: jika doPost sudah ada (untuk backup), tambahkan baris
 *      if (p.action === "upload") return handleDriveUpload(p);
 *    di ATAS logika backup yang lama.
 * 3. Ganti NILAI ALBA_SECRET di bawah dengan nilai yang sama persis
 *    dengan GOOGLE_APPS_SCRIPT_SECRET di env aplikasi.
 *    (Alternatif: simpan di Project Settings > Script Properties
 *    dengan nama ALBA_SECRET, lalu hapus konstanta di bawah.)
 * 4. Deploy > Manage deployments > edit deployment aktif > Version:
 *    New version > Deploy. URL exec TIDAK berubah.
 *
 * Struktur folder otomatis:
 *   <ROOT> / Bukti Transaksi / item-xxx.jpg
 *   <ROOT> / Foto Profil / ...
 * File di-set "Anyone with link can view" agar bisa dibuka dari aplikasi.
 */

// GANTI dengan secret yang sama dengan env GOOGLE_APPS_SCRIPT_SECRET:
const ALBA_SECRET = "GANTI_DENGAN_SECRET_YANG_SAMA";

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.secret !== ALBA_SECRET)
      return jsonOut({ ok: false, error: "Unauthorized" });
    if (p.action === "upload") return handleDriveUpload(p);
    // --- logika backup lama tetap di bawah sini ---
    return jsonOut({ ok: false, error: "Unknown action" });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function handleDriveUpload(p) {
  const rootId = p.rootFolderId || "";
  if (!rootId) return jsonOut({ ok: false, error: "rootFolderId kosong" });
  const allowedFolders = ["Bukti Transaksi", "Foto Profil"];
  const folderName = allowedFolders.indexOf(p.folder) >= 0 ? p.folder : "Bukti Transaksi";
  const root = DriveApp.getFolderById(rootId);
  const sub = getOrCreateFolder(root, folderName);
  const blob = Utilities.newBlob(
    Utilities.base64Decode(p.base64),
    p.mimeType || "image/jpeg",
    p.filename || ("file-" + Date.now()),
  );
  const file = sub.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return jsonOut({
    ok: true,
    fileId: file.getId(),
    fileName: file.getName(),
    url: "https://drive.google.com/file/d/" + file.getId() + "/view",
  });
}

function getOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function jsonOut(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

const CONFIG = {
  driveFolderId: 'PASTE_GOOGLE_DRIVE_FOLDER_ID',
  spreadsheetId: 'PASTE_GOOGLE_SHEET_ID',
  sheetName: 'Backup Log',
  sharedSecret: 'PASTE_LONG_RANDOM_SHARED_SECRET'
};

function doPost(e) {
  const startedAt = new Date();
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    if (payload.secret !== CONFIG.sharedSecret) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }
    if (!payload.fileName || !payload.contentBase64) {
      throw new Error('fileName dan contentBase64 wajib diisi');
    }

    const bytes = Utilities.base64Decode(payload.contentBase64);
    const blob = Utilities.newBlob(bytes, 'application/json', payload.fileName);
    const folder = DriveApp.getFolderById(CONFIG.driveFolderId);
    const file = folder.createFile(blob);
    const sheet = getLogSheet();
    sheet.appendRow([
      startedAt,
      payload.fileName,
      bytes.length,
      'SUCCESS',
      file.getId(),
      file.getUrl(),
      payload.source || 'alba-fintech',
      ''
    ]);

    return jsonResponse({ ok: true, fileId: file.getId(), fileUrl: file.getUrl() });
  } catch (error) {
    try {
      getLogSheet().appendRow([
        startedAt,
        e?.postData ? 'request' : '',
        0,
        'FAILED',
        '',
        '',
        'alba-fintech',
        String(error)
      ]);
    } catch (_) {
      // Keep the original error response if Sheet logging is unavailable.
    }
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function getLogSheet() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'File Name', 'Bytes', 'Status', 'Drive File ID', 'Drive URL', 'Source', 'Error']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

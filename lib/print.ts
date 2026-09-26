/**
 * Utilitas cetak bersama (modul cetak).
 *
 * Aturan: FITUR CETAK SELALU MENCETAK DATA YANG DIPILIH,
 * TIDAK PERNAH mencetak halaman interface.
 *
 * Setiap fitur cetak membuka window dedikasi berisi dokumen
 * data-only, lalu window itu yang di-print (atau disimpan
 * sebagai PDF dari dialog browser — output sama).
 */

export interface PrintWindowOptions {
  /** CSS @page size, default "A4". Struk thermal: "80mm auto". */
  pageSize?: string;
  /** CSS @page margin, default "12mm". Struk: "2mm". */
  margin?: string;
  /** Font monospace utk struk thermal, default false (dokumen raport). */
  monospace?: boolean;
  /** Judul tab window & <title>. */
  title?: string;
}

export const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "").replace(
    /[&<>"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );

const renderDoc = (
  title: string,
  bodyHtml: string,
  opts: PrintWindowOptions,
) => {
  const {
    pageSize = "A4",
    margin = "12mm",
    monospace = false,
  } = opts;
  const font = monospace
    ? "Consolas, Menlo, 'Courier New', monospace"
    : "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @media print {
      @page { size: ${pageSize}; margin: ${margin}; }
      body { margin: 0; }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ${font};
      font-size: 12px;
      color: #000;
    }
    .site-header { border-bottom: 3px double #0f766e; padding-bottom: 6px; margin-bottom: 14px; }
    h1 { margin: 0; font-size: 18px; }
    h2 { font-size: 14px; margin: 16px 0 6px; }
    .sub { color: #555; font-size: 11px; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #aaa; padding: 4px 6px; font-size: 11px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; }
    .num { text-align: right; white-space: nowrap; }
    .total td { font-weight: bold; background: #f8fafc; }
    td.label { font-weight: 600; width: 140px; background: #f8fafc; }
    .sign { display: flex; gap: 48px; margin-top: 56px; }
    .sign > div { flex: 1; text-align: center; }
    .sign p { margin: 0; font-size: 11px; }
    .space { height: 48px; }
    .footer { margin-top: 18px; border-top: 1px solid #ddd; padding-top: 6px; font-size: 9px; color: #777; text-align: center; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
};

/**
 * Buka window dedikasi berisi DOKUMEN DATA-ONLY (bukan halaman app),
 * lalu print. Mengembalikan null jika popup diblokir browser.
 */
export const printData = (
  title: string,
  bodyHtml: string,
  opts: PrintWindowOptions = {},
): void => {
  const w = typeof window === "undefined" ? null : window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(renderDoc(title, bodyHtml, opts));
  w.document.close();
  w.focus();
  // Tunggu browser menata layout sebelum print (khusus dokumen besar).
  setTimeout(() => w.print(), 150);
};
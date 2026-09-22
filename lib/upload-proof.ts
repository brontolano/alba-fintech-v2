/** Upload foto bukti transaksi (maks 5MB, JPG/PNG/WebP).
 *  Kembali URL + info penyimpanan (drive / lokal fallback). */
export async function uploadProof(file: File): Promise<{
  url: string;
  storage?: string;
  warning?: string;
}> {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Foto terlalu besar — maksimal 5MB");
  if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type))
    throw new Error("Format foto harus JPG, PNG, atau WebP");
  const fd = new FormData();
  fd.set("image", file);
  const res = await fetch("/api/upload?folder=bukti", {
    method: "POST",
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Upload bukti gagal");
  return { url: json.url as string, storage: json.storage, warning: json.warning };
}

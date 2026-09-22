/** Upload foto bukti transaksi (maks 5MB, JPG/PNG/WebP). */
export async function uploadProof(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("image", file);
  const res = await fetch("/api/upload?folder=bukti", {
    method: "POST",
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Upload bukti gagal");
  return json.url as string;
}

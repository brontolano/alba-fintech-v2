import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile } from "fs/promises";
import { join } from "path";
import { authOptions } from "@/app/api/auth/options";
import { resolveStoredFile } from "@/lib/storage";

const ALLOWED = /^[A-Za-z0-9_-]+\.(jpg|png|webp)$/;
const CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Sajikan file bukti transaksi (butuh login). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename } = await params;
  if (!ALLOWED.test(filename))
    return NextResponse.json({ error: "File tidak valid" }, { status: 400 });

  // Baca dari penyimpanan terpusat; fallback ke lokasi legasi data/bukti
  let data: Uint8Array | null = await resolveStoredFile("bukti", filename);
  if (!data) {
    try {
      data = new Uint8Array(
        await readFile(join(process.cwd(), "data", "bukti", filename)),
      );
    } catch {
      data = null;
    }
  }
  if (!data)
    return NextResponse.json({ error: "Bukti tidak ditemukan" }, { status: 404 });

  const ext = filename.split(".").pop() || "jpg";
  return new NextResponse(new Blob([data.slice()]), {
    headers: {
      "Content-Type": CONTENT_TYPE[ext] || "image/jpeg",
      "Content-Length": String(data.byteLength),
      "Cache-Control": "private, max-age=86400",
    },
  });
}

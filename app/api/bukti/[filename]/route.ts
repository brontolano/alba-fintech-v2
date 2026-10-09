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

  // Satu pintu otorisasi: route baru memeriksa relasi file ke transaksi,
  // unit, dan lembaga sebelum file dikirim.
  return NextResponse.redirect(new URL(`/uploads/bukti/${filename}`, _request.url));


}

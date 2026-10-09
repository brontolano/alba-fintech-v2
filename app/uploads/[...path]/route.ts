import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import {
  ALLOWED_FOLDERS,
  CONTENT_TYPE,
  resolveStoredFile,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Sajikan file upload tersimpan (`data/uploads/<folder>/<file>` dengan
 * fallback ke lokasi legasi `public/uploads`). URL sama seperti sebelumnya,
 * jadi referensi `/uploads/...` di database tetap berfungsi.
 *
 * Folder `bukti` dilindungi login (bukti transaksi); folder lain publik
 * seperti aset statik.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const [folder, filename, ...rest] = path ?? [];
  if (rest.length > 0 || !folder || !filename) {
    return NextResponse.json({ error: "File tidak valid" }, { status: 400 });
  }
  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "File tidak valid" }, { status: 400 });
  }

  if (folder === "bukti") {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = `/uploads/${folder}/${filename}`;
    const [transaction, savingsTransaction] = await Promise.all([
      prisma.transaction.findFirst({
        where: { photoUrl: url },
        select: { unitId: true, units: { select: { lembagaId: true } } },
      }),
      prisma.savingsTransaction.findFirst({
        where: { photoUrl: url },
        select: { unitId: true, account: { select: { student: { select: { lembagaId: true } } } } },
      }),
    ]);

    // File bukti lokal harus masih terhubung ke record bisnis. File legacy
    // tanpa referensi tidak dibuka melalui route baru.
    if (!transaction && !savingsTransaction) {
      return NextResponse.json({ error: "Bukti tidak terkait transaksi" }, { status: 404 });
    }

    const role = session.user.role;
    const unitId = transaction?.unitId ?? savingsTransaction?.unitId;
    const lembagaId = transaction?.units.lembagaId ?? savingsTransaction?.account.student.lembagaId;
    const allowed =
      role === "SUPERADMIN" ||
      (role === "PIMPINAN" && !!session.user.lembagaId && session.user.lembagaId === lembagaId) ||
      ((role === "MANAGER" || role === "STAFF") && !!session.user.unitId && session.user.unitId === unitId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await resolveStoredFile(folder, filename);
  if (!data) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  const ext = filename.split(".").pop() || "jpg";
  const isPrivate = folder === "bukti";
  return new NextResponse(new Blob([data.slice()]), {
    headers: {
      "Content-Type": CONTENT_TYPE[ext] || "image/jpeg",
      "Content-Length": String(data.byteLength),
      "Cache-Control": isPrivate
        ? "private, max-age=300"
        : "public, max-age=86400",
    },
  });
}
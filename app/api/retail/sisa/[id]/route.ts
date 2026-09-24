import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

const params = (request: NextRequest) => request.nextUrl.pathname.split("/");

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().max(1000).optional().nullable(),
});

/**
 * PATCH /api/retail/sisa/[id] — MANAGER setujui/tolak hitungan sisa.
 * Approve = selaraskan stok ke hasil hitung (atomik) + status APPROVED.
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!guardRetail(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json(
      { error: "Persetujuan sisa hanya boleh dilakukan Manager unit" },
      { status: 403 },
    );
  }

  const id = params(request).pop();
  const unitId = await resolveUnitId(session, null);
  if (!id || !unitId) {
    return NextResponse.json({ error: "Hitungan tidak ditemukan" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Data tidak valid" },
      { status: 400 },
    );
  }

  const row = await prisma.stockCount.findFirst({ where: { id, unitId } });
  if (!row) {
    return NextResponse.json({ error: "Hitungan tidak ditemukan" }, { status: 404 });
  }
  if (row.status !== "DRAFT") {
    return NextResponse.json(
      { error: `Hitungan sudah ${row.status}` },
      { status: 409 },
    );
  }

  const note = parsed.data.reviewNote?.trim() || null;
  if (parsed.data.action === "reject") {
    if (!note) {
      return NextResponse.json(
        { error: "Alasan penolakan wajib diisi" },
        { status: 400 },
      );
    }
    const updated = await prisma.stockCount.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById: session.user.id!,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });
    return NextResponse.json({ data: { id: updated.id, status: updated.status } });
  }

  // approve — selaraskan stok ke hasil hitung fisik.
  const lines = (row.payload ?? []) as {
    inventoryItemId: string;
    counted: number;
  }[];
  try {
    await prisma.$transaction(
      lines.map((l) =>
        prisma.inventoryItem.updateMany({
          where: { id: l.inventoryItemId, unitId },
          data: { currentStock: l.counted },
        }),
      ),
    );
    const updated = await prisma.stockCount.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedById: session.user.id!,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });
    return NextResponse.json({
      data: {
        id: updated.id,
        status: updated.status,
        totalSold: updated.totalSold,
        totalHak: Number(updated.totalHak),
      },
    });
  } catch (error) {
    console.error("[retail/sisa/[id]] error:", error);
    return NextResponse.json(
      { error: "Gagal menyetujui hitungan" },
      { status: 500 },
    );
  }
}

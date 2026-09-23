import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

const itemPatchSchema = z.object({
  ownerId: z.string().min(1).optional(),
  name: z.string().min(1).max(200).optional(),
  category: z.string().max(100).optional().nullable(),
  costPrice: z.number().min(0).optional(),
  marginType: z.enum(["PERCENT", "FIXED"]).optional(),
  marginValue: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

function computeAgreed(cost: number, type: "PERCENT" | "FIXED", value: number) {
  if (type === "FIXED") return Math.round((cost + value) * 100) / 100;
  return Math.round((cost * (1 + value / 100)) * 100) / 100;
}

const WIB = 7 * 3600 * 1000;
const wibDateStr = () =>
  new Date(Date.now() + WIB).toISOString().slice(0, 10);

/** PATCH /api/retail/consignments/items/[id] — perbaiki margin/harga barang titipan */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = request.nextUrl.pathname.split("/").pop();
  const unitId = await resolveUnitId(session, null);
  if (!id || !unitId)
    return NextResponse.json({ error: "Barang titipan tidak ditemukan" }, { status: 404 });

  const existing = await prisma.consignmentItem.findFirst({
    where: { id, unitId },
  });
  if (!existing)
    return NextResponse.json({ error: "Barang titipan tidak ditemukan" }, { status: 404 });

  const parsed = itemPatchSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Data tidak valid" },
      { status: 400 },
    );

  const costPrice = parsed.data.costPrice ?? Number(existing.costPrice);
  const marginType = parsed.data.marginType ?? existing.marginType;
  const marginValue = parsed.data.marginValue ?? Number(existing.marginValue);
  const agreedPrice = computeAgreed(costPrice, marginType, marginValue);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.consignmentItem.update({
        where: { id },
        data: {
          ownerId: parsed.data.ownerId,
          costPrice,
          marginType,
          marginValue,
          agreedPrice,
          isActive: parsed.data.isActive,
        },
      });
      await tx.inventoryItem.update({
        where: { id: existing.inventoryItemId },
        data: {
          name: parsed.data.name,
          category: parsed.data.category,
          unitPrice: agreedPrice,
          purchasePrice: costPrice,
        },
      });
    });
    return NextResponse.json({ data: { id, agreedPrice } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui barang titipan" },
      { status: 500 },
    );
  }
}

/** DELETE /api/retail/consignments/items/[id] — keluarkan dari konsinyasi (nonaktifkan). */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = request.nextUrl.pathname.split("/").pop();
  const unitId = await resolveUnitId(session, null);
  if (!id || !unitId)
    return NextResponse.json({ error: "Barang titipan tidak ditemukan" }, { status: 404 });

  const existing = await prisma.consignmentItem.findFirst({
    where: { id, unitId },
  });
  if (!existing)
    return NextResponse.json({ error: "Barang titipan tidak ditemukan" }, { status: 404 });

  // Nonaktifkan saja (riwayat penjualan tetap utuh), stok tidak dihapus.
  await prisma.consignmentItem.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ data: { deleted: true } }, { status: 202 });
}
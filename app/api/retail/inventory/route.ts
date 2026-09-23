import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

const stockInSchema = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().min(1, "Jumlah harus lebih dari 0"),
  unitPrice: z.number().min(0).optional(),
  purchasePrice: z.number().min(0).optional(),
});

const stocktakeSchema = z.object({
  items: z
    .array(z.object({ id: z.string().min(1), count: z.number().int().min(0) }))
    .min(1, "Tidak ada barang untuk distocktake"),
});

/**
 * POST /api/retail/inventory?action=stock-in|stocktake
 * Kawasan LAYANI/PENERIMAAN: staf retail menambah stok / menyesuaikan stok riil.
 * Tidak menyentuh app/api/inventory (beku) — route ini kawasan staf retail.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const unitId = await resolveUnitId(session, null);
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  if (action === "stock-in") {
    const parsed = stockInSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 },
      );
    const item = await prisma.inventoryItem.findFirst({
      where: { id: parsed.data.itemId, unitId },
    });
    if (!item)
      return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        currentStock: (item.currentStock ?? 0) + parsed.data.qty,
        unitPrice: parsed.data.unitPrice ?? item.unitPrice,
        purchasePrice: parsed.data.purchasePrice ?? item.purchasePrice,
      },
    });
    return NextResponse.json({ data: { id: updated.id, currentStock: updated.currentStock } });
  }

  if (action === "stocktake") {
    const parsed = stocktakeSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 },
      );
    const ids = parsed.data.items.map(i => i.id);
    const owned = await prisma.inventoryItem.count({
      where: { id: { in: ids }, unitId },
    });
    if (owned !== ids.length)
      return NextResponse.json(
        { error: "Ada barang di luar unit ini" },
        { status: 400 },
      );
    // Terapkan stok riil hasil hitungan.
    await prisma.$transaction(
      parsed.data.items.map((i) =>
        prisma.inventoryItem.update({
          where: { id: i.id },
          data: { currentStock: i.count },
        }),
      ),
    );
    return NextResponse.json({
      data: { updated: parsed.data.items.length, note: "Stocktake diterapkan" },
    });
  }

  return NextResponse.json(
    { error: "action tidak dikenal (stock-in|stocktake)" },
    { status: 400 },
  );
}
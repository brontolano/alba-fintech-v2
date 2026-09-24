import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

const itemSchema = z.object({
  ownerId: z.string().min(1),
  unitId: z.string().min(1).optional(),
  inventoryItemId: z.string().optional(),
  name: z.string().min(1, "Nama barang wajib diisi").max(200),
  sku: z.string().min(1).max(50),
  category: z.string().max(100).optional().nullable(),
  costPrice: z.number().min(0, "Harga modal tidak boleh negatif"),
  marginType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  marginValue: z.number().min(0).default(0),
  startingStock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
});

function computeAgreed(cost: number, type: "PERCENT" | "FIXED", value: number) {
  if (type === "FIXED") return Math.round((cost + value) * 100) / 100;
  return Math.round((cost * (1 + value / 100)) * 100) / 100;
}

function genSku(base: string, unitCode: string, suffix: string) {
  const clean = base.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 14) || "BRG";
  const u = (unitCode || "RT").toUpperCase();
  const tail = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${clean}-${u}-${tail}-${suffix}`.slice(0, 48);
}

/** GET /api/retail/consignments/items — daftar item titipan + info inventori. */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const unitId = await resolveUnitId(session, searchParams.get("unitId"));
  const ownerId = searchParams.get("ownerId") || undefined;
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const items = await prisma.consignmentItem.findMany({
    where: { unitId, ownerId, isActive: true },
    include: {
      owners: { select: { id: true, name: true } },
      inventoryItems: {
        select: { id: true, name: true, sku: true, currentStock: true, unitPrice: true, imageUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    data: items.map((i) => ({
      ...i,
      ownerName: i.owners.name,
      inventory: i.inventoryItems,
    })),
  });
}

/** POST /api/retail/consignments/items — terima barang titipan (buat InventoryItem + nilaui). */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = itemSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Data tidak valid" },
      { status: 400 },
    );

  const unitId = await resolveUnitId(session, parsed.data.unitId ?? null);
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const [unit, owner] = await Promise.all([
    prisma.unit.findFirst({ where: { id: unitId }, select: { code: true } }),
    prisma.consignmentOwner.findFirst({
      where: { id: parsed.data.ownerId, unitId },
    }),
  ]);
  if (!owner)
    return NextResponse.json({ error: "Pemilik tidak ditemukan" }, { status: 404 });

  const agreed = computeAgreed(
    parsed.data.costPrice,
    parsed.data.marginType,
    parsed.data.marginValue,
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      let invId = parsed.data.inventoryItemId;
      if (invId) {
        const existing = await tx.inventoryItem.findFirst({
          where: { id: invId, unitId },
        });
        if (!existing)
          throw new Error("Barang inventori tidak ditemukan di unit ini");
        await tx.inventoryItem.update({
          where: { id: invId },
          data: {
            name: parsed.data.name.trim(),
            unitPrice: agreed,
            purchasePrice: parsed.data.costPrice,
            currentStock:
              (existing.currentStock ?? 0) + parsed.data.startingStock,
            minStock: parsed.data.minStock,
            isActive: true,
          },
        });
      } else {
        const created = await tx.inventoryItem.create({
          data: {
            unitId,
            name: parsed.data.name.trim(),
            sku: genSku(parsed.data.sku, unit?.code || "", "C"),
            category: parsed.data.category?.trim() || null,
            currentStock: parsed.data.startingStock,
            minStock: parsed.data.minStock,
            unitPrice: agreed,
            purchasePrice: parsed.data.costPrice,
          },
        });
        invId = created.id;
      }
      const item = await tx.consignmentItem.upsert({
        where: { inventoryItemId: invId! },
        update: {
          ownerId: parsed.data.ownerId,
          costPrice: parsed.data.costPrice,
          marginType: parsed.data.marginType,
          marginValue: parsed.data.marginValue,
          agreedPrice: agreed,
          isActive: true,
        },
        create: {
          unitId,
          ownerId: parsed.data.ownerId,
          inventoryItemId: invId!,
          costPrice: parsed.data.costPrice,
          marginType: parsed.data.marginType,
          marginValue: parsed.data.marginValue,
          agreedPrice: agreed,
        },
      });
      return item;
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "sku sudah dipakai atau barang sudah diregistrasi" },
        { status: 409 },
      );
    return NextResponse.json(
      { error: error.message || "Gagal menerima barang titipan" },
      { status: 500 },
    );
  }
}
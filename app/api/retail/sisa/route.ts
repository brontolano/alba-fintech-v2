import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

const WIB = 7 * 3600 * 1000;
const wibDateStr = (now = Date.now()) =>
  new Date(now + WIB).toISOString().slice(0, 10);

const sisaSchema = z.object({
  ownerId: z.string().min(1).optional().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal format YYYY-MM-DD")
    .optional(),
  counts: z
    .array(
      z.object({
        inventoryItemId: z.string().min(1),
        counted: z.number().int().min(0, "Hasil hitung minimal 0"),
      }),
    )
    .min(1, "Minimal satu barang dihitung")
    .max(200),
});

/**
 * GET /api/retail/sisa?unitId=&ownerId=&date=
 * Daftar titipan aktif + stok tercatat + terjual hari ini + histori hitungan.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!guardRetail(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams;
  const unitId = await resolveUnitId(session, q.get("unitId"));
  if (!unitId) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });
  }
  const ownerId = q.get("ownerId") || undefined;
  const dateStr = q.get("date") || wibDateStr();

  const items = await prisma.consignmentItem.findMany({
    where: { unitId, ownerId, isActive: true, owners: { isActive: true } },
    include: {
      owners: { select: { id: true, name: true } },
      inventoryItems: {
        select: { id: true, name: true, currentStock: true, imageUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Terjual hari ini (INCOME APPROVED, via order_items).
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  const invIds = items.map((i) => i.inventoryItemId);
  const soldMap = new Map<string, number>();
  if (invIds.length > 0) {
    const txs = await prisma.transaction.findMany({
      where: {
        unitId,
        type: "INCOME",
        status: "APPROVED",
        date: { gte: start, lte: end },
        order_items: { some: { itemId: { in: invIds } } },
      },
      select: {
        order_items: { select: { itemId: true, quantity: true } },
      },
    });
    for (const tx of txs) {
      for (const oi of tx.order_items) {
        if (!oi.itemId) continue;
        soldMap.set(oi.itemId, (soldMap.get(oi.itemId) ?? 0) + (oi.quantity ?? 0));
      }
    }
  }

  const history = await prisma.stockCount.findMany({
    where: { unitId, ownerId, date: { gte: start, lte: end } },
    include: {
      creator: { select: { name: true } },
      owners: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    data: {
      date: dateStr,
      items: items.map((i) => ({
        inventoryItemId: i.inventoryItemId,
        name: i.inventoryItems.name,
        imageUrl: i.inventoryItems.imageUrl,
        ownerId: i.ownerId,
        ownerName: i.owners.name,
        tercatat: i.inventoryItems.currentStock ?? 0,
        soldToday: soldMap.get(i.inventoryItemId) ?? 0,
        costPrice: Number(i.costPrice),
        agreedPrice: Number(i.agreedPrice),
      })),
      history: history.map((h: any) => ({
        id: h.id,
        ownerName: h.owners?.name ?? "Semua UMKM",
        totalSold: h.totalSold,
        totalHak: Number(h.totalHak),
        status: h.status,
        by: h.creator?.name ?? "-",
        createdAt: h.createdAt,
      })),
    },
  });
}

/**
 * POST /api/retail/sisa — simpan hitungan sisa (STAFF/MANAGER).
 * terjual = max(0, tercatat − dihitung); hak = terjual × modal.
 * Status DRAFT — selisih disetujui manager via PATCH.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!guardRetail(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.user.role === "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const parsed = sisaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Data tidak valid" },
      { status: 400 },
    );
  }

  const unitId = await resolveUnitId(session, null);
  if (!unitId) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });
  }
  const ownerId = parsed.data.ownerId || null;
  if (ownerId) {
    const owner = await prisma.consignmentOwner.findFirst({
      where: { id: ownerId, unitId },
      select: { id: true },
    });
    if (!owner) {
      return NextResponse.json(
        { error: "Pemilik bukan milik unit ini" },
        { status: 400 },
      );
    }
  }

  const ids = parsed.data.counts.map((c) => c.inventoryItemId);
  const items = await prisma.consignmentItem.findMany({
    where: { unitId, inventoryItemId: { in: ids }, isActive: true },
    include: {
      owners: { select: { id: true, name: true } },
      inventoryItems: { select: { id: true, name: true, currentStock: true } },
    },
  });
  const byInv = new Map(items.map((i) => [i.inventoryItemId, i]));
  for (const c of parsed.data.counts) {
    const it = byInv.get(c.inventoryItemId);
    if (!it) {
      return NextResponse.json(
        { error: "Ada barang titipan di luar unit ini" },
        { status: 400 },
      );
    }
    if (ownerId && it.ownerId !== ownerId) {
      return NextResponse.json(
        { error: "Ada barang milik UMKM lain" },
        { status: 400 },
      );
    }
  }

  const dateStr = parsed.data.date || wibDateStr();
  const payload = parsed.data.counts.map((c) => {
    const it = byInv.get(c.inventoryItemId)!;
    const tercatat = it.inventoryItems.currentStock ?? 0;
    const terjual = Math.max(0, tercatat - c.counted);
    const surplus = Math.max(0, c.counted - tercatat);
    const cost = Number(it.costPrice);
    return {
      inventoryItemId: c.inventoryItemId,
      name: it.inventoryItems.name,
      ownerId: it.ownerId,
      ownerName: it.owners.name,
      tercatat,
      counted: c.counted,
      terjual,
      surplus,
      costPrice: cost,
      hak: Math.round(terjual * cost * 100) / 100,
    };
  });
  const totalSold = payload.reduce((s, p) => s + p.terjual, 0);
  const totalHak = Math.round(payload.reduce((s, p) => s + p.hak, 0) * 100) / 100;

  const row = await prisma.stockCount.create({
    data: {
      unitId,
      ownerId,
      date: new Date(`${dateStr}T00:00:00.000Z`),
      payload: payload as any,
      totalSold,
      totalHak,
      status: "DRAFT",
      createdById: session.user.id!,
    },
  });

  return NextResponse.json(
    {
      data: {
        id: row.id,
        date: dateStr,
        lines: payload,
        totalSold,
        totalHak,
        status: row.status,
      },
    },
    { status: 201 },
  );
}

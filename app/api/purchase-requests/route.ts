import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

/**
 * Pengajuan Belanja Stok Unit Retail — modul baru (pengganti reorder lama).
 *
 * Alur: REQUESTED -> ORDERED -> RECEIVED -> PAID (boleh REJECTED).
 * Pengajuan HANYA pemberitahuan ke Pimpinan (bukan transaksi). Transaksi
 * keuangan dibuat saat Pimpinan membayar supplier sesuai invoice (langkah akhir).
 *
 * Lihat docs/DESAIN-BELANJA-STOK.md.
 */

const createSchema = z.object({
  unitId: z.string().optional(),
  title: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        qty: z.number().int().positive(),
        estUnitCost: z.number().nonnegative().optional(),
      }),
    )
    .default([]),
  newItems: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(200),
        qty: z.number().int().positive(),
        estUnitCost: z.number().nonnegative().default(0),
      }),
    )
    .default([]),
});

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const listInclude = {
  units: { select: { id: true, name: true, code: true } },
  creator: { select: { id: true, name: true } },
  orderer: { select: { id: true, name: true } },
  receiver: { select: { id: true, name: true } },
  payer: { select: { id: true, name: true } },
  items: { orderBy: { name: "asc" as const } },
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !guardRetail(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const q = request.nextUrl.searchParams;
  const requestedUnit = q.get("unitId");
  const limit = Math.min(Number(q.get("limit") ?? 50), 200);
  const status = q.get("status") || undefined;

  const where: any = { status };
  if (role === "MANAGER" || role === "STAFF") {
    where.unitId = session.user.unitId;
  } else if (role === "PIMPINAN") {
    if (requestedUnit) {
      where.unitId = requestedUnit;
    } else {
      where.units = { lembagaId: session.user.lembagaId };
    }
  } else if (requestedUnit) {
    where.unitId = requestedUnit;
  }

  const rows = await prisma.purchaseRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: listInclude,
  });

  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      estimatedTotal: Number(r.estimatedTotal),
      finalTotal: r.finalTotal === null ? null : Number(r.finalTotal),
      items: r.items.map((i) => ({
        ...i,
        estUnitCost: Number(i.estUnitCost),
        unitCost: i.unitCost === null ? null : Number(i.unitCost),
      })),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !guardRetail(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal", details: parsed.error.errors },
      { status: 400 },
    );
  }

  const unitId = await resolveUnitId(session, parsed.data.unitId);
  if (!unitId) {
    return NextResponse.json({ error: "Unit wajib dipilih" }, { status: 400 });
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, name: true, isRetail: true, lembagaId: true },
  });
  if (!unit) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 });
  }
  if (unit.isRetail !== true) {
    return NextResponse.json(
      { error: "Pengajuan belanja hanya untuk unit retail" },
      { status: 400 },
    );
  }
  if (session.user.role === "PIMPINAN" && unit.lembagaId !== session.user.lembagaId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = parsed.data.items;
  const newItems = parsed.data.newItems;
  if (items.length === 0 && newItems.length === 0) {
    return NextResponse.json({ error: "Minimal ada satu item atau barang baru" }, { status: 400 });
  }

  const invs = await prisma.inventoryItem.findMany({
    where: { id: { in: items.map((i) => i.itemId) }, unitId, isActive: true },
    select: {
      id: true,
      name: true,
      purchasePrice: true,
      unitPrice: true,
      currentStock: true,
      minStock: true,
    },
  });
  if (invs.length !== items.length) {
    return NextResponse.json(
      { error: "Ada item yang tidak ditemukan / nonaktif di unit ini" },
      { status: 400 },
    );
  }

  const rows: {
    name: string;
    qtyRequested: number;
    estUnitCost: number;
    isNewItem: boolean;
    itemId?: string | null;
    subTotal: number;
  }[] = [];
  let total = 0;

  for (const line of items) {
    const inv = invs.find((i) => i.id === line.itemId)!;
    const est =
      line.estUnitCost !== undefined
        ? line.estUnitCost
        : Number(inv.purchasePrice ?? inv.unitPrice ?? 0);
    const subTotal = est * line.qty;
    total += subTotal;
    rows.push({
      name: inv.name,
      qtyRequested: line.qty,
      estUnitCost: est,
      isNewItem: false,
      itemId: inv.id,
      subTotal,
    });
  }
  for (const line of newItems) {
    const subTotal = line.estUnitCost * line.qty;
    total += subTotal;
    rows.push({
      name: line.name,
      qtyRequested: line.qty,
      estUnitCost: line.estUnitCost,
      isNewItem: true,
      itemId: null,
      subTotal,
    });
  }

  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const countToday = await prisma.purchaseRequest.count({
    where: { createdAt: { gte: dayStart } },
  });
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  const requestNo = `BEL-${ymd}-${String(countToday + 1).padStart(3, "0")}`;

  const estSummary = rows
    .map((r) => (r.isNewItem ? `[BARU] ${r.name} x${r.qtyRequested} @ ${fmt(r.estUnitCost)}` : `${r.name} x${r.qtyRequested} @ ${fmt(r.estUnitCost)}`))
    .join("\n");
  const message = `Barang:\n${estSummary}\nTotal estimasi: ${fmt(total)}${parsed.data.note?.trim() ? `\nCatatan: ${parsed.data.note.trim()}` : ""}`;
  const title = parsed.data.title?.trim() || `Pengajuan Belanja ${unit.name}`;

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.purchaseRequest.create({
      data: {
        unitId,
        requestNo,
        title,
        note: parsed.data.note?.trim() || null,
        status: "REQUESTED",
        estimatedTotal: total,
        createdById: session.user.id!,
        items: {
          create: rows.map((r) => ({
            itemId: r.itemId,
            name: r.name,
            qtyRequested: r.qtyRequested,
            estUnitCost: r.estUnitCost,
            isNewItem: r.isNewItem,
          })),
        },
      },
      select: { id: true, requestNo: true, status: true, title: true },
    });
    return created;
  });

  if (unit.lembagaId) {
    const pimpinans = await prisma.user.findMany({
      where: { role: "PIMPINAN", lembagaId: unit.lembagaId, isActive: true },
      select: { id: true },
    });
    for (const p of pimpinans) {
      await prisma.notification.create({
        data: {
          userId: p.id,
          type: "INFO",
          title: `Pengajuan Belanja: ${title}`,
          message,
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    data: {
      id: result.id,
      requestNo: result.requestNo,
      status: result.status,
      estimatedTotal: total,
    },
  });
}
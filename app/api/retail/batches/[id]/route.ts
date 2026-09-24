import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

const params = (request: NextRequest) => request.nextUrl.pathname.split("/");

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  // Harga final per baris (penyesuaian manager). Default = unitCost baris.
  lines: z
    .array(
      z.object({
        id: z.string().min(1),
        finalUnitCost: z.number().min(0),
      }),
    )
    .optional(),
  reviewNote: z.string().max(1000).optional().nullable(),
});

function computeAgreed(cost: number, type: string, value: number) {
  if (type === "FIXED") return Math.round((cost + value) * 100) / 100;
  return Math.round((cost * (1 + value / 100)) * 100) / 100;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** GET /api/retail/batches/[id] — detail batch + baris + histori review. */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!guardRetail(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = params(request).pop();
  const unitId = await resolveUnitId(session, request.nextUrl.searchParams.get("unitId"));
  if (!id || !unitId) {
    return NextResponse.json({ error: "Batch tidak ditemukan" }, { status: 404 });
  }

  const batch = await prisma.stockBatch.findFirst({
    where: { id, unitId },
    include: {
      creator: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
      items: {
        include: {
          inventory_items: {
            select: { id: true, name: true, sku: true, currentStock: true },
          },
          owners: { select: { id: true, name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!batch) {
    return NextResponse.json({ error: "Batch tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      ...batch,
      totalCost: Number(batch.totalCost),
      by: batch.creator?.name ?? "-",
      reviewedBy: batch.reviewer?.name ?? null,
      items: batch.items.map((l) => ({
        ...l,
        unitCost: Number(l.unitCost),
        finalUnitCost: l.finalUnitCost == null ? null : Number(l.finalUnitCost),
        lineTotal: Number(l.lineTotal),
        marginValue: l.marginValue == null ? null : Number(l.marginValue),
        itemName: l.inventory_items.name,
        itemSku: l.inventory_items.sku,
        currentStock: l.inventory_items.currentStock,
        ownerName: l.owners?.name ?? null,
      })),
    },
  });
}

/**
 * PATCH /api/retail/batches/[id] — review MANAGER unit.
 * approve: terapkan stok + konsinyasi secara atomik memakai finalUnitCost.
 * reject: batalkan draf (stok tak berubah), wajib reviewNote.
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
      { error: "Review batch hanya boleh dilakukan Manager unit" },
      { status: 403 },
    );
  }

  const id = params(request).pop();
  const unitId = await resolveUnitId(session, null);
  if (!id || !unitId) {
    return NextResponse.json({ error: "Batch tidak ditemukan" }, { status: 404 });
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

  const batch = await prisma.stockBatch.findFirst({
    where: { id, unitId },
    include: { items: true },
  });
  if (!batch) {
    return NextResponse.json({ error: "Batch tidak ditemukan" }, { status: 404 });
  }
  if (batch.status !== "DRAFT") {
    return NextResponse.json(
      { error: `Batch sudah ${batch.status}, tidak bisa direview ulang` },
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
    const row = await prisma.stockBatch.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById: session.user.id!,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });
    return NextResponse.json({ data: { id: row.id, status: row.status } });
  }

  // approve — terapkan efek stok atomik.
  const finals = new Map(
    (parsed.data.lines ?? []).map((l) => [l.id, l.finalUnitCost]),
  );
  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalQty = 0;
      let totalCost = 0;
      for (const l of batch.items) {
        const final = finals.has(l.id) ? finals.get(l.id)! : Number(l.unitCost);
        if (final < 0) throw new Error("HARGA_NEGATIF");
        const lineTotal = round2(l.qty * final);

        const inv = await tx.inventoryItem.findFirst({
          where: { id: l.inventoryItemId, unitId },
        });
        if (!inv) throw new Error("BARANG_HILANG");
        await tx.inventoryItem.update({
          where: { id: inv.id },
          data: {
            currentStock: (inv.currentStock ?? 0) + l.qty,
            purchasePrice: final,
            isActive: true,
          },
        });

        if (l.ownerId) {
          const agreed = computeAgreed(
            final,
            l.marginType || "PERCENT",
            Number(l.marginValue ?? 0),
          );
          await tx.consignmentItem.upsert({
            where: { inventoryItemId: l.inventoryItemId },
            update: {
              ownerId: l.ownerId,
              costPrice: final,
              marginType: (l.marginType as any) || "PERCENT",
              marginValue: l.marginValue ?? 0,
              agreedPrice: agreed,
              isActive: true,
            },
            create: {
              unitId,
              ownerId: l.ownerId,
              inventoryItemId: l.inventoryItemId,
              costPrice: final,
              marginType: (l.marginType as any) || "PERCENT",
              marginValue: l.marginValue ?? 0,
              agreedPrice: agreed,
            },
          });
          await tx.inventoryItem.update({
            where: { id: l.inventoryItemId },
            data: { unitPrice: agreed },
          });
        }

        await tx.stockBatchItem.update({
          where: { id: l.id },
          data: { finalUnitCost: final, lineTotal },
        });
        totalQty += l.qty;
        totalCost = round2(totalCost + lineTotal);
      }
      return tx.stockBatch.update({
        where: { id },
        data: {
          status: "APPROVED",
          totalQty,
          totalCost,
          reviewedById: session.user.id!,
          reviewedAt: new Date(),
          reviewNote: note,
        },
      });
    });
    return NextResponse.json({
      data: {
        id: result.id,
        batchNo: result.batchNo,
        status: result.status,
        totalQty: result.totalQty,
        totalCost: Number(result.totalCost),
      },
    });
  } catch (error: any) {
    const msg = String(error?.message ?? "");
    if (msg === "BARANG_HILANG") {
      return NextResponse.json(
        { error: "Ada barang batch yang sudah dihapus" },
        { status: 400 },
      );
    }
    if (msg === "HARGA_NEGATIF") {
      return NextResponse.json(
        { error: "Harga final tidak boleh negatif" },
        { status: 400 },
      );
    }
    console.error("[retail/batches/[id]] error:", error);
    return NextResponse.json(
      { error: "Gagal menyetujui batch" },
      { status: 500 },
    );
  }
}

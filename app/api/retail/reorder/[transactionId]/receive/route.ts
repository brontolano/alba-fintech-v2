import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail } from "@/lib/retail-guard";

/**
 * POST /api/retail/reorder/[transactionId]/receive
 *
 * Terima barang pengajuan belanja yang sudah disetujui (APPROVED).
 * Body: { rows: [{ purchaseItemId, qty }] }
 *  - Barang existing : stok ditambah (currentStock += qty) & purchasePrice diperbarui.
 *  - Barang baru      : inventory item dibuat sekali (itemId diisi), stok = qty diterima.
 *  - fulfilled diupdate; status baris -> PARTIAL / FULFILLED.
 */

const receiveSchema = z.object({
  rows: z
    .array(
      z.object({
        purchaseItemId: z.string().min(1),
        qty: z.number().int().positive(),
      }),
    )
    .min(1, "Minimal satu baris"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !guardRetail(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transactionId } = await params;
  const role = session.user.role;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const parsed = receiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal", details: parsed.error.errors },
      { status: 400 },
    );
  }

  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      units: { select: { lembagaId: true, name: true } },
      purchase_items: {
        select: {
          id: true,
          itemId: true,
          name: true,
          qty: true,
          fulfilled: true,
          estUnitCost: true,
          isNewItem: true,
          status: true,
          unitId: true,
        },
      },
    },
  });

  if (!tx || tx.type !== "EXPENSE" || tx.purchase_items.length === 0) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
  }
  if (tx.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Pengajuan belum disetujui (APPROVED)" },
      { status: 409 },
    );
  }

  // Scope: MANAGER/STAFF hanya unit sendiri; PIMPINAN lembaganya.
  if (role === "MANAGER" || role === "STAFF") {
    if (tx.unitId !== session.user.unitId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role === "PIMPINAN") {
    if (tx.units?.lembagaId !== session.user.lembagaId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Gabungkan duplikat baris yang sama & validasi qty tidak melebihi sisa.
  const merged = new Map<string, number>();
  for (const r of parsed.data.rows) {
    merged.set(r.purchaseItemId, (merged.get(r.purchaseItemId) ?? 0) + r.qty);
  }
  const receiveRows: {
    purchaseItemId: string;
    product: (typeof tx.purchase_items)[number];
    qty: number;
  }[] = [];
  for (const [purchaseItemId, qty] of merged) {
    const product = tx.purchase_items.find((p) => p.id === purchaseItemId);
    if (!product) {
      return NextResponse.json(
        { error: "Baris pengajuan tidak ditemukan" },
        { status: 404 },
      );
    }
    const remaining = product.qty - (product.fulfilled ?? 0);
    if (qty > remaining) {
      return NextResponse.json(
        {
          error: `Jumlah terima "${product.name}" (${qty}) melebihi sisa ${remaining}`,
        },
        { status: 409 },
      );
    }
    receiveRows.push({ purchaseItemId, product, qty });
  }

  const results = await prisma.$transaction(async (txPrisma) => {
    const out: {
      purchaseItemId: string;
      name: string;
      fulfilled: number;
      status: string;
      itemId: string | null;
    }[] = [];

    for (const row of receiveRows) {
      const p = row.product;
      const newFulfilled = (p.fulfilled ?? 0) + row.qty;
      const newStatus = newFulfilled >= p.qty ? "FULFILLED" : "PARTIAL";

      let targetItemId = p.itemId;

      if (p.isNewItem && !p.itemId) {
        // Buat inventory item baru sekali; baris berikutnya tinggal tambah stok.
        let sku = `NY-${p.id.slice(0, 8)}`;
        let counter = 1;
        while (
          await txPrisma.inventoryItem.findUnique({ where: { sku } })
        ) {
          sku = `NY-${p.id.slice(0, 8)}-${counter++}`;
        }
        const created = await txPrisma.inventoryItem.create({
          data: {
            unitId: p.unitId,
            name: p.name,
            sku,
            currentStock: row.qty,
            unitPrice: p.estUnitCost,
            purchasePrice: p.estUnitCost,
            isActive: true,
          },
          select: { id: true },
        });
        targetItemId = created.id;
      } else if (targetItemId) {
        // Tambah stok barang existing.
        await txPrisma.inventoryItem.update({
          where: { id: targetItemId },
          data: {
            currentStock: { increment: row.qty },
            ...(Number(p.estUnitCost) > 0
              ? { purchasePrice: p.estUnitCost }
              : {}),
          },
        });
      }

      await txPrisma.purchaseItem.update({
        where: { id: p.id },
        data: {
          fulfilled: newFulfilled,
          status: newStatus,
          ...(targetItemId ? { itemId: targetItemId } : {}),
        },
      });

      out.push({
        purchaseItemId: p.id,
        name: p.name,
        fulfilled: newFulfilled,
        status: newStatus,
        itemId: targetItemId,
      });
    }
    return out;
  });

  return NextResponse.json({ data: results, unit: tx.units?.name ?? null });
}
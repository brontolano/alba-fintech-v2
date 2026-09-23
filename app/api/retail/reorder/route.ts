import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";
import { resolveApprover, notifyPendingApproval } from "@/lib/approvalRouting";

/**
 * Pengajuan Belanja Stok (Reorder) — modul RETAIL.
 *
 * POST: membuat pengajuan belanja = transaksi EXPENSE (status PENDING bila
 *       ada approver, APPROVED untuk otoritas final) + baris `purchase_items`.
 * GET : riwayat pengajuan (dengan status approval).
 *
 * Lihat docs/DESAIN-RETAIL-STAFF.md.
 */

const reorderSchema = z.object({
  unitId: z.string().optional(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        qty: z.number().int().positive(),
        estUnitCost: z.number().nonnegative().optional(),
      }),
    )
    .optional()
    .default([]),
  newItems: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(200),
        qty: z.number().int().positive(),
        estUnitCost: z.number().nonnegative().default(0),
      }),
    )
    .optional()
    .default([]),
  note: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !guardRetail(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const q = request.nextUrl.searchParams;
  const requestedUnit = q.get("unitId");
  const limit = Math.min(Number(q.get("limit") ?? 50), 200);

  let unitId: string | null | undefined;
  if (role === "MANAGER" || role === "STAFF") {
    unitId = session.user.unitId;
  } else {
    unitId = requestedUnit || session.user.unitId;
  }

  const where: any = {
    type: "EXPENSE",
    purchase_items: { some: {} },
  };
  if (unitId) {
    where.unitId = unitId;
  } else if (role === "PIMPINAN") {
    where.units = { lembagaId: session.user.lembagaId };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      units: { select: { id: true, name: true, code: true } },
      approvals: { select: { id: true, status: true, comment: true, createdAt: true } },
      users_transactions_createdByIdTousers: { select: { id: true, name: true } },
      purchase_items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          qty: true,
          estUnitCost: true,
          isNewItem: true,
          fulfilled: true,
          status: true,
          itemId: true,
        },
      },
    },
  });

  return NextResponse.json({
    data: transactions.map((t) => ({
      id: t.id,
      unit: t.units,
      amount: Number(t.amount),
      status: t.status,
      description: t.description,
      reference: t.reference,
      createdAt: t.createdAt,
      createdBy: t.users_transactions_createdByIdTousers,
      approvals: t.approvals,
      items: t.purchase_items.map((p) => ({
        ...p,
        estUnitCost: Number(p.estUnitCost),
      })),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !guardRetail(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const parsed = reorderSchema.safeParse(body);
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
  if (role === "PIMPINAN" && unit.lembagaId !== session.user.lembagaId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = parsed.data.items;
  const newItems = parsed.data.newItems;
  if (items.length === 0 && newItems.length === 0) {
    return NextResponse.json(
      { error: "Minimal ada satu item atau barang baru" },
      { status: 400 },
    );
  }

  // Validasi item existing milik unit & aktif.
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
    qty: number;
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
      qty: line.qty,
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
      qty: line.qty,
      estUnitCost: line.estUnitCost,
      isNewItem: true,
      itemId: null,
      subTotal,
    });
  }

  // Otoritas approval mengikuti aturan yang sama seperti transaksi biasa.
  let approverId: string | null = null;
  if (role === "STAFF" || role === "MANAGER") {
    const settings = await prisma.unitSetting.findUnique({ where: { unitId } });
    if (settings?.requiresApproval !== false) {
      approverId = await resolveApprover(unitId, role);
    }
  }
  const status = approverId ? "PENDING" : "APPROVED";

  const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const descLines = [`Pengajuan Belanja Stok`, `Unit: ${unit.name}`];
  for (const r of rows) {
    descLines.push(
      `${r.isNewItem ? "[BARU] " : ""}${r.name} x${r.qty} @ ${fmt(r.estUnitCost)} = ${fmt(r.subTotal)}`,
    );
  }
  descLines.push(`Total: ${fmt(total)}`);
  if (parsed.data.note?.trim()) {
    descLines.push(`Catatan: ${parsed.data.note.trim()}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        unitId,
        type: "EXPENSE",
        amount: total,
        description: descLines.join("\n"),
        status,
        createdById: session.user.id!,
        purchase_items: {
          create: rows.map((r) => ({
            unitId,
            itemId: r.itemId,
            name: r.name,
            qty: r.qty,
            estUnitCost: r.estUnitCost,
            isNewItem: r.isNewItem,
          })),
        },
      },
      select: { id: true },
    });
    return created;
  });

  if (approverId) {
    await prisma.approval.create({
      data: {
        transactionId: result.id,
        unitId,
        approverId,
        status: "PENDING",
      },
    });
    await notifyPendingApproval({
      approverId,
      transactionId: result.id,
      description: `belanja stok ${unit.name}`,
      amount: total,
      creatorName: session.user.name || "User",
      unitName: unit.name,
    });
  }

  return NextResponse.json({
    data: {
      transactionId: result.id,
      status,
      requiresApproval: !!approverId,
      amount: total,
    },
  });
}
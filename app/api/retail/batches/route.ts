import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

// WIB (UTC+7) — konsisten dengan modul retail lain.
const WIB = 7 * 3600 * 1000;
const wibDateStr = (now = Date.now()) =>
  new Date(now + WIB).toISOString().slice(0, 10);

const lineSchema = z.object({
  inventoryItemId: z.string().min(1).optional(),
  name: z.string().min(1).max(200).optional(),
  sku: z.string().min(1).max(50).optional(),
  category: z.string().max(100).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  qty: z.number().int().min(1, "Qty minimal 1"),
  unitCost: z.number().min(0, "Harga beli tidak boleh negatif"),
  minStock: z.number().int().min(0).default(0),
  ownerId: z.string().min(1).optional(),
  marginType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  marginValue: z.number().min(0).default(0),
});

const batchSchema = z.object({
  unitId: z.string().min(1).optional(),
  // asDraft: simpan sebagai draf review manager — stok & konsinyasi
  // BELUM berubah sampai di-approve via PATCH /api/retail/batches/[id].
  asDraft: z.boolean().default(false),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal format YYYY-MM-DD")
    .optional(),
  sourceType: z.enum(["PEMBELIAN", "TITIPAN", "LAIN"]).default("LAIN"),
  sourceRef: z.string().min(1).max(36).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  lines: z.array(lineSchema).min(1, "Minimal satu baris").max(200),
});

function computeAgreed(cost: number, type: "PERCENT" | "FIXED", value: number) {
  if (type === "FIXED") return Math.round((cost + value) * 100) / 100;
  return Math.round((cost * (1 + value / 100)) * 100) / 100;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * GET /api/retail/batches?unitId=&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=
 * Riwayat batch kedatangan unit + ringkasan modal masuk.
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
  const limit = Math.min(Number(q.get("limit") ?? 50), 200);
  const where: any = { unitId };
  const status = q.get("status");
  if (status) where.status = { in: status.split(",") };
  const from = q.get("from");
  const to = q.get("to");
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) where.date.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const [rows, agg] = await Promise.all([
    prisma.stockBatch.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
      include: {
        creator: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.stockBatch.aggregate({
      where,
      _sum: { totalCost: true },
      _count: { id: true },
    }),
  ]);

  return NextResponse.json({
    data: rows.map((b) => ({
      id: b.id,
      batchNo: b.batchNo,
      date: b.date,
      kind: b.kind,
      status: b.status,
      totalQty: b.totalQty,
      totalCost: Number(b.totalCost),
      sourceType: b.sourceType,
      sourceRef: b.sourceRef,
      note: b.note,
      by: b.creator?.name ?? "-",
      reviewedBy: b.reviewer?.name ?? null,
      reviewedAt: b.reviewedAt,
      reviewNote: b.reviewNote,
      lines: b._count.items,
      createdAt: b.createdAt,
    })),
    summary: {
      batchCount: agg._count.id,
      modalMasuk: Number(agg._sum.totalCost ?? 0),
    },
  });
}

/**
 * POST /api/retail/batches — catat kedatangan barang (STAFF/MANAGER).
 * Satu request = satu batch, atomik: gagal satu baris → rollback semua.
 * Efek per baris: stok += qty, purchasePrice = unitCost; baris titipan
 * sekaligus buat/update ConsignmentItem (harga jual = agreed server).
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
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Data tidak valid" },
      { status: 400 },
    );
  }

  const unitId = await resolveUnitId(session, parsed.data.unitId ?? null);
  if (!unitId) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });
  }
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { code: true },
  });
  if (!unit) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 });
  }

  // Validasi ringan per baris sebelum transaksi.
  for (let i = 0; i < parsed.data.lines.length; i++) {
    const l = parsed.data.lines[i];
    if (!l.inventoryItemId && (!l.name?.trim() || !l.sku?.trim())) {
      return NextResponse.json(
        { error: `Baris ${i + 1}: pilih barang dari database atau isi nama + SKU baru` },
        { status: 400 },
      );
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dateStr = parsed.data.date || wibDateStr();
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
      const seq =
        (await tx.stockBatch.count({
          where: { unitId, date: { gte: dayStart, lte: dayEnd } },
        })) + 1;
      const batchNo = `B-${(unit.code || "RT").toUpperCase()}-${dateStr.replace(/-/g, "")}-${String(seq).padStart(3, "0")}`;

      let totalQty = 0;
      let totalCost = 0;
      let titipanLines = 0;
      const batchLines: {
        inventoryItemId: string;
        qty: number;
        unitCost: number;
        lineTotal: number;
        ownerId: string | null;
        marginType: string | null;
        marginValue: number | null;
      }[] = [];

      const isDraft = parsed.data.asDraft === true;
      for (const l of parsed.data.lines) {
        const lineTotal = round2(l.qty * l.unitCost);
        let invId = l.inventoryItemId;

        if (invId) {
          const existing = await tx.inventoryItem.findFirst({
            where: { id: invId, unitId },
          });
          if (!existing) {
            throw new Error("BARANG_LUAR_UNIT");
          }
          if (!isDraft) {
            await tx.inventoryItem.update({
              where: { id: invId },
              data: {
                currentStock: (existing.currentStock ?? 0) + l.qty,
                purchasePrice: l.unitCost,
                isActive: true,
              },
            });
          }
        } else {
          // Draf: barang baru dicatat nonaktif + stok 0, diaktifkan saat approve.
          const created = await tx.inventoryItem.create({
            data: {
              unitId,
              name: l.name!.trim(),
              sku: l.sku!.trim(),
              category: l.category?.trim() || null,
              imageUrl: l.imageUrl?.trim() || null,
              currentStock: isDraft ? 0 : l.qty,
              minStock: l.minStock,
              unitPrice: l.unitCost,
              purchasePrice: l.unitCost,
              isActive: !isDraft,
            },
          });
          invId = created.id;
        }

        let ownerId: string | null = null;
        let marginType: string | null = null;
        let marginValue: number | null = null;
        if (l.ownerId) {
          const owner = await tx.consignmentOwner.findFirst({
            where: { id: l.ownerId, unitId },
          });
          if (!owner) throw new Error("PEMILIK_LUAR_UNIT");
          if (!isDraft) {
            const agreed = computeAgreed(l.unitCost, l.marginType, l.marginValue);
            await tx.consignmentItem.upsert({
              where: { inventoryItemId: invId! },
              update: {
                ownerId: l.ownerId,
                costPrice: l.unitCost,
                marginType: l.marginType,
                marginValue: l.marginValue,
                agreedPrice: agreed,
                isActive: true,
              },
              create: {
                unitId,
                ownerId: l.ownerId,
                inventoryItemId: invId!,
                costPrice: l.unitCost,
                marginType: l.marginType,
                marginValue: l.marginValue,
                agreedPrice: agreed,
              },
            });
            await tx.inventoryItem.update({
              where: { id: invId! },
              data: { unitPrice: agreed },
            });
          }
          ownerId = l.ownerId;
          marginType = l.marginType;
          marginValue = l.marginValue;
          titipanLines++;
        }

        totalQty += l.qty;
        totalCost = round2(totalCost + lineTotal);
        batchLines.push({
          inventoryItemId: invId!,
          qty: l.qty,
          unitCost: l.unitCost,
          lineTotal,
          ownerId,
          marginType,
          marginValue,
        });
      }

      const kind =
        titipanLines === 0
          ? "PONDOK"
          : titipanLines === parsed.data.lines.length
            ? "TITIPAN"
            : "CAMPURAN";

      const batch = await tx.stockBatch.create({
        data: {
          unitId,
          batchNo,
          date: new Date(`${dateStr}T00:00:00.000Z`),
          kind,
          status: isDraft ? "DRAFT" : "APPROVED",
          totalQty,
          totalCost,
          sourceType: parsed.data.sourceType,
          sourceRef: parsed.data.sourceRef?.trim() || null,
          note: parsed.data.note?.trim() || null,
          createdById: session.user.id!,
          items: { create: batchLines },
        },
      });
      return { batch, lineCount: batchLines.length };
    });

    return NextResponse.json(
      {
        data: {
          id: result.batch.id,
          batchNo: result.batch.batchNo,
          date: result.batch.date,
          kind: result.batch.kind,
          status: result.batch.status,
          totalQty: result.batch.totalQty,
          totalCost: Number(result.batch.totalCost),
          lines: result.lineCount,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    const msg = String(error?.message ?? "");
    if (msg === "BARANG_LUAR_UNIT") {
      return NextResponse.json(
        { error: "Ada barang di luar unit ini" },
        { status: 400 },
      );
    }
    if (msg === "PEMILIK_LUAR_UNIT") {
      return NextResponse.json(
        { error: "Pemilik titipan bukan milik unit ini" },
        { status: 400 },
      );
    }
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "SKU sudah dipakai (duplikat). Pakai SKU lain atau pilih barang existing." },
        { status: 409 },
      );
    }
    console.error("[retail/batches] error:", error);
    return NextResponse.json(
      { error: "Gagal mencatat batch kedatangan" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail } from "@/lib/retail-guard";

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const patchSchema = z.object({
  action: z.enum(["reject", "order", "receive", "pay"]),
  reason: z.string().trim().max(1000).optional(),
  supplierName: z.string().trim().min(1).max(255).optional(),
  supplierPhone: z.string().trim().max(30).optional(),
  rows: z
    .array(
      z.object({
        itemId: z.string().min(1),
        qtyReceived: z.number().int().nonnegative(),
      }),
    )
    .optional(),
  invoiceNumber: z.string().trim().max(100).optional(),
  finalTotal: z.number().nonnegative().optional(),
  note: z.string().trim().max(1000).optional(),
});

const detailInclude = {
  units: { select: { id: true, name: true, code: true, lembagaId: true } },
  creator: { select: { id: true, name: true } },
  orderer: { select: { id: true, name: true } },
  receiver: { select: { id: true, name: true } },
  payer: { select: { id: true, name: true } },
  items: { orderBy: { name: "asc" as const } },
};

async function loadRequest(id: string) {
  return prisma.purchaseRequest.findUnique({ where: { id }, include: detailInclude });
}

function canViewDetail(req: any, role?: string | null, unitId?: string | null, lembagaId?: string | null) {
  if (role === "MANAGER" || role === "STAFF") {
    return req.unitId === unitId;
  }
  if (role === "PIMPINAN") {
    return req.units?.lembagaId === lembagaId;
  }
  return role === "SUPERADMIN";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !guardRetail(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const req = await loadRequest(id);
  if (!req) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
  }
  if (!canViewDetail(req, session.user.role, session.user.unitId, session.user.lembagaId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    data: {
      ...req,
      estimatedTotal: Number(req.estimatedTotal),
      finalTotal: req.finalTotal === null ? null : Number(req.finalTotal),
      items: req.items.map((i) => ({
        ...i,
        estUnitCost: Number(i.estUnitCost),
        unitCost: i.unitCost === null ? null : Number(i.unitCost),
      })),
    },
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !guardRetail(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const req = await loadRequest(id);
  if (!req) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
  }
  const canDelete =
    session.user.role === "SUPERADMIN" ||
    (req.createdById === session.user.id && req.status === "REQUESTED");
  if (!canDelete) {
    return NextResponse.json(
      { error: "Hanya pengaju yang dapat menghapus sebelum diorder" },
      { status: 403 },
    );
  }
  await prisma.purchaseRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !guardRetail(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  const { id } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal", details: parsed.error.errors },
      { status: 400 },
    );
  }

  const req = await loadRequest(id);
  if (!req) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
  }
  if (!canViewDetail(req, role, session.user.unitId, session.user.lembagaId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action } = parsed.data;
  const isHighRole = role === "PIMPINAN" || role === "SUPERADMIN";

  if (action === "reject") {
    if (!isHighRole || req.status !== "REQUESTED") {
      return NextResponse.json(
        { error: "Tidak dapat menolak pengajuan pada status ini" },
        { status: 400 },
      );
    }
    const reason = parsed.data.reason?.trim() || "Tidak ada keterangan";
    await prisma.purchaseRequest.update({
      where: { id },
      data: { status: "REJECTED", refusedReason: reason },
    });
    await prisma.notification.create({
      data: {
        userId: req.createdById,
        type: "WARNING",
        title: `Pengajuan ditolak: ${req.title}`,
        message: reason,
      },
    }).catch(() => {});
    return NextResponse.json({ data: { id, status: "REJECTED" } });
  }

  if (action === "order") {
    if (!isHighRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (req.status !== "REQUESTED") {
      return NextResponse.json(
        { error: "Pengajuan sudah tidak bisa dipesan" },
        { status: 400 },
      );
    }
    if (!parsed.data.supplierName) {
      return NextResponse.json({ error: "Nama supplier wajib diisi" }, { status: 400 });
    }
    await prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: "ORDERED",
        supplierName: parsed.data.supplierName,
        supplierPhone: parsed.data.supplierPhone || null,
        orderAt: new Date(),
        orderById: session.user.id!,
      },
    });
    await prisma.notification.create({
      data: {
        userId: req.createdById,
        type: "INFO",
        title: `Belanja diorder: ${req.title}`,
        message: `Barang dipesan ke ${parsed.data.supplierName}. Mohon konfirmasi serah terima setelah barang diterima.`,
      },
    }).catch(() => {});
    return NextResponse.json({ data: { id, status: "ORDERED" } });
  }

  if (action === "receive") {
    if ((role !== "MANAGER" && role !== "STAFF") || req.unitId !== session.user.unitId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (req.status !== "ORDERED") {
      return NextResponse.json(
        { error: "Barang hanya bisa diterima setelah dipesan" },
        { status: 400 },
      );
    }
    const rows = parsed.data.rows || [];
    if (rows.length === 0) {
      return NextResponse.json({ error: "Isi jumlah diterima minimal satu item" }, { status: 400 });
    }
    const itemIds = rows.map((r) => r.itemId);
    const existing = await prisma.purchaseRequestItem.findMany({
      where: { requestId: id, id: { in: itemIds } },
      select: { id: true, qtyRequested: true },
    });
    if (existing.length !== rows.length) {
      return NextResponse.json({ error: "Ada item yang tidak valid" }, { status: 400 });
    }
    await prisma.$transaction(async (tx) => {
      for (const r of rows) {
        const it = existing.find((e) => e.id === r.itemId)!;
        if (r.qtyReceived > it.qtyRequested) {
          throw new Error(`Jumlah terima melebihi pesanan untuk ${r.itemId}`);
        }
        await tx.purchaseRequestItem.update({
          where: { id: r.itemId },
          data: { qtyReceived: r.qtyReceived },
        });
      }
      await tx.purchaseRequest.update({
        where: { id },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          receivedById: session.user.id!,
          receiveNote: parsed.data.note?.trim() || null,
        },
      });
    });
    return NextResponse.json({ data: { id, status: "RECEIVED" } });
  }

  // action === "pay" — langkah akhir: Pimpinan bayar sesuai invoice.
  if (!isHighRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (req.status !== "RECEIVED") {
    return NextResponse.json(
      { error: "Barang harus diterima sebelum dibayar" },
      { status: 400 },
    );
  }
  if (!parsed.data.invoiceNumber?.trim()) {
    return NextResponse.json({ error: "Nomor invoice wajib diisi" }, { status: 400 });
  }
  if (!parsed.data.finalTotal || parsed.data.finalTotal <= 0) {
    return NextResponse.json({ error: "Nominal final wajib diisi" }, { status: 400 });
  }
  const finalTotal = parsed.data.finalTotal;
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);
  const description = `Belanja UNIT: ${req.units.name} - ${dateStr} - ${fmt(finalTotal)}`;

  const paid = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        unitId: req.unitId,
        type: "EXPENSE",
        amount: finalTotal,
        description,
        reference: `BELANJA-${req.requestNo}`,
        status: "APPROVED",
        createdById: session.user.id!,
        approvedById: session.user.id!,
        approvedAt: now,
      },
      select: { id: true },
    });
    const updated = await tx.purchaseRequest.update({
      where: { id },
      data: {
        status: "PAID",
        finalTotal,
        invoiceNumber: parsed.data.invoiceNumber?.trim(),
        paidAt: now,
        paidById: session.user.id!,
        transactionId: transaction.id,
      },
      select: { id: true, requestNo: true },
    });
    return { transactionId: transaction.id, updated };
  });

  await prisma.notification.create({
    data: {
      userId: req.createdById,
      type: "SUCCESS",
      title: `Belanja lunas: ${req.title}`,
      message: `${description}\nInvoice: ${parsed.data.invoiceNumber?.trim()}`,
    },
  }).catch(() => {});

  return NextResponse.json({
    data: { id, status: "PAID", transactionId: paid.transactionId },
  });
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";
import { notifyUnitManagers } from "@/lib/retail-notify";

const WIB = 7 * 3600 * 1000;
const wibDateStr = (now = Date.now()) =>
  new Date(now + WIB).toISOString().slice(0, 10);

const payoutSchema = z.object({
  ownerId: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  note: z.string().max(1000).optional().nullable(),
});

/** GET /api/retail/consignments/payouts — daftar payout (default bulan ini WIB). */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const unitId = await resolveUnitId(session, searchParams.get("unitId"));
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const today = wibDateStr();
  const from = searchParams.get("from");
  const to = searchParams.get("to") || today;
  const where: any = { unitId };
  if (from) {
    where.fromDate = { gte: new Date(`${from}T00:00:00.000Z`) };
    where.toDate = { lte: new Date(`${to}T23:59:59.999Z`) };
  }
  if (searchParams.get("status"))
    where.status = { in: (searchParams.get("status") || "").split(",") };

  const payouts = await prisma.consignmentPayout.findMany({
    where,
    include: {
      owners: { select: { id: true, name: true } },
      paidBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    data: payouts.map((p) => ({
      ...p,
      ownerName: p.owners.name,
      paidByName: p.paidBy?.name ?? null,
    })),
  });
}

/** POST /api/retail/consignments/payouts — buat draft payout dari laporan penjualan. */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = payoutSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Data tidak valid" },
      { status: 400 },
    );

  const unitId = await resolveUnitId(session, null);
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const owner = await prisma.consignmentOwner.findFirst({
    where: { id: parsed.data.ownerId, unitId },
  });
  if (!owner)
    return NextResponse.json({ error: "Pemilik tidak ditemukan" }, { status: 404 });

  const start = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const end = new Date(`${parsed.data.to}T23:59:59.999Z`);

  // Ulangi logika laporan untuk periode tsb — hitung hak pemilik.
  const items = await prisma.consignmentItem.findMany({
    where: { unitId, ownerId: owner.id, isActive: true },
    select: { inventoryItemId: true, costPrice: true },
  });
  const txs = await prisma.transaction.findMany({
    where: {
      unitId,
      type: "INCOME",
      status: "APPROVED",
      date: { gte: start, lte: end },
      order_items: { some: { itemId: { in: items.map(i => i.inventoryItemId) } } },
    },
    select: { order_items: { select: { itemId: true, quantity: true, totalPrice: true } } },
  });

  const byItem = new Map<string, { qty: number; total: number }>();
  txs.forEach((tx) => {
    tx.order_items.forEach((oi) => {
      if (!oi.itemId) return;
      const cur = byItem.get(oi.itemId) || { qty: 0, total: 0 };
      cur.qty += oi.quantity ?? 1;
      cur.total += Number(oi.totalPrice) || 0;
      byItem.set(oi.itemId, cur);
    });
  });

  let hakPemilik = 0;
  let omzet = 0;
  items.forEach((item) => {
    const agg = byItem.get(item.inventoryItemId) || { qty: 0, total: 0 };
    hakPemilik += agg.qty * Number(item.costPrice);
    omzet += agg.total;
  });
  hakPemilik = Math.round(hakPemilik * 100) / 100;

  if (hakPemilik <= 0)
    return NextResponse.json(
      { error: "Tidak ada penjualan titipan pada periode ini" },
      { status: 400 },
    );

  // Cegah pembayaran rangkap pada rentang yg tumpang tindih.
  const overlap = await prisma.consignmentPayout.findFirst({
    where: {
      unitId,
      ownerId: owner.id,
      status: { not: "CANCELLED" },
      fromDate: { lte: end },
      toDate: { gte: start },
    },
  });
  if (overlap)
    return NextResponse.json(
      { error: "Sudah ada pembayaran untuk rentang ini (mulai " + (overlap.toDate.toISOString().slice(0, 10)) + ")" },
      { status: 409 },
    );

  const payout = await prisma.consignmentPayout.create({
    data: {
      unitId,
      ownerId: owner.id,
      amount: hakPemilik,
      fromDate: start,
      toDate: end,
      note: parsed.data.note?.trim() || null,
    },
  });
  await notifyUnitManagers(
    unitId,
    "Draf payout titipan baru",
    `Payout ${owner.name} Rp ${hakPemilik.toLocaleString("id-ID")} menunggu pembayaran di Serah Terima.`,
  );
  return NextResponse.json({ data: payout }, { status: 201 });
}
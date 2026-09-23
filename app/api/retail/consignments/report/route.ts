import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

const WIB = 7 * 3600 * 1000;
const todayWib = (now = Date.now()) =>
  new Date(now + WIB).toISOString().slice(0, 10);

interface OrderAgg {
  qty: number;
  total: number;
}

/**
 * GET /api/retail/consignments/report
 *  query: ownerId?, from (YYYY-MM-DD), to (YYYY-MM-DD), paid=1 (abaikan payout PAID)
 * Ringkasan penjualan per pemilik: qty terjual, omzet, hak pemilik (qty×cost),
 * komisi unit (omzet − hak). Period default = hari ini WIB.
 */
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

  const today = todayWib();
  const from = searchParams.get("from") || today;
  const to = searchParams.get("to") || today;
  const ownerId = searchParams.get("ownerId") || undefined;
  const excludePaid = searchParams.get("paid") === "1";

  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);

  // Items konsinyasi aktif unit tsb (opsional filter owner).
  const items = await prisma.consignmentItem.findMany({
    where: { unitId, ownerId, isActive: true, owners: { isActive: true } },
    include: {
      owners: { select: { id: true, name: true } },
      inventoryItems: { select: { id: true, name: true, currentStock: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Payout sudah dibayar pada rentang (untuk flag "baru").
  const paidInRange = excludePaid
    ? await prisma.consignmentPayout.findMany({
        where: {
          unitId,
          ownerId,
          status: "PAID",
          toDate: { gte: start },
          fromDate: { lte: end },
        },
        select: { ownerId: true, toDate: true, amount: true },
      })
    : [];

  // Semua transaksi POS (INCOME) pada rentang — ambil order_items sekaligus.
  const txs = await prisma.transaction.findMany({
    where: {
      unitId,
      type: "INCOME",
      status: "APPROVED",
      date: { gte: start, lte: end },
      order_items: { some: { itemId: { in: items.map(i => i.inventoryItemId) } } },
    },
    select: {
      id: true,
      date: true,
      order_items: {
        select: { itemId: true, quantity: true, totalPrice: true },
      },
    },
  });

  const byItem = new Map<string, OrderAgg>();
  txs.forEach((tx) => {
    tx.order_items.forEach((oi) => {
      if (!oi.itemId) return;
      const cur = byItem.get(oi.itemId) || { qty: 0, total: 0 };
      cur.qty += oi.quantity ?? 1;
      cur.total += Number(oi.totalPrice) || 0;
      byItem.set(oi.itemId, cur);
    });
  });

  const grouped = new Map<string, any>();
  const detail: any[] = [];

  for (const item of items) {
    const agg = byItem.get(item.inventoryItemId) || { qty: 0, total: 0 };
    const cost = Number(item.costPrice) || 0;
    const hakPemilik = agg.qty * cost;
    const komisiUnit = agg.total - hakPemilik;
    const entry = {
      itemId: item.id,
      inventoryItemId: item.inventoryItemId,
      name: item.inventoryItems.name,
      currentStock: item.inventoryItems.currentStock,
      costPrice: item.costPrice,
      agreedPrice: item.agreedPrice,
      qtySold: agg.qty,
      omzet: Math.round(agg.total * 100) / 100,
      hakPemilik: Math.round(hakPemilik * 100) / 100,
      komisiUnit: Math.round(komisiUnit * 100) / 100,
    };
    detail.push(entry);

    const ownerKey = item.ownerId;
    const g = grouped.get(ownerKey) || {
      ownerId: item.ownerId,
      ownerName: item.owners.name,
      qtySold: 0,
      omzet: 0,
      hakPemilik: 0,
      komisiUnit: 0,
      coveredTo: (paidInRange.find(p => p.ownerId === item.ownerId) as any)?.toDate ?? null,
    };
    g.qtySold += entry.qtySold;
    g.omzet += entry.omzet;
    g.hakPemilik += entry.hakPemilik;
    g.komisiUnit += entry.komisiUnit;
    grouped.set(ownerKey, g);
  }

  const rows = [...grouped.values()].map((g) => ({
    ...g,
    omzet: Math.round(g.omzet * 100) / 100,
    hakPemilik: Math.round(g.hakPemilik * 100) / 100,
    komisiUnit: Math.round(g.komisiUnit * 100) / 100,
  }));

  return NextResponse.json({
    data: {
      from,
      to,
      owners: rows,
      detail,
    },
  });
}
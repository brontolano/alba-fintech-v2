import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

// WIB (UTC+7) — konsisten dengan modul shift retail.
const WIB = 7 * 3600 * 1000;
const wibDateStr = (now = Date.now()) =>
  new Date(now + WIB).toISOString().slice(0, 10);
const dayStart = (s: string) => new Date(`${s}T00:00:00.000Z`);

/**
 * GET /api/retail/dashboard?unitId=
 *
 * Ringkasan dasbor retail per unit (fokus UI Staff):
 * - unit: identitas unit aktif
 * - shift: status check-in/out saya hari ini + kru yang sedang aktif
 * - lowStock: barang aktif yang stok <= minStock (maks 8) + total count
 * - recent: 8 transaksi terakhir unit (aktivitas terkini)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!guardRetail(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const unitId = await resolveUnitId(session, searchParams.get("unitId"));
  if (!unitId) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });
  }

  const dateStr = wibDateStr();
  const start = dayStart(dateStr);

  const [unit, mine, onShift, items, recent] = await Promise.all([
    prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true, name: true, code: true, isRetail: true },
    }),
    prisma.shiftAttendance.findUnique({
      where: {
        unitId_userId_date: { unitId, userId: session.user.id!, date: start },
      },
      select: {
        id: true,
        service: true,
        checkInAt: true,
        checkOutAt: true,
      },
    }),
    prisma.shiftAttendance.findMany({
      where: { unitId, date: start, checkOutAt: null },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { checkInAt: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { unitId, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        imageUrl: true,
        currentStock: true,
        minStock: true,
        unitPrice: true,
      },
      orderBy: { name: "asc" },
      take: 500,
    }),
    prisma.transaction.findMany({
      where: { unitId },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
        users_transactions_createdByIdTousers: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  if (!unit) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 });
  }

  const lowStock = items
    .filter((i) => (i.currentStock ?? 0) <= (i.minStock ?? 0))
    .slice(0, 8)
    .map((i) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      imageUrl: i.imageUrl,
      currentStock: i.currentStock ?? 0,
      minStock: i.minStock ?? 0,
      unitPrice: i.unitPrice == null ? null : Number(i.unitPrice),
      empty: (i.currentStock ?? 0) <= 0,
    }));
  const lowStockCount = items.filter(
    (i) => (i.currentStock ?? 0) <= (i.minStock ?? 0),
  ).length;

  return NextResponse.json({
    data: {
      unit: { id: unit.id, name: unit.name, code: unit.code },
      date: dateStr,
      shift: {
        mine: mine
          ? {
              id: mine.id,
              service: mine.service,
              checkInAt: mine.checkInAt,
              checkOutAt: mine.checkOutAt,
              active: !mine.checkOutAt,
            }
          : null,
        onShift: onShift.map((s) => ({
          id: s.id,
          service: s.service,
          checkInAt: s.checkInAt,
          user: s.user,
        })),
        onShiftCount: onShift.length,
      },
      lowStock: { count: lowStockCount, items: lowStock },
      recent: recent.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        status: t.status,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt,
        by: t.users_transactions_createdByIdTousers?.name ?? "-",
      })),
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

/**
 * GET /api/retail/reorder/suggest?unitId=
 *
 * Saran pengajuan belanja stok berdasarkan `minStock`:
 * item aktif yang stoknya sudah di bawah ambang (currentStock < minStock).
 * qty saran = minStock*2 - currentStock (min 1).
 */

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !guardRetail(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const requested = request.nextUrl.searchParams.get("unitId");
  const unitId = await resolveUnitId(session, requested);
  if (!unitId) {
    return NextResponse.json({ error: "Unit wajib dipilih" }, { status: 400 });
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { isRetail: true, lembagaId: true },
  });
  if (!unit || unit.isRetail !== true) {
    return NextResponse.json({ error: "Unit bukan retail" }, { status: 400 });
  }
  if (role === "PIMPINAN" && unit.lembagaId !== session.user.lembagaId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.inventoryItem.findMany({
    where: { unitId, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      currentStock: true,
      minStock: true,
      unitPrice: true,
      purchasePrice: true,
      sku: true,
    },
  });

  const suggestion = items
    .filter(
      (i) =>
        (i.minStock ?? 0) > 0 &&
        (i.currentStock ?? 0) < (i.minStock ?? 0),
    )
    .map((i) => {
      const current = i.currentStock ?? 0;
      const min = i.minStock ?? 0;
      const suggestedQty = Math.max(min * 2 - current, 1);
      return {
        id: i.id,
        name: i.name,
        sku: i.sku,
        currentStock: current,
        minStock: min,
        suggestedQty,
        unitPrice: Number(i.unitPrice ?? 0),
        purchasePrice: Number(i.purchasePrice ?? 0),
      };
    });

  return NextResponse.json({
    data: suggestion,
    unitId,
    count: suggestion.length,
  });
}
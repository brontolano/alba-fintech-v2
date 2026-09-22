import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

const WIB = 7 * 3600 * 1000;
const currentPeriod = () =>
  new Date(Date.now() + WIB).toISOString().slice(0, 7);

const createSchema = z.object({
  categoryId: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().positive(),
  note: z.string().optional(),
  unitId: z.string().optional(),
});

/** GET ?period=YYYY-MM: alokasi + realisasi (pakai APPROVED) + sisa */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let unitId = session.user.unitId;
  if (
    (role === "PIMPINAN" || role === "SUPERADMIN") &&
    searchParams.get("unitId")
  )
    unitId = searchParams.get("unitId");
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const period = searchParams.get("period") || currentPeriod();
  const [y, m] = period.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

  const allocations = await prisma.budgetAllocation.findMany({
    where: { unitId, period, isActive: true },
    include: {
      category: { select: { id: true, name: true, code: true, type: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const txs = await prisma.transaction.findMany({
    where: {
      unitId,
      type: "EXPENSE",
      status: "APPROVED",
      date: { gte: start, lte: end },
    },
    select: { categoryId: true, amount: true },
  });
  const usedByCat = new Map<string, number>();
  for (const t of txs) {
    if (!t.categoryId) continue;
    usedByCat.set(
      t.categoryId,
      (usedByCat.get(t.categoryId) || 0) + Number(t.amount || 0),
    );
  }

  return NextResponse.json({
    data: {
      period,
      allocations: allocations.map((a) => {
        const used = usedByCat.get(a.categoryId) || 0;
        return { ...a, used, remaining: Number(a.amount) - used };
      }),
    },
  });
}

/** POST: pimpinan tetapkan alokasi (upsert per unit+kategori+periode) */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Data alokasi tidak valid" }, { status: 400 });

  // unitId: pimpinan untuk unit di lembaganya
  const unitId = parsed.data.unitId || session.user.unitId;
  if (!unitId)
    return NextResponse.json({ error: "unitId wajib" }, { status: 400 });

  if (role === "PIMPINAN") {
    const target = await prisma.unit.findFirst({
      where: { id: unitId, lembagaId: session.user.lembagaId },
      select: { id: true },
    });
    if (!target)
      return NextResponse.json(
        { error: "Unit di luar lembaga Anda" },
        { status: 403 },
      );
  }

  const category = await prisma.financialCategory.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category || category.type !== "EXPENSE")
    return NextResponse.json(
      { error: "Kategori harus pengeluaran" },
      { status: 400 },
    );

  const row = await prisma.budgetAllocation.upsert({
    where: {
      unitId_categoryId_period: {
        unitId,
        categoryId: parsed.data.categoryId,
        period: parsed.data.period,
      },
    },
    update: {
      amount: parsed.data.amount,
      note: parsed.data.note?.trim() || null,
      isActive: true,
    },
    create: {
      unitId,
      categoryId: parsed.data.categoryId,
      period: parsed.data.period,
      amount: parsed.data.amount,
      note: parsed.data.note?.trim() || null,
      createdById: session.user.id!,
    },
  });
  return NextResponse.json({ data: row }, { status: 201 });
}

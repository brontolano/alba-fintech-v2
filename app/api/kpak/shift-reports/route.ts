import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

const WIB = 7 * 3600 * 1000;
const wibDateStr = (now = Date.now()) =>
  new Date(now + WIB).toISOString().slice(0, 10);
const dayStart = (s: string) => new Date(`${s}T00:00:00.000Z`);
const dayEnd = (s: string) => new Date(`${s}T23:59:59.999Z`);

const submitSchema = z.object({
  cashIncomeCounted: z.number().min(0),
  cashExpenseCounted: z.number().min(0),
  note: z.string().optional(),
  date: z.string().optional(),
});

async function systemTotals(unitId: string, userId: string, dateStr: string) {
  const start = dayStart(dateStr);
  const end = dayEnd(dateStr);
  const [txs, savings] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        unitId,
        createdById: userId,
        date: { gte: start, lte: end },
        status: { not: "REJECTED" },
      },
      select: { type: true, amount: true },
    }),
    prisma.savingsTransaction.findMany({
      where: {
        unitId,
        createdById: userId,
        createdAt: { gte: start, lte: end },
      },
      select: { type: true, amount: true },
    }),
  ]);
  const sum = (list: { amount: any }[]) =>
    list.reduce((s, x) => s + Number(x.amount || 0), 0);
  return {
    income: sum(txs.filter((t) => t.type === "INCOME")),
    expense: sum(txs.filter((t) => t.type === "EXPENSE")),
    savingsIn: sum(savings.filter((t) => t.type === "DEPOSIT")),
    savingsOut: sum(savings.filter((t) => t.type === "WITHDRAWAL")),
  };
}

/** GET: daftar laporan shift unit (?date, ?mine=1) + total sistem pembanding */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const role2 = role;
  let unitId = session.user.unitId;
  if ((role2 === "PIMPINAN" || role2 === "SUPERADMIN") && searchParams.get("unitId"))
    unitId = searchParams.get("unitId");
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const dateStr = searchParams.get("date") || wibDateStr();
  const mineOnly = searchParams.get("mine") === "1";

  const reports = await prisma.shiftReport.findMany({
    where: {
      unitId,
      date: dayStart(dateStr),
      ...(mineOnly ? { userId: session.user.id! } : {}),
    },
    include: {
      staff: { select: { id: true, name: true, role: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  const withSystem = await Promise.all(
    reports.map(async (r) => ({
      ...r,
      system: await systemTotals(unitId, r.userId, dateStr),
    })),
  );

  return NextResponse.json({
    data: {
      date: dateStr,
      reportDeadline: "17:00",
      reports: withSystem,
    },
  });
}

/** POST: staff/manager kirim laporan shift (1x per hari, bisa koreksi sebelum diterima) */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = submitSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Data laporan tidak valid" }, { status: 400 });

  const unitId = session.user.unitId;
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const dateStr = parsed.data.date || wibDateStr();
  const start = dayStart(dateStr);

  const existing = await prisma.shiftReport.findUnique({
    where: {
      unitId_userId_date: { unitId, userId: session.user.id!, date: start },
    },
  });
  if (existing?.status === "ACCEPTED")
    return NextResponse.json(
      { error: "Laporan sudah diterima manager — tidak bisa diubah" },
      { status: 409 },
    );

  const late = wibDateStr() === dateStr && new Date(Date.now() + WIB).toISOString().slice(11, 16) > "17:00";

  const row = existing
    ? await prisma.shiftReport.update({
        where: { id: existing.id },
        data: {
          cashIncomeCounted: parsed.data.cashIncomeCounted,
          cashExpenseCounted: parsed.data.cashExpenseCounted,
          note: parsed.data.note?.trim() || null,
          status: "SUBMITTED",
        },
      })
    : await prisma.shiftReport.create({
        data: {
          unitId,
          userId: session.user.id!,
          date: start,
          cashIncomeCounted: parsed.data.cashIncomeCounted,
          cashExpenseCounted: parsed.data.cashExpenseCounted,
          note: parsed.data.note?.trim() || null,
          status: "SUBMITTED",
        },
      });

  const system = await systemTotals(unitId, session.user.id!, dateStr);
  return NextResponse.json(
    { data: { ...row, system, late } },
    { status: existing ? 200 : 201 },
  );
}

/** PATCH: manager terima laporan { id } */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (!body?.id)
    return NextResponse.json({ error: "ID laporan wajib" }, { status: 400 });

  const existing = await prisma.shiftReport.findUnique({
    where: { id: body.id },
  });
  if (!existing)
    return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
  if (role === "MANAGER" && existing.unitId !== session.user.unitId)
    return NextResponse.json({ error: "Bukan laporan unit Anda" }, { status: 403 });

  const row = await prisma.shiftReport.update({
    where: { id: body.id },
    data: {
      status: "ACCEPTED",
      reviewedById: session.user.id!,
      reviewedAt: new Date(),
    },
  });
  return NextResponse.json({ data: row });
}

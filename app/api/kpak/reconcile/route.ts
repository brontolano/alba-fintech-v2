import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

const WIB = 7 * 3600 * 1000;
const wibToday = () => new Date(Date.now() + WIB).toISOString().slice(0, 10);

const bodySchema = z.object({
  date: z.string().optional(),
  cashCounted: z.number().min(0),
  note: z.string().optional(),
  unitId: z.string().optional(),
});

function resolveUnit(session: any, requested?: string | null) {
  const role = session.user.role;
  if (role === "MANAGER") return session.user.unitId;
  if (requested) return requested;
  return session.user.unitId;
}

async function breakdown(unitId: string, dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);

  const [txs, savings] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        unitId,
        status: "APPROVED",
        date: { gte: start, lte: end },
      },
      select: { id: true, type: true, amount: true, paymentMethod: true },
    }),
    prisma.savingsTransaction.findMany({
      where: { unitId, createdAt: { gte: start, lte: end } },
      select: { type: true, amount: true, channel: true },
    }),
  ]);

  const sum = (list: { amount: any }[]) =>
    list.reduce((s, x) => s + Number(x.amount || 0), 0);
  // Legacy (null) = CASH. Hanya CASH yang mengisi laci fisik;
  // BANK (rekening) dan TABUNGAN (internal) dicatat terpisah.
  const isCashTx = (t: any) => !t.paymentMethod || t.paymentMethod === "CASH";
  const isBankTx = (t: any) => t.paymentMethod === "BANK";
  const isCashSv = (t: any) => !t.channel || t.channel === "CASH";
  const isBankSv = (t: any) => t.channel === "BANK";

  const kasIn = sum(txs.filter((t) => t.type === "INCOME" && isCashTx(t)));
  const kasOut = sum(txs.filter((t) => t.type === "EXPENSE" && isCashTx(t)));
  const savIn = sum(
    savings.filter((t) => t.type === "DEPOSIT" && isCashSv(t)),
  );
  const savOut = sum(
    savings.filter((t) => t.type === "WITHDRAWAL" && isCashSv(t)),
  );
  const bankIn =
    sum(txs.filter((t) => t.type === "INCOME" && isBankTx(t))) +
    sum(savings.filter((t) => t.type === "DEPOSIT" && isBankSv(t)));
  const bankOut =
    sum(txs.filter((t) => t.type === "EXPENSE" && isBankTx(t))) +
    sum(savings.filter((t) => t.type === "WITHDRAWAL" && isBankSv(t)));

  const totalIncome = kasIn + savIn;
  const totalExpense = kasOut + savOut;
  const expected = totalIncome - totalExpense;

  return {
    date: dateStr,
    kasIn,
    kasOut,
    savIn,
    savOut,
    bankIn,
    bankOut,
    totalIncome,
    totalExpense,
    expected,
    txCount: txs.length,
    savingsCount: savings.length,
    txIds: txs.map((t) => t.id),
  };
}

/** GET ?date=: pratinjau angka sistem tanpa membuat apa pun */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const unitId = resolveUnit(session, searchParams.get("unitId"));
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const dateStr = searchParams.get("date") || wibToday();
  const data = await breakdown(unitId, dateStr);

  const existing = await prisma.cashHandover.findUnique({
    where: { unitId_date: { unitId, date: new Date(`${dateStr}T00:00:00.000Z`) } },
    select: { id: true, status: true, cashHanded: true, variance: true },
  });

  return NextResponse.json({ data: { ...data, existingHandover: existing } });
}

/**
 * POST: tutup hari otomatis — hitung sistem (kas + tabungan),
 * bandingkan dengan hitung fisik, buat/update serah terima PENDING,
 * tandai transaksi reconciled. Satu panggilan, atomik.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const unitId = resolveUnit(session, parsed.data.unitId);
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  if (role === "PIMPINAN" && unitId !== session.user.unitId) {
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

  const dateStr = parsed.data.date || wibToday();
  const data = await breakdown(unitId, dateStr);
  if (data.txCount === 0 && data.savingsCount === 0)
    return NextResponse.json(
      { error: "Tidak ada aktivitas pada tanggal ini" },
      { status: 400 },
    );

  const cashCounted = parsed.data.cashCounted;
  const variance = cashCounted - data.expected;
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);

  const existing = await prisma.cashHandover.findUnique({
    where: { unitId_date: { unitId, date: dayStart } },
  });
  if (existing && existing.status === "PENDING")
    return NextResponse.json(
      { error: "Sudah ada serah terima pending tanggal ini" },
      { status: 409 },
    );

  const note =
    parsed.data.note?.trim() ||
    `Auto: laci +${data.kasIn} -${data.kasOut}, tabungan tunai +${data.savIn} -${data.savOut}, bank +${data.bankIn} -${data.bankOut}`;

  const result = await prisma.$transaction(async (tx) => {
    const handover = existing
      ? await tx.cashHandover.update({
          where: { id: existing.id },
          data: {
            totalIncome: data.totalIncome,
            totalExpense: data.totalExpense,
            systemBalance: data.expected,
            cashHanded: cashCounted,
            variance,
            status: "PENDING",
            submittedById: session.user.id!,
            submittedAt: new Date(),
            acceptedById: null,
            acceptedAt: null,
            note,
          },
        })
      : await tx.cashHandover.create({
          data: {
            unitId,
            date: dayStart,
            totalIncome: data.totalIncome,
            totalExpense: data.totalExpense,
            systemBalance: data.expected,
            cashHanded: cashCounted,
            variance,
            status: "PENDING",
            submittedById: session.user.id!,
            note,
          },
        });

    await tx.transaction.updateMany({
      where: { id: { in: data.txIds } },
      data: { isReconciled: true, reconciledAt: new Date() },
    });

    return handover;
  });

  return NextResponse.json(
    { data: { handover: result, breakdown: data, variance } },
    { status: 201 },
  );
}

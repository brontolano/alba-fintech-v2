import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function startOfTodayUtc(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  const role = user?.role as string;
  if (role !== "PIMPINAN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const lembagaId = user?.lembagaId as string | undefined;  const unitWhere = lembagaId ? { lembagaId, isActive: true } : { isActive: true };
  const units = await prisma.unit.findMany({
    where: unitWhere,
    orderBy: { name: "asc" },
  });
  const unitIds = units.map((u) => u.id);
  const txs = await prisma.transaction.findMany({
    where: { unitId: { in: unitIds }, status: "APPROVED" },
    orderBy: { date: "desc" },
  });
  const todayStart = startOfTodayUtc().getTime();  const todayMs = startOfTodayUtc().getTime();
  const totals = { income: 0, expense: 0, balance: 0, txCountToday: 0 };
  const snapshots = units.map((u) => {

    const ut = txs.filter((t) => t.unitId === u.id);
    let income = 0; let expense = 0; let balance = 0; let countToday = 0;
    let todayIncome = 0; let todayExpense = 0;
    for (const t of ut) {
      const amt = Number(t.amount) || 0;
      const isToday = !!(t.date && new Date(t.date).getTime() >= todayMs);
      if (isToday) {
        countToday += 1;
        if (t.type === "INCOME") todayIncome += amt;
        else if (t.type === "EXPENSE") todayExpense += amt;
      }
      if (t.type === "INCOME") { income += amt; balance += amt; }
      else if (t.type === "EXPENSE") { expense += amt; balance -= amt; }
    }
    totals.income += todayIncome; totals.expense += todayExpense;
    return {
      id: u.id,
      name: u.name,
      type: (u as any).type ?? "",
      isActive: u.isActive === true,
      balance: round2(balance),
      todayIncome: round2(todayIncome),
      todayExpense: round2(todayExpense),
      txCountToday: countToday,
    };
  });
  const grand = {
    balance: round2(snapshots.reduce((s, x) => s + x.balance, 0)),
    todayIncome: round2(totals.income),
    todayExpense: round2(totals.expense),
    txCountToday: snapshots.reduce((s, x) => s + x.txCountToday, 0),
  };
  const savingsAgg = await prisma.savingsAccount.aggregate({
    where: { unitId: { in: unitIds }, status: "ACTIVE" },
    _sum: { balance: true },
  });
  const savingsTotal = round2(Number(savingsAgg._sum.balance ?? 0));
  const pendingApprovals = await prisma.approval.count({
    where: {
      status: "PENDING",
      OR: [{ unitId: { in: unitIds } }, { unitId: null }],
    },
  });
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    today: todayStart,
    units: snapshots,
    grand,
    savingsTotal,
    pendingApprovals,
  });
}
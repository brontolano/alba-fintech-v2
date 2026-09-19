import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Schema for query parameters
const querySchema = z.object({
  range: z.enum(["today", "7d", "30d", "90d"]).optional().default("30d"),
  unitId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr: any) {
      console.error(
        "[Dashboard Aggregates] Session error:",
        sessionErr.message,
      );
      return NextResponse.json({ error: "Session error" }, { status: 401 });
    }
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const role = (session.user as any)?.role;
    const userUnitId = (session.user as any)?.unitId;
    const lembagaId = (session.user as any)?.lembagaId;

    // Build date range filter
    const now = new Date();
    let startDate: Date | null = null;

    switch (parsed.data.range) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build where clause for transactions
    const txWhere: Record<string, unknown> = {
      status: "APPROVED",
      ...(startDate ? { date: { gte: startDate } } : {}),
    };

    // Role-based filtering
    if (role === "STAFF" || role === "MANAGER") {
      if (!userUnitId) {
        // Fallback aman: user tanpa unit tetap bisa membuka dashboard kosong,
        // bukan error 400/403 yang memblokir halaman.
        txWhere.unitId = { in: [] };
      } else {
        txWhere.unitId = userUnitId;
      }
    } else if (role === "PIMPINAN" && lembagaId) {
      // Pimpinan sees transactions from units in their lembaga
      const unitIds = await prisma.unit
        .findMany({
          where: { lembagaId },
          select: { id: true },
        })
        .then((units) => units.map((u) => u.id));
      txWhere.unitId = unitIds.length > 0 ? { in: unitIds } : { in: [] };
    } else if (role === "PIMPINAN" && !lembagaId) {
      txWhere.unitId = { in: [] };
    } else if (role === "SUPERADMIN") {
      // SUPERADMIN sees all transactions (no additional filter)
    } else {
      // Unknown role or missing credentials - show empty dashboard rather than crash
      txWhere.unitId = { in: [] };
    }

    // A requested unit may only narrow the user's existing scope.
    if (parsed.data.unitId) {
      if (role === "STAFF" || role === "MANAGER") {
        if (parsed.data.unitId !== userUnitId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else if (role === "PIMPINAN") {
        const targetUnit = await prisma.unit.findFirst({
          where: { id: parsed.data.unitId, lembagaId },
          select: { id: true },
        });
        if (!targetUnit) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      txWhere.unitId = parsed.data.unitId;
    }

    // Get approved transactions for aggregation
    const transactions = await prisma.transaction.findMany({
      where: txWhere,
      select: {
        id: true,
        unitId: true,
        units: {
          select: { id: true, name: true, type: true, lembagaId: true },
        },
        type: true,
        amount: true,
        date: true,
        createdAt: true,
        financial_categories: {
          select: { name: true },
        },
      },
    });

    // Build unit aggregation map
    const unitAggMap: Record<
      string,
      {
        id: string;
        name: string;
        type: string;
        balance: number;
        income: number;
        expense: number;
        transactions: number;
      }
    > = {};

    for (const tx of transactions) {
      if (!tx.units) continue;

      const uid = tx.units.id;
      if (!unitAggMap[uid]) {
        unitAggMap[uid] = {
          id: tx.units.id,
          name: tx.units.name,
          type: tx.units.type || "",
          balance: 0,
          income: 0,
          expense: 0,
          transactions: 0,
        };
      }

      unitAggMap[uid].transactions += 1;

      if (tx.type === "INCOME") {
        unitAggMap[uid].income += Number(tx.amount);
        unitAggMap[uid].balance += Number(tx.amount);
      } else if (tx.type === "EXPENSE") {
        unitAggMap[uid].expense += Number(tx.amount);
        unitAggMap[uid].balance -= Number(tx.amount);
      } else if (tx.type === "TRANSFER") {
        // Transfers don't affect balance directly
      }
    }

    const units = Object.values(unitAggMap).sort((a, b) => b.income - a.income);

    // Calculate totals
    const totalBalance = units.reduce((sum, u) => sum + u.balance, 0);
    const totalIncome = units.reduce((sum, u) => sum + u.income, 0);
    const totalExpense = units.reduce((sum, u) => sum + u.expense, 0);

    // Build time-series chart data (income vs expense per period)
    const chartLabels: string[] = [];
    const incomeByPeriod: number[] = [];
    const expenseByPeriod: number[] = [];

    if (parsed.data.range === "today") {
      // 24 hours of today
      for (let h = 0; h < 24; h++) {
        const hourStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          h,
        );
        const hourEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          h + 1,
        );
        const periodTxs = transactions.filter(
          (tx) =>
            tx.date &&
            new Date(tx.date) >= hourStart &&
            new Date(tx.date) < hourEnd,
        );
        const inc = periodTxs
          .filter((t) => t.type === "INCOME")
          .reduce((s, t) => s + Number(t.amount), 0);
        const exp = periodTxs
          .filter((t) => t.type === "EXPENSE")
          .reduce((s, t) => s + Number(t.amount), 0);
        chartLabels.push(`${h.toString().padStart(2, "0")}:00`);
        incomeByPeriod.push(inc);
        expenseByPeriod.push(exp);
      }
    } else {
      // Daily buckets for 7d/30d/90d
      const days =
        parsed.data.range === "7d" ? 7 : parsed.data.range === "30d" ? 30 : 90;
      for (let d = days - 1; d >= 0; d--) {
        const dayStart = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        const periodTxs = transactions.filter(
          (tx) =>
            tx.date &&
            new Date(tx.date) >= dayStart &&
            new Date(tx.date) < dayEnd,
        );
        const inc = periodTxs
          .filter((t) => t.type === "INCOME")
          .reduce((s, t) => s + Number(t.amount), 0);
        const exp = periodTxs
          .filter((t) => t.type === "EXPENSE")
          .reduce((s, t) => s + Number(t.amount), 0);
        chartLabels.push(format(dayStart, "dd MMM", { locale: id }));
        incomeByPeriod.push(inc);
        expenseByPeriod.push(exp);
      }
    }

    // Build expense by category (doughnut chart)
    const categoryAgg: Record<string, { name: string; amount: number }> = {};
    for (const tx of transactions) {
      if (tx.type !== "EXPENSE") continue;
      const catName = tx.financial_categories?.name || "Lainnya";
      if (!categoryAgg[catName]) {
        categoryAgg[catName] = { name: catName, amount: 0 };
      }
      categoryAgg[catName].amount += Number(tx.amount);
    }
    const expenseByCategory = Object.values(categoryAgg)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // Get recent transactions (limit 10)
    const recentTransactions = await prisma.transaction.findMany({
      where: txWhere,
      select: {
        id: true,
        unitId: true,
        type: true,
        amount: true,
        description: true,
        date: true,
        status: true,
        units: { select: { name: true } },
        bank_accounts: { select: { name: true } },
        financial_categories: { select: { name: true } },
        users_transactions_createdByIdTousers: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    });

    const formattedRecent = recentTransactions.map((tx) => ({
      id: tx.id,
      date: tx.date,
      unitId: tx.unitId,
      unitName: tx.units?.name || "-",
      description: tx.description,
      amount: Number(tx.amount),
      type: tx.type,
      accountName: tx.bank_accounts?.name || "-",
      categoryName: tx.financial_categories?.name || "-",
      createdByName: tx.users_transactions_createdByIdTousers?.name || "-",
      status: tx.status ?? "PENDING",
    }));

    // Count today's transactions
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayCount = transactions.filter(
      (tx) => tx.date && new Date(tx.date) >= todayStart,
    ).length;

    return NextResponse.json(
      {
        data: {
          summary: {
            totalBalance,
            totalIncome,
            totalExpense,
            todayTransactions: todayCount,
          },
          units,
          recentTransactions: formattedRecent,
          chartData: {
            labels: chartLabels,
            income: incomeByPeriod,
            expense: expenseByPeriod,
          },
          expenseByCategory,
        },
        summary: {
          range: parsed.data.range,
          totalUnits: units.length,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[Dashboard Aggregates API] Error:", error.message || error);
    console.error("[Dashboard Aggregates API] Stack:", error.stack);
    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

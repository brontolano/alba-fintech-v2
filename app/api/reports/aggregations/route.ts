import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { buildReportScope } from "@/lib/modules/reports/scope";
import {
  buildWeeklyBuckets,
  weekKey,
  buildDailyBuckets,
  dayKey,
  buildMonthlyBuckets,
  monthKey,
} from "@/lib/modules/reports/buckets";

// Schema for query parameters
const querySchema = z.object({
  period: z
    .enum(["daily", "weekly", "monthly", "6months", "12months", "year"])
    .optional()
    .default("6months"),
  unitId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC
    const role = (session.user as any)?.role;
    if (!["PIMPINAN", "MANAGER", "STAFF", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const unitId = (session.user as any)?.unitId;
    const lembagaId = (session.user as any)?.lembagaId;

    // Calculate date range
    const now = new Date();
    const months =
      parsed.data.period === "6months"
        ? 6
        : parsed.data.period === "12months"
          ? 12
          : 12;
    let startDate: Date;
    let groupBy: "day" | "week" | "month";

    if (parsed.data.period === "daily") {
      // Anchor "hari ini" memakai perspektif WIB agar startDate tidak
      // meleset pada transaksi subuh WIB (server default = UTC).
      const todayKey = buildDailyBuckets(new Date(), 1)[0];
      const [y, m, d] = todayKey.split("-").map((s) => Number(s));
      // Date.UTC(...) - 7h → epoch yang setelah di-shift +7h (=asWib)
      // menghasilkan komponen UTC = tanggal hari ini versi WIB.
      startDate = new Date(Date.UTC(y, m - 1, d - 6) - 7 * 3600 * 1000);
      groupBy = "day";
    } else if (parsed.data.period === "weekly") {
      // Sama: anchor 4 Senin terakhir versi WIB, mundur 28 hari dari
      // Senin minggu ini (inklusif).
      const thisMonKey = buildWeeklyBuckets(new Date(), 1)[0];
      const [y, m, d] = thisMonKey.split("-").map((s) => Number(s));
      startDate = new Date(Date.UTC(y, m - 1, d - 27) - 7 * 3600 * 1000);
      groupBy = "week";
    } else if (parsed.data.period === "monthly") {
      const thisMonKey = buildMonthlyBuckets(new Date(), 1)[0];
      const [y, m] = thisMonKey.split("-").map((s) => Number(s));
      // 5 bulan sebelumnya + bulan ini = 6 total; anchor pada hari 1.
      startDate = new Date(Date.UTC(y, m - 6, 1) - 7 * 3600 * 1000);
      groupBy = "month";
    } else {
      const thisMonKey = buildMonthlyBuckets(new Date(), 1)[0];
      const [y, m] = thisMonKey.split("-").map((s) => Number(s));
      startDate = new Date(Date.UTC(y, m - months, 1) - 7 * 3600 * 1000);
      groupBy = "month";
    }
    const txWhere: any = {
      status: "APPROVED",
      date: { gte: startDate },
    };

    const lembagaUnitIds = lembagaId
      ? await prisma.unit
          .findMany({
            where: { lembagaId },
            select: { id: true },
          })
          .then((units) => units.map((u) => u.id))
      : [];

    const reportScope = buildReportScope({
      role,
      userUnitId: unitId,
      lembagaId,
      requestedUnitId: parsed.data.unitId,
      lembagaUnitIds,
    });

    if (!reportScope.allowed) {
      return NextResponse.json(
        { error: reportScope.reason || "Forbidden" },
        {
          status: reportScope.reason === "User tidak memiliki unit" ? 400 : 403,
        },
      );
    }

    txWhere.unitId = reportScope.unitFilter;

    // Fetch transactions for monthly aggregation
    const transactions = await prisma.transaction.findMany({
      where: txWhere,
      select: {
        unitId: true,
        units: { select: { name: true } },
        type: true,
        amount: true,
        date: true,
        isPimpinanNote: true,
      },
    });

    // Pisahkan transaksi LEVEL LEMBAGA (catatan Pimpinan, non-unit)
    // agar tidak tercampur ke distribusi unit.
    const lembagaTxs = transactions.filter((t) => t.isPimpinanNote === true);
    const unitTxs = transactions.filter((t) => t.isPimpinanNote !== true);

    const lembagaSummary = {
      income: lembagaTxs
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + Number(t.amount), 0),
      expense: lembagaTxs
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + Number(t.amount), 0),
      count: lembagaTxs.length,
    };

    // Build aggregation based on groupBy
    const monthlyData: Record<
      string,
      { INCOME: number; EXPENSE: number; TRANSFER: number }
    > = {};

    /** Bucket keys dihasilkan oleh helper @/lib/modules/reports/buckets:
     *  dayKey, weekKey, monthKey — semua memakai perspektif WIB. */

    if (groupBy === "day") {
      for (const key of buildDailyBuckets(now, 7)) {
        monthlyData[key] = { INCOME: 0, EXPENSE: 0, TRANSFER: 0 };
      }
    } else if (groupBy === "week") {
      // 4 Senin terakhir, inklusif Senin minggu ini — dijamin unik dan berjarak 7 hari.
      for (const key of buildWeeklyBuckets(now, 4)) {
        monthlyData[key] = { INCOME: 0, EXPENSE: 0, TRANSFER: 0 };
      }
    } else {
      for (const key of buildMonthlyBuckets(now, months)) {
        monthlyData[key] = { INCOME: 0, EXPENSE: 0, TRANSFER: 0 };
      }
    }

    for (const tx of transactions) {
      if (!tx.date) continue;
      const d = new Date(tx.date);
      let key: string;
      if (groupBy === "day") {
        key = dayKey(d);
      } else if (groupBy === "week") {
        key = weekKey(d);
      } else {
        key = monthKey(d);
      }
      if (monthlyData[key]) {
        monthlyData[key][tx.type] += Number(tx.amount);
      }
    }

    // Build monthly array for chart
    const monthlyArray = Object.keys(monthlyData)
      .sort()
      .map((key) => ({
        month: key,
        income: Number(monthlyData[key].INCOME.toFixed(2)),
        expense: Number(monthlyData[key].EXPENSE.toFixed(2)),
        transfer: Number(monthlyData[key].TRANSFER.toFixed(2)),
      }));

    // Build unit distribution (HANYA transaksi unit; transaksi lembaga terpisah)
    const unitAggMap: Record<
      string,
      { id: string; name: string; income: number; expense: number }
    > = {};
    for (const tx of unitTxs) {
      if (!tx.units) continue;
      const uid = tx.unitId!;
      if (!unitAggMap[uid]) {
        unitAggMap[uid] = {
          id: uid,
          name: tx.units.name,
          income: 0,
          expense: 0,
        };
      }
      if (tx.type === "INCOME") {
        unitAggMap[uid].income += Number(tx.amount);
      } else if (tx.type === "EXPENSE") {
        unitAggMap[uid].expense += Number(tx.amount);
      }
    }

    const totalIncome = Object.values(unitAggMap).reduce(
      (sum, u) => sum + u.income,
      0,
    );
    const totalExpense = Object.values(unitAggMap).reduce(
      (sum, u) => sum + u.expense,
      0,
    );

    const unitDistribution = Object.values(unitAggMap)
      .filter((u) => u.income > 0 || u.expense > 0)
      .map((u) => ({
        id: u.id,
        name: u.name,
        income: Number(u.income.toFixed(2)),
        expense: Number(u.expense.toFixed(2)),
        percentage:
          totalIncome > 0
            ? Number(((u.income / totalIncome) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.income - a.income);

    // Build type distribution
    const typeDistribution = {
      income: Object.values(unitAggMap).reduce((sum, u) => sum + u.income, 0),
      expense: Object.values(unitAggMap).reduce((sum, u) => sum + u.expense, 0),
      transfer: transactions
        .filter((t) => t.type === "TRANSFER")
        .reduce((sum, t) => sum + Number(t.amount), 0),
    };

    // Totals keseluruhan = unit + lembaga
    const grandIncome = totalIncome + lembagaSummary.income;
    const grandExpense = totalExpense + lembagaSummary.expense;

    return NextResponse.json(
      {
        data: {
          monthlyData: monthlyArray,
          unitDistributionData: unitDistribution,
          typeDistribution: typeDistribution,
          lembagaSummary: {
            ...lembagaSummary,
            income: Number(lembagaSummary.income.toFixed(2)),
            expense: Number(lembagaSummary.expense.toFixed(2)),
            net: Number(
              (lembagaSummary.income - lembagaSummary.expense).toFixed(2),
            ),
          },
          statCards: {
            totalIncome: Number(grandIncome.toFixed(2)),
            totalExpense: Number(grandExpense.toFixed(2)),
            netProfit: Number((grandIncome - grandExpense).toFixed(2)),
            profitRatio:
              grandIncome > 0
                ? Number(
                    (
                      ((grandIncome - grandExpense) / grandIncome) *
                      100
                    ).toFixed(1),
                  )
                : 0,
          },
          summary: {
            totalTransactions: transactions.length,
            totalUnits: unitDistribution.length,
            period: parsed.data.period,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Reports Aggregations API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

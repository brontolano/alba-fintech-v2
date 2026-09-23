import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

/**
 * GET /api/savings/cross-unit?from=YYYY-MM-DD&to=YYYY-MM-DD&unitId=
 *
 * Laporan penggunaan tabungan (SMART_CARD) di unit lain (lintas unit):
 * mutasi WITHDRAWAL yang `unitId` mutasi != unitId asal tabungan.
 * Dikumpulkan per unit retail tempat uang dibelanjakan + per santri.
 *
 * Roles: SUPERADMIN (semua), PIMPINAN (lembaga), MANAGER (unit asal sendiri).
 */

const REPORT_ROLES = ["SUPERADMIN", "PIMPINAN", "MANAGER"] as const;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role ?? "";
  if (!(REPORT_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams;
  const fromParam = q.get("from");
  const toParam = q.get("to");
  const unitIdFilter = q.get("unitId");
  const limit = Math.min(Number(q.get("limit") ?? 1000), 2000);

  const now = new Date();
  const fromDate = fromParam
    ? new Date(`${fromParam}T00:00:00.000Z`)
    : new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const toDate = toParam ? new Date(`${toParam}T00:00:00.000Z`) : new Date();
  if (toParam) toDate.setUTCDate(toDate.getUTCDate() + 1);

  // Scope akun yang boleh dilaporkan.
  let allowedAccountIds: string[] | null = null;
  if (role !== "SUPERADMIN") {
    let filter: any;
    if (role === "MANAGER") {
      filter = { unitId: session.user.unitId };
    } else {
      const lembagaUnits = await prisma.unit.findMany({
        where: { lembagaId: session.user.lembagaId! },
        select: { id: true },
      });
      filter = { unitId: { in: lembagaUnits.map((u) => u.id) } };
    }
    const accounts = await prisma.savingsAccount.findMany({
      where: filter,
      select: { id: true },
    });
    if (accounts.length === 0) {
      return NextResponse.json({ data: [], summary: { total: 0, count: 0 } });
    }
    allowedAccountIds = accounts.map((a) => a.id);
  }

  const where: any = {
    type: "WITHDRAWAL",
    channel: "SMART_CARD",
    createdAt: { gte: fromDate, lt: toDate },
  };
  if (allowedAccountIds) where.accountId = { in: allowedAccountIds };

  const txs = await prisma.savingsTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      account: {
        select: {
          unitId: true,
          student: { select: { id: true, name: true, studentNumber: true } },
        },
      },
    },
  });

  // Hanya mutasi lintas unit (tempat belanja != unit asal tabungan).
  const cross = txs.filter((t) => t.unitId !== t.account.unitId);

  // Nama unit retail tempat belanja.
  const txUnitIds = [...new Set(cross.map((t) => t.unitId))];
  const txUnits = await prisma.unit.findMany({
    where: { id: { in: txUnitIds } },
    select: { id: true, name: true },
  });
  const unitNameMap = new Map(txUnits.map((u) => [u.id, u.name]));

  const unitsMap = new Map<
    string,
    {
      unitId: string;
      unitName: string;
      total: number;
      count: number;
      students: Map<string, { studentId: string; name: string; studentNumber: string; total: number; count: number }>;
    }
  >();

  for (const t of cross) {
    const key = t.unitId;
    let entry = unitsMap.get(key);
    if (!entry) {
      entry = { unitId: key, unitName: unitNameMap.get(key) ?? "-", total: 0, count: 0, students: new Map() };
      unitsMap.set(key, entry);
    }
    const amt = Number(t.amount ?? 0);
    entry.total += amt;
    entry.count += 1;

    const stuId = t.account?.student?.id ?? "unknown";
    let stu = entry.students.get(stuId);
    if (!stu) {
      stu = {
        studentId: stuId,
        name: t.account?.student?.name ?? "-",
        studentNumber: t.account?.student?.studentNumber ?? "-",
        total: 0,
        count: 0,
      };
      entry.students.set(stuId, stu);
    }
    stu.total += amt;
    stu.count += 1;
  }

  const data = [...unitsMap.entries()].map(
    ([, e]) =>
      ({
        unitId: e.unitId,
        unitName: e.unitName,
        total: e.total,
        count: e.count,
        students: [...e.students.values()]
          .sort((a, b) => b.total - a.total)
          .map((s) => ({ ...s })),
      }) as any,
  );
  data.sort((a, b) => b.total - a.total);

  const summary = {
    total: data.reduce((s, u) => s + u.total, 0),
    count: cross.length,
  };

  return NextResponse.json({
    data,
    summary,
    filters: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      unitId: unitIdFilter ?? null,
    },
  });
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { startOfWibDay } from "@/lib/savings-limit";

/**
 * /api/savings/limits — Batas belanja harian (WIB) per santri.
 *
 * GET   : daftar akun tabungan + dailySpendLimit + terpakai hari ini.
 * PATCH : set (atau hapus bila null) batas belanja harian.
 * Roles : SUPERADMIN (semua), PIMPINAN (lembaganya), MANAGER (unit sendiri).
 */

const LIMIT_ROLES = ["SUPERADMIN", "PIMPINAN", "MANAGER"] as const;

const patchSchema = z.object({
  accountId: z.string().min(1),
  dailySpendLimit: z.number().nonnegative().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role ?? "";
  if (!(LIMIT_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams;
  const requestedUnit = q.get("unitId");
  const limit = Math.min(Number(q.get("limit") ?? 200), 500);

  // Scope unit.
  const where: any = {};
  if (role === "MANAGER") {
    where.unitId = session.user.unitId;
  } else if (role === "PIMPINAN") {
    const lembagaUnits = await prisma.unit.findMany({
      where: { lembagaId: session.user.lembagaId!, isActive: true },
      select: { id: true },
    });
    where.unitId = { in: lembagaUnits.map((u) => u.id) };
  } else if (requestedUnit) {
    where.unitId = requestedUnit;
  }

  const accounts = await prisma.savingsAccount.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      student: { select: { id: true, name: true, studentNumber: true } },
    },
  });

  const unitIds = [...new Set(accounts.map((a) => a.unitId).filter(Boolean))];
  const unitRows = await prisma.unit.findMany({
    where: { id: { in: unitIds } },
    select: { id: true, name: true },
  });
  const unitNameMap = new Map(unitRows.map((u) => [u.id, u.name]));

  const spentToday = await prisma.savingsTransaction.groupBy({
    by: ["accountId"],
    where: {
      accountId: { in: accounts.map((a) => a.id) },
      type: "WITHDRAWAL",
      channel: "SMART_CARD",
      createdAt: { gte: startOfWibDay() },
    },
    _sum: { amount: true },
  });
  const spentMap = new Map(
    spentToday.map((r) => [r.accountId, Number(r._sum.amount ?? 0)]),
  );

  // Opsi unit untuk SUPERADMIN/PIMPINAN (dropdown filter).
  let units: { id: string; name: string }[] = [];
  if (role === "SUPERADMIN") {
    units = await prisma.unit.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  } else if (role === "PIMPINAN") {
    units = await prisma.unit.findMany({
      where: { lembagaId: session.user.lembagaId!, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  return NextResponse.json({
    data: accounts.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.student?.name ?? "-",
      studentNumber: a.student?.studentNumber ?? "-",
      unitId: a.unitId,
      unitName: unitNameMap.get(a.unitId) ?? "-",
      balance: Number(a.balance),
      dailySpendLimit:
        a.dailySpendLimit === null ? null : Number(a.dailySpendLimit),
      spentToday: spentMap.get(a.id) ?? 0,
      status: a.status,
    })),
    units,
    now: new Date().toISOString(),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role ?? "";
  if (!(LIMIT_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validasi gagal", details: parsed.error.errors },
      { status: 400 },
    );
  }

  const account = await prisma.savingsAccount.findUnique({
    where: { id: parsed.data.accountId },
  });
  if (!account) {
    return NextResponse.json({ error: "Akun tabungan tidak ditemukan" }, { status: 404 });
  }

  if (role === "MANAGER" && account.unitId !== session.user.unitId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "PIMPINAN") {
    const homeUnit = await prisma.unit.findUnique({
      where: { id: account.unitId },
      select: { lembagaId: true },
    });
    if (homeUnit?.lembagaId !== session.user.lembagaId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const value = parsed.data.dailySpendLimit ?? null;
  const updated = await prisma.savingsAccount.update({
    where: { id: account.id },
    data: { dailySpendLimit: value },
    select: { id: true, dailySpendLimit: true },
  });

  return NextResponse.json({
    data: {
      id: updated.id,
      dailySpendLimit:
        updated.dailySpendLimit === null ? null : Number(updated.dailySpendLimit),
    },
  });
}
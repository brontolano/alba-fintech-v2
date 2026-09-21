import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/options";
import prisma from "@/lib/prisma";

const handoverSchema = z.object({
  unitId: z.string().min(1),
  date: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Tanggal tidak valid",
  }),
  cashHanded: z.number().min(0, "Jumlah cash harus positif"),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as string;
    if (!["MANAGER", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = handoverSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { unitId, date, cashHanded, note } = parsed.data;
    const userId = session.user.id as string;

    if (role === "MANAGER" && session.user.unitId !== unitId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const startDate = new Date(`${date}T00:00:00`);
    const endDate = new Date(`${date}T23:59:59.999`);

    const approvedTxs = await prisma.transaction.findMany({
      where: {
        unitId,
        status: "APPROVED",
        date: { gte: startDate, lte: endDate },
      },
      select: { type: true, amount: true },
    });

    if (approvedTxs.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada transaksi disetujui pada tanggal ini" },
        { status: 400 },
      );
    }

    const totalIncome = approvedTxs
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = approvedTxs
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const systemBalance = totalIncome - totalExpense;
    const variance = cashHanded - systemBalance;

    const existing = await prisma.cashHandover.findUnique({
      where: { unitId_date: { unitId, date: startDate } },
    });

    if (existing && existing.status === "PENDING") {
      return NextResponse.json(
        { error: "Sudah ada pengajuan serah terima yang pending untuk unit dan tanggal ini" },
        { status: 409 },
      );
    }

    if (existing && existing.status === "REJECTED") {
      const handover = await prisma.cashHandover.update({
        where: { id: existing.id },
        data: {
          totalIncome,
          totalExpense,
          systemBalance,
          cashHanded,
          variance,
          status: "PENDING",
          submittedById: userId,
          submittedAt: new Date(),
          acceptedById: null,
          acceptedAt: null,
          note: note || null,
        },
      });
      return NextResponse.json({ data: handover });
    }

    const handover = await prisma.cashHandover.create({
      data: {
        unitId,
        date: startDate,
        totalIncome,
        totalExpense,
        systemBalance,
        cashHanded,
        variance,
        status: "PENDING",
        submittedById: userId,
        note: note || null,
      },
    });

    return NextResponse.json({ data: handover });
  } catch (error) {
    console.error("[Handover API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as string;
    if (!["MANAGER", "PIMPINAN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as string | null;
    const date = searchParams.get("date") as string | null;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    if (date) {
      const startDate = new Date(`${date}T00:00:00`);
      const endDate = new Date(`${date}T23:59:59.999`);
      where.date = { gte: startDate, lte: endDate };
    }

    if (role === "MANAGER") {
      where.unitId = session.user.unitId;
    } else if (role === "PIMPINAN") {
      const lembagaId = session.user.lembagaId;
      const units = await prisma.unit.findMany({
        where: { lembagaId: lembagaId ?? undefined },
        select: { id: true },
      });
      where.unitId = { in: units.map((u) => u.id) };
    }

    const handovers = await prisma.cashHandover.findMany({
      where,
      include: {
        units: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
        acceptedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ data: handovers });
  } catch (error) {
    console.error("[Handover API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

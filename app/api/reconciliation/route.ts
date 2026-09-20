import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/options";
import prisma from "@/lib/prisma";

const reconcileSchema = z.object({
  unitId: z.string().min(1),
  date: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Tanggal tidak valid",
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as string;
    if (!["MANAGER", "PIMPINAN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = reconcileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data rekonsiliasi tidak valid",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const { unitId, date } = parsed.data;
    const startDate = new Date(`${date}T00:00:00`);
    const endDate = new Date(`${date}T23:59:59.999`);

    if (role === "MANAGER" && session.user.unitId !== unitId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (role === "PIMPINAN") {
      const unit = await prisma.unit.findFirst({
        where: { id: unitId, lembagaId: session.user.lembagaId ?? undefined },
        select: { id: true },
      });
      if (!unit) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const result = await prisma.transaction.updateMany({
      where: {
        unitId,
        status: "APPROVED",
        date: { gte: startDate, lte: endDate },
      },
      data: {
        isReconciled: true,
        reconciledAt: new Date(),
      },
    });

    return NextResponse.json({ data: { updatedCount: result.count } });
  } catch (error) {
    console.error("[Reconciliation API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

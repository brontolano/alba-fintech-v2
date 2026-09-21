import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/options";
import prisma from "@/lib/prisma";

const acceptRejectSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
  note: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as string;
    if (!["PIMPINAN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const parsed = acceptRejectSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { status, note } = parsed.data;

    const handover = await prisma.cashHandover.findUnique({
      where: { id },
      include: {
        units: { select: { id: true, lembagaId: true } },
      },
    });

    if (!handover) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

    if (handover.status !== "PENDING") {
      return NextResponse.json(
        { error: "Hanya handover dengan status PENDING yang bisa diupdate" },
        { status: 400 },
      );
    }

    if (role === "PIMPINAN" && handover.units.lembagaId !== session.user.lembagaId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.cashHandover.update({
      where: { id },
      data: {
        status,
        acceptedById: session.user.id,
        acceptedAt: new Date(),
        note: note || handover.note,
      },
      include: {
        units: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
        acceptedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[Handover PATCH] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

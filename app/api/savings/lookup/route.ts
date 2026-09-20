import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const cardUid = searchParams.get("cardUid")?.trim().toUpperCase();
  const studentNumber = searchParams.get("studentNumber")?.trim();
  if (!cardUid && !studentNumber)
    return NextResponse.json(
      { error: "cardUid atau studentNumber wajib diisi" },
      { status: 400 },
    );

  const role = session.user.role;
  const student = await prisma.student.findFirst({
    where: {
      isActive: true,
      ...(cardUid ? { cardUid } : { studentNumber }),
      ...(role === "MANAGER" || role === "STAFF"
        ? { unitId: session.user.unitId }
        : {}),
      ...(role === "PIMPINAN" ? { lembagaId: session.user.lembagaId } : {}),
    },
    include: {
      account: {
        include: {
          transactions: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
    },
  });
  if (!student)
    return NextResponse.json(
      { error: "Santri tidak ditemukan" },
      { status: 404 },
    );
  return NextResponse.json({ data: student });
}

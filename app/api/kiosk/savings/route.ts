import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q)
    return NextResponse.json(
      { error: "Masukkan nomor santri atau UID kartu" },
      { status: 400 },
    );

  const student = await prisma.student.findFirst({
    where: {
      isActive: true,
      OR: [{ studentNumber: q }, { cardUid: q.toUpperCase() }],
    },
    include: {
      account: {
        include: {
          transactions: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      },
    },
  });

  if (!student || !student.account)
    return NextResponse.json(
      { error: "Santri atau rekening tabungan tidak ditemukan" },
      { status: 404 },
    );

  return NextResponse.json({
    data: {
      name: student.name,
      studentNumber: student.studentNumber,
      className: student.className,
      balance: Number(student.account.balance),
      status: student.account.status,
      transactions: student.account.transactions.map((t) => ({
        type: t.type,
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        description: t.description,
        createdAt: t.createdAt,
      })),
    },
  });
}
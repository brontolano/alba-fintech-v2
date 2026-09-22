import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "../../../../generated/prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

const mutationSchema = z.object({
  accountId: z.string().min(1),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  amount: z.number().positive(),
  description: z.string().optional(),
  reference: z.string().optional(),
  cardUid: z.string().optional(),
  photoUrl: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    !["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(
      session.user.role || "",
    )
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = mutationSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Data mutasi tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const account = await tx.savingsAccount.findUnique({
          include: { student: true },
          where: { id: parsed.data.accountId },
        });
        if (!account || account.status !== "ACTIVE")
          throw new Error("Rekening tabungan tidak aktif");
        if (
          (session.user.role === "MANAGER" || session.user.role === "STAFF") &&
          account.unitId !== session.user.unitId
        )
          throw new Error("Rekening di luar unit Anda");
        if (
          session.user.role === "PIMPINAN" &&
          account.student.lembagaId !== session.user.lembagaId
        )
          throw new Error("Rekening di luar lembaga Anda");
        if (
          parsed.data.cardUid &&
          account.student.cardUid !== parsed.data.cardUid.trim().toUpperCase()
        )
          throw new Error("UID kartu tidak cocok dengan santri");

        const before = Number(account.balance);
        const after =
          parsed.data.type === "DEPOSIT"
            ? before + parsed.data.amount
            : before - parsed.data.amount;
        if (after < 0) throw new Error("Saldo tabungan tidak mencukupi");

        await tx.savingsAccount.update({
          where: { id: account.id },
          data: { balance: after },
        });
        return tx.savingsTransaction.create({
          data: {
            accountId: account.id,
            unitId: account.unitId,
            type: parsed.data.type,
            amount: parsed.data.amount,
            balanceBefore: before,
            balanceAfter: after,
            description: parsed.data.description,
            reference: parsed.data.reference,
            photoUrl: parsed.data.photoUrl || undefined,
            cardUid:
              parsed.data.cardUid?.trim().toUpperCase() ||
              account.student.cardUid,
            createdById: session.user.id!,
          },
          include: { account: { include: { student: true } } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    if (error.message && !error.code)
      return NextResponse.json({ error: error.message }, { status: 400 });
    if (error.code === "P2034")
      return NextResponse.json(
        { error: "Saldo sedang diproses. Silakan ulangi." },
        { status: 409 },
      );
    console.error("[Savings Transactions POST]", error);
    return NextResponse.json(
      { error: "Gagal menyimpan mutasi tabungan" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const where: any = accountId ? { accountId } : {};
  if (session.user.role === "MANAGER" || session.user.role === "STAFF")
    where.unitId = session.user.unitId;
  if (session.user.role === "PIMPINAN") {
    const units = await prisma.unit.findMany({
      where: { lembagaId: session.user.lembagaId },
      select: { id: true },
    });
    where.unitId = { in: units.map((unit) => unit.id) };
  }
  const data = await prisma.savingsTransaction.findMany({
    where,
    include: { account: { include: { student: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data });
}

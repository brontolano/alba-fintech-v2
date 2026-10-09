import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

/**
 * GET /api/savings/balance?cardUid=xxx&studentNumber=yyy
 *
 * Endpoint global untuk cek saldo santri dari unit mana saja.
 * Digunakan untuk integrasi NFC reader di gerbang masuk / kantin.
 *
 * Scope:
 * - SUPERADMIN: bisa cek saldo santri di semua lembaga
 * - PIMPINAN: hanya lembaga sendiri
 * - MANAGER / STAFF: hanya unit sendiri
 * - role lain: ditolak
 */
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
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const where: any = { isActive: true };
  if (cardUid) where.cardUid = cardUid;
  else where.studentNumber = studentNumber;

  // Scope: MANAGER/STAFF hanya unit sendiri; PIMPINAN hanya lembaga sendiri.
  if (role === "MANAGER" || role === "STAFF") {
    if (!session.user.unitId)
      return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 403 });
    where.unitId = session.user.unitId;
  }
  if (role === "PIMPINAN") {
    if (!session.user.lembagaId)
      return NextResponse.json({ error: "Lembaga tidak ditemukan" }, { status: 403 });
    where.lembagaId = session.user.lembagaId;
  }

  const student = await prisma.student.findFirst({
    where,
    include: {
      account: {
        select: {
          id: true,
          balance: true,
          status: true,
          unitId: true,
        },
      },
    },
  });

  if (!student)
    return NextResponse.json(
      { error: "Santri tidak ditemukan" },
      { status: 404 },
    );

  return NextResponse.json({
    data: {
      studentId: student.id,
      studentNumber: student.studentNumber,
      name: student.name,
      className: student.className,
      cardUid: student.cardUid,
      account: student.account,
    },
  });
}

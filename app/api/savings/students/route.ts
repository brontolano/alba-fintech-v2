import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

const studentSchema = z.object({
  studentNumber: z.string().min(1),
  name: z.string().min(1),
  className: z.string().optional(),
  cardUid: z.string().optional().nullable(),
  unitId: z.string().optional(),
});

async function getScope() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized", status: 401 as const };
  const role = session.user.role;
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role || "")) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { session, role };
}

export async function GET(request: NextRequest) {
  const scope = await getScope();
  if ("error" in scope)
    return NextResponse.json({ error: scope.error }, { status: scope.status });
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const unitId = searchParams.get("unitId");
  const where: any = { isActive: true };

  if (scope.role === "MANAGER" || scope.role === "STAFF")
    where.unitId = scope.session.user.unitId;
  else if (scope.role === "PIMPINAN")
    where.lembagaId = scope.session.user.lembagaId;
  if (scope.role === "SUPERADMIN" && unitId) where.unitId = unitId;
  if (search)
    where.OR = [
      { name: { contains: search } },
      { studentNumber: { contains: search } },
      { cardUid: { contains: search } },
    ];

  const students = await prisma.student.findMany({
    where,
    include: {
      account: { select: { id: true, balance: true, status: true } },
    },
    orderBy: { name: "asc" },
    take: 100,
  });
  return NextResponse.json({ data: students });
}

export async function POST(request: NextRequest) {
  const scope = await getScope();
  if ("error" in scope)
    return NextResponse.json({ error: scope.error }, { status: scope.status });
  if (
    !["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(scope.role || "")
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = studentSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Data santri tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );

  const requestedUnitId = parsed.data.unitId || scope.session.user.unitId;
  if (!requestedUnitId)
    return NextResponse.json({ error: "Unit wajib dipilih" }, { status: 400 });
  if (
    (scope.role === "MANAGER" || scope.role === "STAFF") &&
    requestedUnitId !== scope.session.user.unitId
  )
    return NextResponse.json(
      { error: "Santri harus terdaftar di unit Anda" },
      { status: 403 },
    );
  if (scope.role === "PIMPINAN" || scope.role === "SUPERADMIN") {
    const unit = await prisma.unit.findFirst({
      where: {
        id: requestedUnitId,
        ...(scope.role === "PIMPINAN"
          ? { lembagaId: scope.session.user.lembagaId }
          : {}),
      },
      select: { id: true, lembagaId: true },
    });
    if (!unit)
      return NextResponse.json(
        { error: "Unit tidak ditemukan atau di luar scope" },
        { status: 403 },
      );
  }

  try {
    const student = await prisma.student.create({
      data: {
        studentNumber: parsed.data.studentNumber.trim(),
        name: parsed.data.name.trim(),
        className: parsed.data.className?.trim() || null,
        cardUid: parsed.data.cardUid?.trim().toUpperCase() || null,
        unitId: requestedUnitId,
        lembagaId: scope.session.user.lembagaId || null,
        account: { create: { unitId: requestedUnitId } },
      },
      include: { account: true },
    });
    return NextResponse.json({ data: student }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "Nomor santri atau UID kartu sudah digunakan" },
        { status: 409 },
      );
    console.error("[Savings Students POST]", error);
    return NextResponse.json(
      { error: "Gagal membuat data santri" },
      { status: 500 },
    );
  }
}

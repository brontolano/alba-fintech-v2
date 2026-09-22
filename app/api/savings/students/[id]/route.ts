import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

const updateStudentSchema = z.object({
  name: z.string().min(1).optional(),
  className: z.string().optional().nullable(),
  cardUid: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  // Status rekening: ACTIVE (aktif) | FROZEN (beku, transaksi ditolak) | CLOSED (tutup)
  accountStatus: z.enum(["ACTIVE", "FROZEN", "CLOSED"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role || ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      account: {
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
      },
    },
  });
  if (!student)
    return NextResponse.json(
      { error: "Santri tidak ditemukan" },
      { status: 404 },
    );

  if (
    (role === "MANAGER" || role === "STAFF") &&
    student.unitId !== session.user.unitId
  )
    return NextResponse.json(
      { error: "Santri bukan milik unit Anda" },
      { status: 403 },
    );
  if (
    role === "PIMPINAN" &&
    student.lembagaId !== session.user.lembagaId
  )
    return NextResponse.json(
      { error: "Santri bukan milik lembaga Anda" },
      { status: 403 },
    );

  return NextResponse.json({ data: student });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER"].includes(role || ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = updateStudentSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Data tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );

  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json(
      { error: "Santri tidak ditemukan" },
      { status: 404 },
    );

  // Role scope check
  if (role === "MANAGER" && existing.unitId !== session.user.unitId)
    return NextResponse.json(
      { error: "Santri bukan milik unit Anda" },
      { status: 403 },
    );
  if (
    role === "PIMPINAN" &&
    existing.lembagaId !== session.user.lembagaId
  )
    return NextResponse.json(
      { error: "Santri bukan milik lembaga Anda" },
      { status: 403 },
    );

  try {
    const student = await prisma.student.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name.trim() }),
        ...(parsed.data.className !== undefined && { className: parsed.data.className?.trim() || null }),
        ...(parsed.data.cardUid !== undefined && {
          cardUid: parsed.data.cardUid?.trim().toUpperCase() || null,
        }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
        ...(parsed.data.accountStatus !== undefined && {
          account: { update: { status: parsed.data.accountStatus } },
        }),
      },
      include: { account: true },
    });
    return NextResponse.json({ data: student });
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "UID kartu NFC sudah digunakan santri lain" },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Gagal mengupdate data santri" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPERADMIN", "PIMPINAN"].includes(role || ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json(
      { error: "Santri tidak ditemukan" },
      { status: 404 },
    );

  // Soft delete — mark inactive
  await prisma.student.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ message: "Santri dinonaktifkan" });
}

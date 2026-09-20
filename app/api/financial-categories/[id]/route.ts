import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/options";
import prisma from "@/lib/prisma";

const categorySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
  description: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  lembagaId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
});

async function requireSuperadmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    session.user.role !== "SUPERADMIN" &&
    session.user.role !== "PIMPINAN" &&
    session.user.role !== "MANAGER"
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const category = await prisma.financialCategory.findUnique({ where: { id } });
  if (!category)
    return NextResponse.json(
      { error: "Kategori tidak ditemukan" },
      { status: 404 },
    );
  return NextResponse.json({ data: category });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const forbidden = await requireSuperadmin();
  if (forbidden) return forbidden;
  const { id } = await params;
  const parsed = categorySchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.errors },
      { status: 400 },
    );
  try {
    const session = await getServerSession(authOptions);
    const existing = await prisma.financialCategory.findUnique({
      where: { id },
    });
    if (!existing)
      return NextResponse.json(
        { error: "Kategori tidak ditemukan" },
        { status: 404 },
      );
    const sessionUnitId = (session?.user as any)?.unitId ?? null;
    const sessionLembagaId = (session?.user as any)?.lembagaId ?? null;
    const nextUnitId =
      parsed.data.unitId === undefined ? existing.unitId : parsed.data.unitId;
    if (
      session?.user?.role === "MANAGER" &&
      (existing.unitId !== sessionUnitId || nextUnitId !== sessionUnitId)
    ) {
      return NextResponse.json(
        { error: "Kategori harus milik unit Anda" },
        { status: 403 },
      );
    }
    if (
      session?.user?.role === "PIMPINAN" &&
      existing.lembagaId !== sessionLembagaId
    ) {
      return NextResponse.json(
        { error: "Kategori bukan milik lembaga Anda" },
        { status: 403 },
      );
    }
    const category = await prisma.financialCategory.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ data: category });
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json(
        { error: "Kategori tidak ditemukan" },
        { status: 404 },
      );
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "Kode kategori sudah digunakan" },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const forbidden = await requireSuperadmin();
  if (forbidden) return forbidden;
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    const category = await prisma.financialCategory.findUnique({
      where: { id },
    });
    const sessionUnitId = (session?.user as any)?.unitId ?? null;
    const sessionLembagaId = (session?.user as any)?.lembagaId ?? null;
    if (!category)
      return NextResponse.json(
        { error: "Kategori tidak ditemukan" },
        { status: 404 },
      );
    if (
      session?.user?.role === "MANAGER" &&
      category.unitId !== sessionUnitId
    ) {
      return NextResponse.json(
        { error: "Kategori bukan milik unit Anda" },
        { status: 403 },
      );
    }
    if (
      session?.user?.role === "PIMPINAN" &&
      (category.lembagaId !== sessionLembagaId || category.unitId !== null)
    ) {
      return NextResponse.json(
        { error: "Pimpinan hanya dapat menghapus kategori lembaga" },
        { status: 403 },
      );
    }
    await prisma.financialCategory.delete({ where: { id } });
    return NextResponse.json({ message: "Kategori berhasil dihapus" });
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json(
        { error: "Kategori tidak ditemukan" },
        { status: 404 },
      );
    return NextResponse.json(
      { error: "Kategori masih digunakan dan tidak dapat dihapus" },
      { status: 400 },
    );
  }
}

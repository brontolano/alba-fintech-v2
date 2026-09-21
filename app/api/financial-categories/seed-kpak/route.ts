import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

const DEFAULTS: { name: string; suffix: string; type: "INCOME" | "EXPENSE" }[] = [
  { name: "HER / SPP", suffix: "HER", type: "INCOME" },
  { name: "Daftar Ulang", suffix: "DAFUL", type: "INCOME" },
  { name: "Uang Masuk Internal", suffix: "IN-IN", type: "INCOME" },
  { name: "Operasional", suffix: "OPS", type: "EXPENSE" },
  { name: "Belanja", suffix: "BELANJA", type: "EXPENSE" },
  { name: "Gaji", suffix: "GAJI", type: "EXPENSE" },
  { name: "Pengeluaran Internal", suffix: "IN-OUT", type: "EXPENSE" },
];

/**
 * Buat kategori bawaan KPAK di unit (sekali saja — yang sudah ada dilewati).
 * Menghindari halaman layanan mati karena belum ada kategori sama sekali.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let unitId = session.user.unitId;
  try {
    const body = await request.json().catch(() => ({}));
    if ((role === "PIMPINAN" || role === "SUPERADMIN") && body?.unitId)
      unitId = body.unitId;
  } catch {
    // tanpa body = pakai unit sendiri
  }
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, code: true, lembagaId: true },
  });
  if (!unit)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 });
  if (
    role === "PIMPINAN" &&
    unit.lembagaId !== session.user.lembagaId
  )
    return NextResponse.json(
      { error: "Unit di luar lembaga Anda" },
      { status: 403 },
    );

  const prefix = (unit.code || unit.id.slice(0, 6)).toUpperCase();
  let created = 0;
  for (const d of DEFAULTS) {
    const code = `${prefix}-${d.suffix}`;
    const exists = await prisma.financialCategory.findUnique({
      where: { code },
    });
    if (exists) continue;
    await prisma.financialCategory.create({
      data: {
        name: d.name,
        code,
        type: d.type,
        unitId: unit.id,
        lembagaId: unit.lembagaId,
        isActive: true,
      },
    });
    created++;
  }

  return NextResponse.json(
    { data: { created, total: DEFAULTS.length } },
    { status: 201 },
  );
}

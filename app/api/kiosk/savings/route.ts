import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lookup tabungan + 10 mutasi terakhir untuk endpoint "kiosk" / pemindai
 * kartu. Endpoint ini tadinya dapat diakses tanpa sesi (SEMUA orang bisa
 * enumerasi nomor/UID kartu dan melihat nama, saldo, serta deskripsi
 * mutasi — yang bisa berisi tulisan bebas seperti "transfer dari orang
 * tua" / "tutup SPP Oktober"). Audit menandai ini sebagai kebocoran
 * data pribadi + finansial.
 *
 * Mitigasi berlapis:
 *   1. WAJIB sesi valid. Tanpa login -> 401 (lihat
 *      `lib/modules/savings/kiosk-auth.test.ts`).
 *   2. WAJIB scope lembaga/unit (sama dengan `/api/savings/lookup`).
 *      SUPERADMIN bebas; PIMPINAN -> lembaganya; MANAGER/STAFF ->
 *      unitnya; role lain / tanpa scope -> 403. Tanpa scope ini,
 *      sesi terautentikasi dari lembaga A bisa membaca data
 *      lembaga B (lihat `kiosk-scope.test.ts`).
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: "Login diperlukan untuk lookup tabungan" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q)
    return NextResponse.json(
      { error: "Masukkan nomor santri atau UID kartu" },
      { status: 400 },
    );

  // Scope: konsisten dengan /api/savings/lookup. Tanpa scope, setiap
  // pengguna terautentikasi bisa enumerasi data tabungan lintas lembaga
  // (audit HIGH — info disclosure, lihat `lib/modules/savings/kiosk-auth.test.ts`).
  //   SUPERADMIN      -> semua unit
  //   PIMPINAN        -> hanya Student.lembagaId == session.user.lembagaId
  //   MANAGER / STAFF -> hanya Student.unitId == session.user.unitId
  //   role lain / tanpa scope -> 403 (jangan bocorkan data dengan hasil kosong)
  const role = session.user.role;
  const sessionUnitId = (session.user as any)?.unitId as string | null | undefined;
  const sessionLembagaId = (session.user as any)?.lembagaId as
    | string
    | null
    | undefined;
  let scopeFilter: Record<string, unknown>;
  if (role === "SUPERADMIN") {
    scopeFilter = {};
  } else if (role === "PIMPINAN") {
    if (!sessionLembagaId) {
      return NextResponse.json(
        { error: "Scope lembaga tidak tersedia pada sesi" },
        { status: 403 },
      );
    }
    scopeFilter = { lembagaId: sessionLembagaId };
  } else if (role === "MANAGER" || role === "STAFF") {
    if (!sessionUnitId) {
      return NextResponse.json(
        { error: "Scope unit tidak tersedia pada sesi" },
        { status: 403 },
      );
    }
    scopeFilter = { unitId: sessionUnitId };
  } else {
    return NextResponse.json(
      { error: "Role tidak berwenang mengakses anjungan tabungan" },
      { status: 403 },
    );
  }

  const student = await prisma.student.findFirst({
    where: {
      isActive: true,
      ...scopeFilter,
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
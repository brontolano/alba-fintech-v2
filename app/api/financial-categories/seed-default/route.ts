import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";
import prisma from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  // ── Pemasukan ──
  { name: "SPP Santri", code: "INC-SPP", type: "INCOME" as const },
  { name: "Donasi", code: "INC-DON", type: "INCOME" as const },
  { name: "Hasil Usaha", code: "INC-HUS", type: "INCOME" as const },
  { name: "Bantuan / Hibah", code: "INC-BAN", type: "INCOME" as const },
  { name: "Pendapatan Lain", code: "INC-LAIN", type: "INCOME" as const },
  // ── Pengeluaran ──
  { name: "Gaji Karyawan", code: "EXP-GAJ", type: "EXPENSE" as const },
  { name: "Belanja Operasional", code: "EXP-OPR", type: "EXPENSE" as const },
  { name: "Listrik & Air", code: "EXP-LST", type: "EXPENSE" as const },
  { name: "Konsumsi / Makan", code: "EXP-KON", type: "EXPENSE" as const },
  { name: "Pemeliharaan", code: "EXP-PRH", type: "EXPENSE" as const },
  { name: "Pengeluaran Lain", code: "EXP-LAIN", type: "EXPENSE" as const },
  // ── Transfer ──
  { name: "Transfer Antar Unit", code: "TRF-ANT", type: "TRANSFER" as const },
  { name: "Transfer Kas Pusat", code: "TRF-PST", type: "TRANSFER" as const },
];

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "SUPERADMIN" && role !== "PIMPINAN") {
      return NextResponse.json(
        { error: "Hanya Superadmin dan Pimpinan yang dapat membuat kategori default" },
        { status: 403 },
      );
    }

    const lembagaId = (session.user as any)?.lembagaId;
    if (!lembagaId) {
      return NextResponse.json(
        { error: "Tidak ada lembaga yang terhubung" },
        { status: 400 },
      );
    }

    // Cek apakah sudah ada kategori umum (unitId=null) di lembaga ini
    const existingCount = await prisma.financialCategory.count({
      where: { lembagaId, unitId: null },
    });

    if (existingCount > 0) {
      return NextResponse.json(
        {
          error: "Kategori Umum sudah ada di lembaga ini",
          existing: existingCount,
        },
        { status: 409 },
      );
    }

    // Batch create semua default categories
    const created = await prisma.financialCategory.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        lembagaId,
        unitId: null, // Lembaga-level (Umum)
        isActive: true,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json(
      {
        message: `${created.count} kategori Umum berhasil dibuat`,
        count: created.count,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Seed Categories] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

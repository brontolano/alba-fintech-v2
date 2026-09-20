import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { getServerSession } from "next-auth";

// GET /api/lembaga/default — lembaga default (Pondok Pesantren Al-Basyariyah)
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lembaga = await prisma.lembaga.findFirst({
      where: { code: "AL-BASYARIYAH", isActive: true },
      include: {
        _count: {
          select: { units: true, users: true },
        },
      },
    });

    if (!lembaga) {
      return NextResponse.json(
        { error: "Lembaga default tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: lembaga }, { status: 200 });
  } catch (error) {
    console.error("[Lembaga API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

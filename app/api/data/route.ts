import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";
import prisma from "@/lib/prisma";
import {
  exportDatabase,
  createServerBackup,
  importDatabase,
  resetDatabase,
  seedDemoData,
  installFreshDatabase,
} from "@/lib/data-management";

async function requireSuperadmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  if (session.user.role !== "SUPERADMIN")
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  return { session };
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(await exportDatabase(prisma), {
      headers: {
        "Content-Disposition": `attachment; filename="alba-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("[Data API] export failed", error);
    return NextResponse.json(
      { error: "Gagal mengekspor data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const result =
      body.action === "backup"
        ? await createServerBackup(prisma)
        : body.action === "demo"
          ? await seedDemoData(prisma)
          : body.action === "install"
            ? await installFreshDatabase(prisma)
            : body.action === "reset"
              ? await resetDatabase(prisma)
              : await importDatabase(prisma, body);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[Data API] mutation failed", error);
    return NextResponse.json(
      { error: error?.message || "Operasi data gagal" },
      { status: 400 },
    );
  }
}

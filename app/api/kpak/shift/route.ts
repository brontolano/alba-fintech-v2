import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

// Semua perhitungan hari memakai WIB (UTC+7) sesuai SOP operasional KPAK.
const WIB = 7 * 3600 * 1000;
const wibDateStr = (now = Date.now()) =>
  new Date(now + WIB).toISOString().slice(0, 10);
const dayStart = (s: string) => new Date(`${s}T00:00:00.000Z`);
const wibHM = (now = Date.now()) =>
  new Date(now + WIB).toISOString().slice(11, 16);

const actionSchema = z.object({
  action: z.enum(["check-in", "check-out"]),
  note: z.string().optional(),
});

async function resolveUnitId(session: any, requested?: string | null) {
  const role = session.user.role;
  if (role === "MANAGER" || role === "STAFF") return session.user.unitId;
  if (requested) return requested;
  return session.user.unitId;
}

/** GET: status absensi saya hari ini + kru unit yang bertugas */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const unitId = await resolveUnitId(session, searchParams.get("unitId"));
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const dateStr = searchParams.get("date") || wibDateStr();
  const start = dayStart(dateStr);

  const [mine, crew, attendances] = await Promise.all([
    prisma.shiftAttendance.findUnique({
      where: {
        unitId_userId_date: {
          unitId,
          userId: session.user.id!,
          date: start,
        },
      },
    }),
    prisma.user.findMany({
      where: { unitId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.shiftAttendance.findMany({
      where: { unitId, date: start },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { checkInAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    data: {
      date: dateStr,
      operationalHours: { start: "08:00", end: "16:00", reportDeadline: "17:00" },
      nowWib: wibHM(),
      mine,
      crew: crew.map((u) => ({
        ...u,
        attendance:
          attendances.find((a) => a.userId === u.id) || null,
      })),
    },
  });
}

/** POST: check-in / check-out */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });

  const unitId = await resolveUnitId(session, null);
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const dateStr = wibDateStr();
  const start = dayStart(dateStr);

  try {
    if (parsed.data.action === "check-in") {
      // Selalu bisa check-in ulang meski sudah checkout (shift lanjut)
      const existing = await prisma.shiftAttendance.findUnique({
        where: {
          unitId_userId_date: {
            unitId,
            userId: session.user.id!,
            date: start,
          },
        },
      });
      if (existing && existing.checkOutAt) {
        const row = await prisma.shiftAttendance.update({
          where: { id: existing.id },
          data: { checkOutAt: null },
        });
        return NextResponse.json({ data: row });
      }
      const late = wibHM() > "08:00";
      const row = await prisma.shiftAttendance.create({
        data: {
          unitId,
          userId: session.user.id!,
          date: start,
          checkInAt: new Date(),
          late,
          note: parsed.data.note?.trim() || undefined,
        },
      });
      return NextResponse.json({ data: row }, { status: 201 });
    }

    const existing = await prisma.shiftAttendance.findUnique({
      where: {
        unitId_userId_date: {
          unitId,
          userId: session.user.id!,
          date: start,
        },
      },
    });
    if (!existing)
      return NextResponse.json(
        { error: "Belum check-in hari ini" },
        { status: 400 },
      );
    if (existing.checkOutAt)
      return NextResponse.json(
        { error: "Sudah check-out hari ini" },
        { status: 400 },
      );
    const row = await prisma.shiftAttendance.update({
      where: { id: existing.id },
      data: { checkOutAt: new Date() },
    });
    return NextResponse.json({ data: row });
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "Sudah check-in hari ini" },
        { status: 409 },
      );
    return NextResponse.json({ error: "Gagal mencatat absensi" }, { status: 500 });
  }
}

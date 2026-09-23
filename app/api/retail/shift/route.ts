import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

// WIB (UTC+7) agar konsisten dgn modul lain.
const WIB = 7 * 3600 * 1000;
const wibDateStr = (now = Date.now()) =>
  new Date(now + WIB).toISOString().slice(0, 10);
const dayStart = (s: string) => new Date(`${s}T00:00:00.000Z`);
const wibHM = (now = Date.now()) =>
  new Date(now + WIB).toISOString().slice(11, 16);

const actionSchema = z.object({
  action: z.enum(["check-in", "check-out", "set-service"]),
  service: z.enum(["POS", "INVENTORY"]).optional(),
  note: z.string().optional(),
});

/** MANAGER/STAFF memakai unit mereka sendiri; role atas via query. */
async function resolveUnitId(session: any, requested?: string | null) {
  const role = session.user.role;
  if (role === "MANAGER" || role === "STAFF") return session.user.unitId;
  return requested || session.user.unitId || null;
}

/** Guard: MANAGER/STAFF wajib unit retail; SUPERADMIN/PIMPINAN boleh pantau. */
function guardRetail(session: any) {
  const role = session?.user?.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role))
    return false;
  if (role === "MANAGER" || role === "STAFF") {
    return session.user.unitIsRetail === true;
  }
  return true;
}

/** GET: status shift saya hari ini + kru unit + log 14 hari + jam WIB. */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const unitId = await resolveUnitId(session, searchParams.get("unitId"));
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const dateStr = searchParams.get("date") || wibDateStr();
  const start = dayStart(dateStr);

  // ?history=1: log shift saya 14 hari + durasi + transaksi POS
  if (searchParams.get("history") === "1") {
    const rows = await prisma.shiftAttendance.findMany({
      where: { unitId, userId: session.user.id! },
      orderBy: { date: "desc" },
      take: 14,
    });
    const history = await Promise.all(
      rows.map(async (r) => {
        const d = new Date(r.date).toISOString().slice(0, 10);
        const ds = new Date(`${d}T00:00:00.000Z`);
        const de = new Date(`${d}T23:59:59.999Z`);
        const txCount = await prisma.transaction.count({
          where: {
            unitId,
            createdById: session.user.id!,
            date: { gte: ds, lte: de },
            status: { not: "REJECTED" },
          },
        });
        const end = r.checkOutAt ? new Date(r.checkOutAt).getTime() : null;
        return {
          id: r.id,
          date: d,
          service: r.service,
          checkInAt: r.checkInAt,
          checkOutAt: r.checkOutAt,
          durationMin:
            end != null
              ? Math.max(0, Math.round((end - new Date(r.checkInAt).getTime()) / 60000))
              : null,
          txCount,
        };
      }),
    );
    return NextResponse.json({ data: { history } });
  }

  const [mine, crew, attendances, myTxToday] = await Promise.all([
    prisma.shiftAttendance.findUnique({
      where: {
        unitId_userId_date: { unitId, userId: session.user.id!, date: start },
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
    prisma.transaction.count({
      where: {
        unitId,
        createdById: session.user.id!,
        date: { gte: start, lte: new Date(`${dateStr}T23:59:59.999Z`) },
        status: { not: "REJECTED" },
      },
    }),
  ]);

  return NextResponse.json({
    data: {
      date: dateStr,
      nowWib: wibHM(),
      mine,
      myTxToday,
      crew: crew.map((u) => ({
        ...u,
        attendance: attendances.find((a) => a.userId === u.id) || null,
      })),
    },
  });
}

/** POST: check-in / check-out / set-service shift retail. */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });

  const unitId = await resolveUnitId(session, null);
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const dateStr = wibDateStr();
  const start = dayStart(dateStr);

  const getExisting = () =>
    prisma.shiftAttendance.findUnique({
      where: {
        unitId_userId_date: {
          unitId,
          userId: session.user.id!,
          date: start,
        },
      },
    });

  try {
    if (parsed.data.action === "check-in") {
      const existing = await getExisting();
      if (existing && existing.checkOutAt) {
        const row = await prisma.shiftAttendance.update({
          where: { id: existing.id },
          data: {
            checkOutAt: null,
            service: parsed.data.service ?? existing.service,
          },
        });
        return NextResponse.json({ data: row });
      }
      if (existing) {
        const row = await prisma.shiftAttendance.update({
          where: { id: existing.id },
          data: { service: parsed.data.service ?? existing.service },
        });
        return NextResponse.json({ data: row });
      }
      const row = await prisma.shiftAttendance.create({
        data: {
          unitId,
          userId: session.user.id!,
          date: start,
          checkInAt: new Date(),
          service: parsed.data.service,
          note: parsed.data.note?.trim() || undefined,
        },
      });
      return NextResponse.json({ data: row }, { status: 201 });
    }

    if (parsed.data.action === "set-service") {
      if (!parsed.data.service)
        return NextResponse.json(
          { error: "Layanan wajib diisi (POS/INVENTORY)" },
          { status: 400 },
        );
      const existing = await getExisting();
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
        data: { service: parsed.data.service },
      });
      return NextResponse.json({ data: row });
    }

    const existing = await getExisting();
    if (!existing)
      return NextResponse.json({ error: "Belum check-in hari ini" }, { status: 400 });
    if (existing.checkOutAt)
      return NextResponse.json({ error: "Sudah check-out hari ini" }, { status: 400 });
    const row = await prisma.shiftAttendance.update({
      where: { id: existing.id },
      data: { checkOutAt: new Date() },
    });
    return NextResponse.json({ data: row });
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json({ error: "Sudah check-in hari ini" }, { status: 409 });
    return NextResponse.json({ error: "Gagal mencatat shift retail" }, { status: 500 });
  }
}
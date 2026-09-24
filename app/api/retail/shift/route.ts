import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { findOpenPosSession, autoClosePosSession } from "../pos-session/route";

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
  force: z.boolean().optional(),
  reason: z.string().max(500).optional(),
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
      // Multi-session: tolak bila masih ada segmen terbuka.
      const openSegment = await prisma.shiftSession.findFirst({
        where: { unitId, userId: session.user.id!, checkOutAt: null },
        select: { id: true },
      });
      if (openSegment) {
        return NextResponse.json(
          { error: "Masih ada sesi shift terbuka. Check-out dulu." },
          { status: 409 },
        );
      }
      const now = new Date();
      await prisma.shiftSession.create({
        data: {
          unitId,
          userId: session.user.id!,
          date: start,
          checkInAt: now,
          service: parsed.data.service,
          note: parsed.data.note?.trim() || undefined,
        },
      });
      // Catatan harian (kompatibilitas baca): satu baris per hari, dibuka ulang.
      const existing = await getExisting();
      let row;
      if (existing) {
        row = await prisma.shiftAttendance.update({
          where: { id: existing.id },
          data: {
            checkOutAt: null,
            service: parsed.data.service ?? existing.service,
          },
        });
      } else {
        row = await prisma.shiftAttendance.create({
          data: {
            unitId,
            userId: session.user.id!,
            date: start,
            checkInAt: now,
            service: parsed.data.service,
            note: parsed.data.note?.trim() || undefined,
          },
        });
      }
      return NextResponse.json({ data: row }, { status: 201 });
    }

    if (parsed.data.action === "set-service") {
      if (!parsed.data.service)
        return NextResponse.json(
          { error: "Layanan wajib diisi (POS/INVENTORY)" },
          { status: 400 },
        );
      const segment = await prisma.shiftSession.findFirst({
        where: { unitId, userId: session.user.id!, checkOutAt: null },
        orderBy: { checkInAt: "desc" },
      });
      const existing = await getExisting();
      if (!segment && (!existing || existing.checkOutAt))
        return NextResponse.json(
          { error: "Belum check-in hari ini" },
          { status: 400 },
        );
      if (segment) {
        await prisma.shiftSession.update({
          where: { id: segment.id },
          data: { service: parsed.data.service },
        });
      }
      let row = existing;
      if (existing && !existing.checkOutAt) {
        row = await prisma.shiftAttendance.update({
          where: { id: existing.id },
          data: { service: parsed.data.service },
        });
      }
      return NextResponse.json({ data: row });
    }

    // ---- check-out: tutup segmen berjalan (R4: tolak bila POS masih terbuka) ----
    const segment = await prisma.shiftSession.findFirst({
      where: { unitId, userId: session.user.id!, checkOutAt: null },
      orderBy: { checkInAt: "desc" },
    });
    const existing = await getExisting();
    if (!segment && (!existing || existing.checkOutAt))
      return NextResponse.json({ error: "Belum check-in hari ini" }, { status: 400 });

    const openPos = await findOpenPosSession(unitId, session.user.id!);
    let autoClosedPos: string | null = null;
    if (openPos) {
      if (!parsed.data.force) {
        return NextResponse.json(
          {
            error:
              "POS_MASIH_TERBUKA: tutup sesi POS (rekonsiliasi) dulu sebelum check-out",
            posSessionId: openPos.id,
          },
          { status: 409 },
        );
      }
      // R5: mitigasi otomatis — auto-close tercatat + notifikasi ke manager.
      const reason = parsed.data.reason?.trim() || "check-out paksa tanpa alasan";
      const staffName = (session.user as any)?.name || "Staff";
      const closed = await autoClosePosSession(
        {
          id: openPos.id,
          unitId: openPos.unitId,
          userId: openPos.userId,
          openedAt: openPos.openedAt,
          openingCash: openPos.openingCash,
        },
        `check-out paksa oleh ${staffName}: ${reason}`,
      );
      autoClosedPos = closed.row.id;
      const managers = await prisma.user.findMany({
        where: { unitId, role: "MANAGER", isActive: true },
        select: { id: true },
      });
      if (managers.length > 0) {
        await prisma.notification.createMany({
          data: managers.map((m) => ({
            userId: m.id,
            title: "POS di-auto-close saat check-out paksa",
            message:
              `${staffName} check-out paksa. Sesi POS ${closed.row.id} ` +
              `ditutup otomatis (selisih tercatat 0). Alasan: ${reason}`,
            type: "WARNING",
          })),
        });
      }
    }

    const now = new Date();
    if (segment) {
      await prisma.shiftSession.update({
        where: { id: segment.id },
        data: { checkOutAt: now },
      });
    }
    let row = existing;
    if (existing && !existing.checkOutAt) {
      row = await prisma.shiftAttendance.update({
        where: { id: existing.id },
        data: { checkOutAt: now },
      });
    }
    const basis = segment?.checkInAt ?? existing?.checkInAt;
    const durationMin = basis
      ? Math.max(0, Math.round((now.getTime() - new Date(basis).getTime()) / 60000))
      : null;
    return NextResponse.json({ data: { ...row, durationMin, autoClosedPos } });
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json({ error: "Sudah check-in hari ini" }, { status: 409 });
    return NextResponse.json({ error: "Gagal mencatat shift retail" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

// WIB (UTC+7) — konsisten dengan modul shift retail.
const WIB = 7 * 3600 * 1000;
const wibDateStr = (now = Date.now()) =>
  new Date(now + WIB).toISOString().slice(0, 10);
const dayStart = (s: string) => new Date(`${s}T00:00:00.000Z`);

// Transaksi tunai = paymentMethod kosong atau CASH (samakan dgn modul rekonsiliasi).
const isCashMethod = (m: unknown) =>
  !m || String(m).toUpperCase() === "CASH";

const openSchema = z.object({
  action: z.literal("open"),
  openingCash: z.number().positive("Modal awal harus lebih dari 0"),
});

const closeSchema = z.object({
  action: z.literal("close"),
  countedCash: z.number().min(0, "Hasil hitung kas tidak boleh negatif"),
  closeNote: z.string().max(500).optional(),
});

/** Cek user sedang check-in: segmen shift_sessions terbuka ATAU ShiftAttendance aktif hari ini. */
async function isCheckedIn(unitId: string, userId: string) {
  const [segmen, legacy] = await Promise.all([
    prisma.shiftSession.findFirst({
      where: { unitId, userId, checkOutAt: null },
      select: { id: true },
    }),
    prisma.shiftAttendance.findFirst({
      where: {
        unitId,
        userId,
        date: dayStart(wibDateStr()),
        checkOutAt: null,
      },
      select: { id: true },
    }),
  ]);
  return !!(segmen || legacy);
}

/** Hitung ekspektasi kas sesi: modal + INCOME tunai − EXPENSE tunai. */
async function summarizeSession(
  sessionId: string,
  unitId: string,
  ownerId: string,
  openedAt: Date,
  openingCash: number,
) {
  const txs = await prisma.transaction.findMany({
    where: {
      unitId,
      status: { not: "REJECTED" },
      OR: [
        { posSessionId: sessionId },
        {
          posSessionId: null,
          createdById: ownerId,
          createdAt: { gte: openedAt },
        },
      ],
    },
    select: { type: true, amount: true, paymentMethod: true },
  });
  let incomeCash = 0;
  let expenseCash = 0;
  for (const t of txs) {
    if (!isCashMethod(t.paymentMethod)) continue;
    const amt = Number(t.amount);
    if (t.type === "INCOME") incomeCash += amt;
    else if (t.type === "EXPENSE") expenseCash += amt;
  }
  const expectedCash =
    Math.round((openingCash + incomeCash - expenseCash) * 100) / 100;
  return { txCount: txs.length, txTotal: incomeCash, expectedCash };
}

/**
 * GET /api/retail/pos-session?unitId=
 * Status sesi POS: sesi terbuka milik saya + daftar sesi hari ini di unit.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!guardRetail(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const unitId = await resolveUnitId(session, searchParams.get("unitId"));
  if (!unitId) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });
  }

  const [mine, today] = await Promise.all([
    prisma.posSession.findFirst({
      where: { unitId, userId: session.user.id!, closedAt: null },
      orderBy: { openedAt: "desc" },
    }),
    prisma.posSession.findMany({
      where: { unitId, date: dayStart(wibDateStr()) },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { openedAt: "desc" },
      take: 20,
    }),
  ]);

  let live: null | {
    id: string;
    openedAt: Date;
    openingCash: number;
    expectedCash: number;
    txCount: number;
    txTotal: number;
  } = null;
  if (mine) {
    const s = await summarizeSession(
      mine.id,
      unitId,
      mine.userId,
      mine.openedAt,
      Number(mine.openingCash),
    );
    live = {
      id: mine.id,
      openedAt: mine.openedAt,
      openingCash: Number(mine.openingCash),
      expectedCash: s.expectedCash,
      txCount: s.txCount,
      txTotal: s.txTotal,
    };
  }

  return NextResponse.json({
    data: {
      open: live,
      today: today.map((p) => ({
        id: p.id,
        userId: p.userId,
        userName: p.user?.name ?? "-",
        openedAt: p.openedAt,
        openingCash: Number(p.openingCash),
        closedAt: p.closedAt,
        expectedCash: p.expectedCash == null ? null : Number(p.expectedCash),
        countedCash: p.countedCash == null ? null : Number(p.countedCash),
        discrepancy: p.discrepancy == null ? null : Number(p.discrepancy),
        autoClosed: p.autoClosed,
      })),
    },
  });
}

/**
 * POST /api/retail/pos-session
 * { action: "open", openingCash } — wajib check-in & belum ada sesi terbuka.
 * { action: "close", countedCash, closeNote? } — rekonsiliasi, simpan selisih.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!guardRetail(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.user.role === "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const unitId = await resolveUnitId(session, null);
  if (!unitId) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });
  }
  const userId = session.user.id!;

  const action = (body as any)?.action;
  if (action === "open") {
    const parsed = openSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 },
      );
    }
    if (!(await isCheckedIn(unitId, userId))) {
      return NextResponse.json(
        { error: "BELUM_CHECKIN: check-in shift dulu sebelum buka POS" },
        { status: 409 },
      );
    }
    const existing = await prisma.posSession.findFirst({
      where: { unitId, userId, closedAt: null },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "POS_SUDAH_TERBUKA", posSessionId: existing.id },
        { status: 409 },
      );
    }
    const row = await prisma.posSession.create({
      data: {
        unitId,
        userId,
        date: dayStart(wibDateStr()),
        openedAt: new Date(),
        openingCash: parsed.data.openingCash,
      },
    });
    return NextResponse.json(
      {
        data: {
          id: row.id,
          openedAt: row.openedAt,
          openingCash: Number(row.openingCash),
        },
      },
      { status: 201 },
    );
  }

  if (action === "close") {
    const parsed = closeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 },
      );
    }
    const open = await prisma.posSession.findFirst({
      where: { unitId, userId, closedAt: null },
      orderBy: { openedAt: "desc" },
    });
    if (!open) {
      return NextResponse.json(
        { error: "Tidak ada sesi POS yang terbuka" },
        { status: 404 },
      );
    }
    const s = await summarizeSession(
      open.id,
      unitId,
      open.userId,
      open.openedAt,
      Number(open.openingCash),
    );
    const counted = parsed.data.countedCash;
    const discrepancy = Math.round((counted - s.expectedCash) * 100) / 100;
    const row = await prisma.posSession.update({
      where: { id: open.id },
      data: {
        closedAt: new Date(),
        expectedCash: s.expectedCash,
        countedCash: counted,
        discrepancy,
        closeNote: parsed.data.closeNote?.trim() || undefined,
      },
    });
    return NextResponse.json({
      data: {
        id: row.id,
        closedAt: row.closedAt,
        openingCash: Number(open.openingCash),
        expectedCash: s.expectedCash,
        countedCash: counted,
        discrepancy,
        txCount: s.txCount,
        txTotal: s.txTotal,
      },
    });
  }

  return NextResponse.json(
    { error: "action tidak dikenal (open|close)" },
    { status: 400 },
  );
}

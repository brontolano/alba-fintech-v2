import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";

const WIB = 7 * 3600 * 1000;
const wibToday = () => new Date(Date.now() + WIB).toISOString().slice(0, 10);

type PeriodType = "DAILY" | "WEEKLY" | "MONTHLY" | "AGENDA";

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
  };
}

function weekBounds(week: string) {
  const m = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!m) return null;
  const jan4 = new Date(Date.UTC(Number(m[1]), 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (Number(m[2]) - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function dayBounds(date: string) {
  return {
    start: new Date(`${date}T00:00:00.000Z`),
    end: new Date(`${date}T23:59:59.999Z`),
  };
}

const createSchema = z.object({
  categoryId: z.string().min(1),
  periodType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "AGENDA"]),
  // DAILY: date YYYY-MM-DD · WEEKLY: week YYYY-Www · MONTHLY: month YYYY-MM
  date: z.string().optional(),
  week: z.string().optional(),
  month: z.string().optional(),
  // AGENDA: judul + rentang bebas
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  amount: z.number().positive(),
  note: z.string().optional(),
  unitId: z.string().optional(),
  // Sumber dana: KPAK (kas unit) atau LEMBAGA (kas lembaga). Dipilih pimpinan.
  source: z.enum(["KPAK", "LEMBAGA"]).optional(),
});

function resolveRange(
  t: PeriodType,
  input: z.infer<typeof createSchema>,
): { key: string; title: string | null; start: Date; end: Date } | { error: string } {
  if (t === "DAILY") {
    const d = input.date || wibToday();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: "Tanggal tidak valid" };
    const { start, end } = dayBounds(d);
    return { key: `D${d}`, title: null, start, end };
  }
  if (t === "WEEKLY") {
    const w = input.week;
    if (!w || !weekBounds(w)) return { error: "Minggu tidak valid (YYYY-Www)" };
    const { start, end } = weekBounds(w)!;
    return { key: `W${w}`, title: null, start, end };
  }
  if (t === "MONTHLY") {
    const mo = input.month || wibToday().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mo)) return { error: "Bulan tidak valid" };
    const { start, end } = monthBounds(mo);
    return { key: `M${mo}`, title: null, start, end };
  }
  // AGENDA
  if (!input.title?.trim() || !input.startDate || !input.endDate)
    return { error: "Agenda butuh judul + tanggal mulai & selesai" };
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  end.setHours(23, 59, 59, 999);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start)
    return { error: "Rentang agenda tidak valid" };
  return {
    key: `A${Date.now()}`,
    title: input.title.trim(),
    start,
    end,
  };
}

/** GET ?from=YYYY-MM-DD&to=YYYY-MM-DD (default bulan berjalan): alokasi yg
 *  beririsan + realisasi (EXPENSE APPROVED) dalam rentang masing-masing */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let unitId = session.user.unitId;
  if (
    (role === "PIMPINAN" || role === "SUPERADMIN") &&
    searchParams.get("unitId")
  )
    unitId = searchParams.get("unitId");
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const month = wibToday().slice(0, 7);
  const from = searchParams.get("from") || `${month}-01`;
  const to = searchParams.get("to") || monthBounds(month).end.toISOString().slice(0, 10);
  const fromD = new Date(`${from}T00:00:00.000Z`);
  const toD = new Date(`${to}T23:59:59.999Z`);

  const allocations = await prisma.budgetAllocation.findMany({
    where: { unitId, isActive: true },
    include: {
      category: { select: { id: true, name: true, code: true, type: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Saring yang beririsan dengan rentang lihat + hitung realisasi
  const result = [];
  for (const a of allocations) {
    let start = a.startDate;
    let end = a.endDate;
    if (!start || !end) {
      // legacy MONTHLY (period YYYY-MM)
      const m = /^M?(\d{4}-\d{2})$/.exec(a.period || "");
      if (!m) continue;
      const b = monthBounds(m[1]);
      start = b.start;
      end = b.end;
    }
    if (end < fromD || start > toD) continue;
    const txs = await prisma.transaction.aggregate({
      where: {
        unitId,
        categoryId: a.categoryId,
        type: "EXPENSE",
        status: "APPROVED",
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });
    const used = Number(txs._sum.amount || 0);
    result.push({
      ...a,
      amount: a.amount,
      used,
      remaining: Number(a.amount) - used,
      rangeStart: start,
      rangeEnd: end,
    });
  }

  return NextResponse.json({ data: { from, to, allocations: result } });
}

/** POST: pimpinan tetapkan alokasi (upsert per unit+kategori+kunci periode) */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Data alokasi tidak valid" }, { status: 400 });

  const unitId = parsed.data.unitId || session.user.unitId;
  if (!unitId)
    return NextResponse.json({ error: "unitId wajib" }, { status: 400 });

  if (role === "PIMPINAN") {
    const target = await prisma.unit.findFirst({
      where: { id: unitId, lembagaId: session.user.lembagaId },
      select: { id: true },
    });
    if (!target)
      return NextResponse.json(
        { error: "Unit di luar lembaga Anda" },
        { status: 403 },
      );
  }

  const category = await prisma.financialCategory.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category || category.type !== "EXPENSE")
    return NextResponse.json(
      { error: "Kategori harus pengeluaran" },
      { status: 400 },
    );

  const resolved = resolveRange(parsed.data.periodType, parsed.data);
  if ("error" in resolved)
    return NextResponse.json({ error: resolved.error }, { status: 400 });

  const row = await prisma.budgetAllocation.upsert({
    where: {
      unitId_categoryId_period: {
        unitId,
        categoryId: parsed.data.categoryId,
        period: resolved.key,
      },
    },
    update: {
      amount: parsed.data.amount,
      title: resolved.title,
      startDate: resolved.start,
      endDate: resolved.end,
      note: parsed.data.note?.trim() || null,
      source: parsed.data.source || "KPAK",
      isActive: true,
    },
    create: {
      unitId,
      categoryId: parsed.data.categoryId,
      periodType: parsed.data.periodType,
      period: resolved.key,
      title: resolved.title,
      startDate: resolved.start,
      endDate: resolved.end,
      amount: parsed.data.amount,
      note: parsed.data.note?.trim() || null,
      source: parsed.data.source || "KPAK",
      createdById: session.user.id!,
    },
  });
  return NextResponse.json({ data: row }, { status: 201 });
}

/** DELETE ?id=: pimpinan hapus alokasi yang salah */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role || "";
  if (!["SUPERADMIN", "PIMPINAN"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  const existing = await prisma.budgetAllocation.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (role === "PIMPINAN") {
    const target = await prisma.unit.findFirst({
      where: { id: existing.unitId, lembagaId: session.user.lembagaId },
      select: { id: true },
    });
    if (!target)
      return NextResponse.json({ error: "Di luar lembaga Anda" }, { status: 403 });
  }
  await prisma.budgetAllocation.delete({ where: { id } });
  return NextResponse.json({ message: "Alokasi dihapus" });
}

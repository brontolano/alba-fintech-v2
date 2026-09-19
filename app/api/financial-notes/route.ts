import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { getServerSession } from "next-auth";
import { z } from "zod";

// Schema for creating financial notes
const createFinancialNoteSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  description: z.string().optional(),
  amount: z.number().positive("Jumlah harus positif"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  date: z
    .string()
    .transform((str) => new Date(str))
    .refine((d) => !isNaN(d.getTime()), {
      message: "Tanggal tidak valid",
    }),
  unitId: z.string().optional(),
  categoryId: z.string().optional(),
});

// Schema for query parameters
const querySchema = z.object({
  unitId: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isReconciled: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC
    const role = (session.user as any)?.role;
    if (role !== "PIMPINAN" && role !== "MANAGER" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.errors },
        { status: 400 },
      );
    }

    // Build where clause
    const where: any = {};
    const unitId = (session.user as any)?.unitId;
    const lembagaId = (session.user as any)?.lembagaId;

    // Scope by role. Superadmin can see everything; Pimpinan sees lembaga-wide notes
    // including unit-level records and notes intentionally not attached to a unit.
    if (role === "PIMPINAN") {
      if (!lembagaId) {
        return NextResponse.json(
          { error: "Pimpinan tidak memiliki lembaga" },
          { status: 403 },
        );
      }
      where.OR = [{ units: { lembagaId: lembagaId } }, { unitId: null }];
    } else if (role === "MANAGER") {
      if (!unitId) {
        return NextResponse.json(
          { error: "Manager tidak memiliki unit" },
          { status: 400 },
        );
      }
      where.unitId = unitId;
    }

    // A requested unit may only narrow the user's existing scope.
    if (parsed.data.unitId && role !== "MANAGER") {
      if (role === "PIMPINAN") {
        const targetUnit = await prisma.unit.findFirst({
          where: { id: parsed.data.unitId, lembagaId },
          select: { id: true },
        });
        if (!targetUnit) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      delete where.OR;
      where.unitId = parsed.data.unitId;
    }
    if (parsed.data.type) {
      where.type = parsed.data.type;
    }
    // Filter by reconciliation status (isReconciled is already transformed to boolean)
    if (parsed.data.isReconciled !== undefined) {
      where.isReconciled = parsed.data.isReconciled;
    }
    if (parsed.data.startDate || parsed.data.endDate) {
      const dateFilter: any = {};
      if (parsed.data.startDate)
        dateFilter.gte = new Date(parsed.data.startDate);
      if (parsed.data.endDate) dateFilter.lte = new Date(parsed.data.endDate);
      where.date = dateFilter;
    }
    // Text search on title and description (combine with role-based OR using AND)
    // (mode 'insensitive' tidak didukung konektor MySQL)
    if (parsed.data.search) {
      const searchCondition = {
        OR: [
          { title: { contains: parsed.data.search } },
          { description: { contains: parsed.data.search } },
        ],
      };
      if (where.OR) {
        // Merge role-based OR with search OR using AND
        where.AND = [{ OR: where.OR }, searchCondition];
        delete where.OR;
      } else {
        where.OR = searchCondition.OR;
      }
    }

    // Fetch notes with pagination
    const notes = await prisma.financialNote.findMany({
      where,
      include: {
        units: true,
        financial_categories: true,
        users_financial_notes_createdByIdTousers: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        date: "desc",
      },
      skip: (parsed.data.page - 1) * parsed.data.limit,
      take: parsed.data.limit,
    });

    // Get summary
    const total = await prisma.financialNote.count({ where });
    const totalIncome = await prisma.financialNote.aggregate({
      where: { ...where, type: "INCOME" },
      _sum: { amount: true },
    });
    const totalExpense = await prisma.financialNote.aggregate({
      where: { ...where, type: "EXPENSE" },
      _sum: { amount: true },
    });

    return NextResponse.json(
      {
        data: notes,
        summary: {
          total,
          totalIncome: Number(totalIncome._sum.amount) || 0,
          totalExpense: Number(totalExpense._sum.amount) || 0,
          pages: Math.ceil(total / parsed.data.limit),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Financial Notes API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC
    const role = (session.user as any)?.role;
    if (role !== "PIMPINAN" && role !== "MANAGER" && role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = createFinancialNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.errors },
        { status: 400 },
      );
    }

    // Determine unit
    let unitId = parsed.data.unitId;
    if (role === "MANAGER") {
      unitId = (session.user as any)?.unitId;
      if (!unitId) {
        return NextResponse.json(
          { error: "Manager tidak memiliki unit" },
          { status: 400 },
        );
      }
    } else if (role === "PIMPINAN" && unitId) {
      if (!(session.user as any)?.lembagaId) {
        return NextResponse.json(
          { error: "Pimpinan tidak memiliki lembaga" },
          { status: 403 },
        );
      }
      const targetUnit = await prisma.unit.findFirst({
        where: { id: unitId, lembagaId: (session.user as any)?.lembagaId },
        select: { id: true },
      });
      if (!targetUnit) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Create note
    const note = await prisma.financialNote.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || "",
        amount: parsed.data.amount,
        type: parsed.data.type,
        date: parsed.data.date,
        unitId: unitId,
        categoryId: parsed.data.categoryId,
        createdById: (session.user as any)?.id,
      },
      include: {
        units: true,
        financial_categories: true,
      },
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error("[Financial Notes API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

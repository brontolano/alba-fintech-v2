import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema for creating units
const createUnitSchema = z.object({
  name: z.string().min(1, 'Nama unit wajib diisi'),
  code: z.string().min(1, 'Kode unit wajib diisi'),
  description: z.string().optional(),
  isRetail: z.boolean().default(false),
  type: z.enum(['KPAK', 'KOPERASI', 'KANTIN', 'UMUM']).default('UMUM'),
  lembagaId: z.string().optional(),
  parentId: z.string().optional(),
});

// Schema for query parameters
const querySchema = z.object({
  lembagaId: z.string().optional(),
  isRetail: z.string().optional(),
  isActive: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }

    // Build where clause
    const where: any = { isActive: true };
    
    if (parsed.data.lembagaId) {
      where.lembagaId = parsed.data.lembagaId;
    }
    if (parsed.data.isRetail !== undefined) {
      where.isRetail = parsed.data.isRetail === 'true';
    }
    if (parsed.data.isActive !== undefined) {
      where.isActive = parsed.data.isActive === 'true';
    }

    // Fetch units
    const units = await prisma.unit.findMany({
      where,
      include: {
        lembaga: true,
        parent: true,
        _count: {
          select: {
            users: true,
            transactions: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      skip: (parsed.data.page - 1) * parsed.data.limit,
      take: parsed.data.limit,
    });

    const total = await prisma.unit.count({ where });

    return NextResponse.json({
      data: units,
      summary: {
        total,
        pages: Math.ceil(total / parsed.data.limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Units API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = session.user.role;
    if (role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden - Only SuperAdmin can create units' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = createUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Create unit
    const unit = await prisma.unit.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description,
        isRetail: parsed.data.isRetail,
        type: parsed.data.type,
        lembagaId: parsed.data.lembagaId,
        parentId: parsed.data.parentId,
      },
      include: {
        lembaga: true,
        parent: true,
      },
    });

    return NextResponse.json({ data: unit }, { status: 201 });
  } catch (error: any) {
    console.error('[Units API] Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Kode unit sudah digunakan' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

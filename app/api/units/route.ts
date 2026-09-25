import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';


// Schema for creating units
const createUnitSchema = z.object({
  name: z.string().min(1, 'Nama unit wajib diisi'),
  code: z.string().optional(),
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

    // RBAC - all roles can read units, but filter by scope
    const role = session.user.role as string;

    // Parse query
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }

    // Build where clause
    const where: any = { isActive: true };
    
    // Role-based filtering - STAFF and MANAGER see only their unit
    if (role === 'MANAGER' || role === 'STAFF') {
      where.id = session.user.unitId;
    } else if (role === 'PIMPINAN') {
      where.lembagaId = session.user.lembagaId;
    } else if (role === 'SUPERADMIN') {
      // SUPERADMIN sees all units
      if (parsed.data.lembagaId) {
        where.lembagaId = parsed.data.lembagaId;
      }
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

function generateUnitCode(name: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'unit';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${slug}-${suffix}`;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC - only SuperAdmin or Pimpinan can create units
    const role = session.user.role as string;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json(
        { error: 'Forbidden - Only SuperAdmin or Pimpinan can create units' },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    const parsed = createUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    let code = parsed.data.code;
    let lembagaId = parsed.data.lembagaId;

    if (role === 'PIMPINAN') {
      // Pimpinan only manages units within their own lembaga
      lembagaId = session.user.lembagaId ?? lembagaId;
      if (!code) {
        code = generateUnitCode(parsed.data.name);
      }
    } else if (!code) {
      return NextResponse.json({ error: 'Kode unit wajib diisi' }, { status: 400 });
    }

    // Retry auto-generated codes on unique collision
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const unit = await prisma.unit.create({
          data: {
            name: parsed.data.name,
            code,
            description: parsed.data.description,
            isRetail: parsed.data.isRetail,
            type: parsed.data.type,
            lembagaId,
            parentId: parsed.data.parentId,
          },
          include: {
            lembaga: true,
          },
        });

        return NextResponse.json({ data: unit }, { status: 201 });
      } catch (error: any) {
        if (error.code === 'P2002' && !parsed.data.code) {
          code = generateUnitCode(parsed.data.name);
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({ error: 'Kode unit tidak unik, coba lagi' }, { status: 409 });
  } catch (error: any) {
    console.error('[Units API] Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Kode unit sudah digunakan' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
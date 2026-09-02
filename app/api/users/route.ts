import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Schema for creating users
const createUserSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  name: z.string().min(1, 'Nama wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF']),
  unitId: z.string().optional(),
  lembagaId: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Schema for query parameters
const querySchema = z.object({
  role: z.enum(['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF']).optional(),
  unitId: z.string().optional(),
  lembagaId: z.string().optional(),
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

    // RBAC
    const role = (session.user as any)?.role;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }

    // Build where clause
    const where: any = {};
    const unitId = (session.user as any)?.unitId;
    const lembagaId = (session.user as any)?.lembagaId;

    if (parsed.data.role) {
      where.role = parsed.data.role;
    }
    if (parsed.data.unitId) {
      where.unitId = parsed.data.unitId;
    }
    if (parsed.data.isActive !== undefined) {
      where.isActive = parsed.data.isActive === 'true';
    }

    // Role-based filtering
    if (role === 'PIMPINAN') {
      where.lembagaId = lembagaId;
    } else if (role === 'MANAGER') {
      where.unitId = unitId;
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (parsed.data.page - 1) * parsed.data.limit,
      take: parsed.data.limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        unitId: true,
        lembagaId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Fetch related unit and lembaga separately
    const formattedUsers = await Promise.all(
      users.map(async (user) => {
        const [unit, lembaga] = await Promise.all([
          user.unitId ? prisma.unit.findUnique({
            where: { id: user.unitId },
            select: { id: true, name: true, code: true }
          }) : null,
          user.lembagaId ? prisma.lembaga.findUnique({
            where: { id: user.lembagaId },
            select: { id: true, name: true, code: true }
          }) : null
        ]);

        return {
          ...user,
          unit,
          lembaga,
        };
      })
    );

    const total = await prisma.user.count({ where });

    return NextResponse.json({
      data: formattedUsers,
      summary: {
        total,
        pages: Math.ceil(total / parsed.data.limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Users API] Error:', error);
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
    const role = (session.user as any)?.role;
    if (role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden - Only SuperAdmin can create users' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash: hashedPassword,
        role: parsed.data.role,
        unitId: parsed.data.unitId,
        lembagaId: parsed.data.lembagaId,
        isActive: parsed.data.isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        unitId: true,
        lembagaId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error: any) {
    console.error('[Users API] Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

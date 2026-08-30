import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';

// Validation schemas
const createUnitSchema = z.object({
  name: z.string().min(1, 'Nama unit wajib diisi').max(100),
  code: z.string().min(1, 'Kode unit wajib diisi').max(20).toUpperCase(),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  lembagaId: z.string().optional(),
  parentId: z.string().optional(),
  isRetail: z.boolean().optional().default(false),
});

const updateUnitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(20).toUpperCase().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  lembagaId: z.string().optional(),
  parentId: z.string().optional().nullable(),
  isRetail: z.boolean().optional(),
});

// GET /api/units
// List units. Superadmin: full info + counts. Others: basic info (active only).
export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const role = session.user.role;
    const url = new URL(request.url);
    const lembagaFilter = url.searchParams.get('lembagaId');
    let units;
    let whereClause: any = {};

    if (role === 'SUPERADMIN') {
      if (lembagaFilter) whereClause.lembagaId = lembagaFilter;
      units = await prisma.unit.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          isActive: true,
          lembagaId: true,
          isRetail: true,
          parentId: true,
          parent: { select: { name: true, code: true } },
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              transactions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      if (lembagaFilter) whereClause.lembagaId = lembagaFilter;
      whereClause.isActive = true;
      units = await prisma.unit.findMany({
        where: whereClause,
        select: { 
          id: true, 
          name: true, 
          code: true, 
          description: true,
          isActive: true,
          lembagaId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json({ 
      data: units as any,
      meta: {
        count: units.length,
        role: role,
      }
    });
  } catch (error) {
    console.error('[GET /api/units]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/units
// Create new unit. Role access: SUPERADMIN only
export async function POST(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden — Superadmin only' }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Validate input
    const parsed = createUnitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { name, code, description, lembagaId, parentId, isRetail } = parsed.data;

    // Check for duplicate
    const existing = await prisma.unit.findUnique({
      where: { code: code.toUpperCase() },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Unit dengan kode ${code.toUpperCase()} sudah ada` },
        { status: 409 }
      );
    }

    // Validate lembagaId if provided
    if (lembagaId) {
      const lembaga = await prisma.lembaga.findUnique({ where: { id: lembagaId }, select: { id: true } });
      if (!lembaga) {
        return NextResponse.json({ error: 'Lembaga tidak ditemukan' }, { status: 404 });
      }
    }

    // Validate parentId (parent must exist & share same lembaga)
    let validatedParentId: string | null = null;
    if (parentId) {
      const parentUnit = await prisma.unit.findUnique({ where: { id: parentId }, select: { id: true, lembagaId: true } });
      if (!parentUnit) {
        return NextResponse.json({ error: 'Unit induk tidak ditemukan' }, { status: 404 });
      }
      if (lembagaId && parentUnit.lembagaId && parentUnit.lembagaId !== lembagaId) {
        return NextResponse.json({ error: 'Unit induk harus berada di lembaga yang sama' }, { status: 400 });
      }
      validatedParentId = parentId;
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        code: code.toUpperCase(),
        description: description || null,
        lembagaId: lembagaId || null,
        parentId: validatedParentId,
        isRetail: isRetail || false,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        isRetail: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'unit',
        entityId: unit.id,
        newData: JSON.stringify(unit),
      },
    });

    return NextResponse.json(
      { data: unit, message: 'Unit berhasil dibuat' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/units]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

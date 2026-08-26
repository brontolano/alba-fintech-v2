import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';

const createLembagaSchema = z.object({
  name: z.string().min(1, 'Nama lembaga wajib diisi').max(100),
  code: z.string().max(20).toUpperCase().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateLembagaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().max(20).toUpperCase().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const role = session.user.role;
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    if (role === 'SUPERADMIN') {
      let where: any = {};
      if (isActive === 'true') where = { ...where, isActive: true };
      if (isActive === 'false') where = { ...where, isActive: false };

      const lembagasSuper = await prisma.lembaga.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          units: {
            select: { users: { select: { id: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const data = lembagasSuper.map((l) => ({
        id: l.id,
        name: l.name,
        code: l.code,
        description: l.description,
        isActive: l.isActive,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
        _count: { units: l.units.length },
      }));

      return NextResponse.json({ data, meta: { role, count: data.length } });
    }

    // Non-superadmin: only see active lembaga (for reference)
    const lembagas = await prisma.lembaga.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: lembagas, meta: { role, count: lembagas.length } });
  } catch (error) {
    console.error('[GET /api/lembaga]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const parsed = createLembagaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { name, code, description, isActive } = parsed.data;
    const codeUpper = code ? code.toUpperCase() : null;

    const existing = codeUpper
      ? await prisma.lembaga.findUnique({ where: { code: codeUpper }, select: { id: true } })
      : null;
    if (existing) {
      return NextResponse.json(
        { error: `Lembaga dengan kode ${codeUpper} sudah ada` },
        { status: 409 }
      );
    }

    const lembaga = await prisma.lembaga.create({
      data: {
        name,
        code: codeUpper,
        description: description || null,
        isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'lembaga',
        entityId: lembaga.id,
        newData: JSON.stringify(lembaga),
      },
    });

    return NextResponse.json({ data: lembaga, message: 'Lembaga berhasil dibuat' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/lembaga]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

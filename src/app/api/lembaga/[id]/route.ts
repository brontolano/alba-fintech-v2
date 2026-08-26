import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';

const updateLembagaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().max(20).toUpperCase().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/lembaga/:id — detail
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const lembaga = await prisma.lembaga.findUnique({
      where: { id },
      include: { units: true },
    });

    if (!lembaga) {
      return NextResponse.json({ error: 'Lembaga tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ data: lembaga });
  } catch (error) {
    console.error('[GET /api/lembaga/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/lembaga/:id — update (Superadmin only)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden — Superadmin only' }, { status: 403 });
  }

  try {
    const { id } = params;
    const body = await request.json();
    const parsed = updateLembagaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const existing = await prisma.lembaga.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Lembaga tidak ditemukan' }, { status: 404 });
    }

    // Check duplicate code if provided
    if (parsed.data.code) {
      const dup = await prisma.lembaga.findFirst({
        where: { code: parsed.data.code.toUpperCase(), id: { not: id } },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json(
          { error: `Lembaga dengan kode ${parsed.data.code.toUpperCase()} sudah ada` },
          { status: 409 }
        );
      }
    }

    // Get old data for audit
    const oldData = await prisma.lembaga.findUnique({ where: { id } });

    const lembaga = await prisma.lembaga.update({
      where: { id },
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description,
        isActive: parsed.data.isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'lembaga',
        entityId: id,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: JSON.stringify(lembaga),
      },
    });

    return NextResponse.json({ data: lembaga, message: 'Lembaga berhasil diperbarui' });
  } catch (error) {
    console.error('[PUT /api/lembaga/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/lembaga/:id — delete (Superadmin only)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden — Superadmin only' }, { status: 403 });
  }

  try {
    const { id } = params;
    const existing = await prisma.lembaga.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Lembaga tidak ditemukan' }, { status: 404 });
    }

    await prisma.lembaga.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'lembaga',
        entityId: id,
      },
    });

    return NextResponse.json({ message: 'Lembaga berhasil dihapus' });
  } catch (error) {
    console.error('[DELETE /api/lembaga/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

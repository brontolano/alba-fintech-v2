import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema for creating lembaga
const createLembagaSchema = z.object({
  name: z.string().min(1, 'Nama lembaga wajib diisi'),
  code: z.string().min(1, 'Kode lembaga wajib diisi'),
  description: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = session.user.role;
    if (role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch lembagas
    const lembagas = await prisma.lembaga.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            units: true,
            users: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ data: lembagas }, { status: 200 });
  } catch (error) {
    console.error('[Lembaga API] Error:', error);
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = createLembagaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Create lembaga
    const lembaga = await prisma.lembaga.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description,
        address: parsed.data.address,
        isActive: parsed.data.isActive,
      },
    });

    return NextResponse.json({ data: lembaga }, { status: 201 });
  } catch (error: any) {
    console.error('[Lembaga API] Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Kode lembaga sudah digunakan' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

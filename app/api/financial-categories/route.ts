import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createCategorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  code: z.string().min(1, 'Kode kategori wajib diisi'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  description: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where: any = {};
    if (type) {
      where.type = type;
    }

    const categories = await prisma.financialCategory.findMany({
      where,
      orderBy: {
        type: 'asc',
        name: 'asc',
      },
    });

    return NextResponse.json({ data: categories }, { status: 200 });
  } catch (error) {
    console.error('[Financial Categories API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    const category = await prisma.financialCategory.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        type: parsed.data.type,
        description: parsed.data.description,
        parentId: parsed.data.parentId,
        isActive: parsed.data.isActive,
        lembagaId: session.user.lembagaId,
      },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error: any) {
    console.error('[Financial Categories API] Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Kode kategori sudah digunakan' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

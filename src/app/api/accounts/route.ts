import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';

// GET /api/accounts — semua akun (Superadmin/Pimpinan)
// POST /api/accounts — create akun (Superadmin only)
// PATCH /api/accounts/:id — update akun (Superadmin only)
// DELETE /api/accounts/:id — soft-delete (Superadmin only)
export async function GET(req: Request) {
  const session = await getServerSession(authConfig);
  if (!session || !['SUPERADMIN', 'PIMPINAN'].includes(session.user?.role as string)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    const where = type ? { type: type as any } : {};
    const accounts = await prisma.account.findMany({
      where,
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        description: true,
        isActive: true,
        parentId: true,
      },
    });

    return NextResponse.json({ data: accounts });
  } catch (error) {
    console.error('[GET /api/accounts]', error);
    return NextResponse.json({ error: 'Gagal memuat akun' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);
  if (!session || session.user?.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Akses ditolak — Superadmin only' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { code, name, type, description, parentId } = body;

    if (!code || !name || !type) {
      return NextResponse.json(
        { error: 'code, name, type wajib diisi' },
        { status: 400 }
      );
    }

    const existing = await prisma.account.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: `Akun dengan kode ${code} sudah ada` },
        { status: 409 }
      );
    }

    const account = await prisma.account.create({
      data: {
        code,
        name,
        type,
        description: description || null,
        parentId: parentId || null,
      },
    });

    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/accounts]', error);
    return NextResponse.json({ error: 'Gagal membuat akun' }, { status: 500 });
  }
}

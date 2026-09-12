import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: SUPERADMIN only
    const role = session.user.role;
    if (role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if lembaga exists
    const lembaga = await prisma.lembaga.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            units: true,
            users: true,
          },
        },
      },
    });

    if (!lembaga) {
      return NextResponse.json({ error: 'Lembaga tidak ditemukan' }, { status: 404 });
    }

    // Prevent deletion if has related data
    if (lembaga._count.units > 0 || lembaga._count.users > 0) {
      return NextResponse.json({
        error: 'Tidak dapat menghapus lembaga yang masih memiliki unit atau pengguna',
      }, { status: 400 });
    }

    await prisma.lembaga.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Lembaga berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error('[Lembaga DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: SUPERADMIN only
    const role = session.user.role;
    if (role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const { name, code, description, address, isActive } = body;

    // Check if lembaga exists
    const existing = await prisma.lembaga.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lembaga tidak ditemukan' }, { status: 404 });
    }

    const lembaga = await prisma.lembaga.update({
      where: { id },
      data: {
        name: name || existing.name,
        code: code || existing.code,
        description: description !== undefined ? description : existing.description,
        address: address !== undefined ? address : existing.address,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    return NextResponse.json({ data: lembaga }, { status: 200 });
  } catch (error: any) {
    console.error('[Lembaga PATCH] Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Kode lembaga sudah digunakan' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
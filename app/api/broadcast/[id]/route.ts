import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role as string;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const broadcast = await prisma.broadcastMessage.findUnique({
      where: { id },
      select: { id: true, lembagaId: true },
    });

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast tidak ditemukan' }, { status: 404 });
    }

    // PIMPINAN hanya bisa hapus broadcast di lembaganya
    if (role === 'PIMPINAN') {
      const lembagaId = (session.user as any)?.lembagaId;
      if (broadcast.lembagaId !== lembagaId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await prisma.broadcastMessage.delete({ where: { id } });

    return NextResponse.json({ message: 'Broadcast berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error('[Broadcast API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role as string;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const broadcast = await prisma.broadcastMessage.findUnique({
      where: { id },
      include: {
        lembagas: { select: { id: true, name: true, code: true } },
        users: { select: { id: true, name: true, email: true } },
        _count: { select: { broadcast_recipients: true } },
      },
    });

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast tidak ditemukan' }, { status: 404 });
    }

    // PIMPINAN hanya bisa lihat broadcast di lembaganya
    if (role === 'PIMPINAN') {
      const lembagaId = (session.user as any)?.lembagaId;
      if (broadcast.lembagaId !== lembagaId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ data: broadcast }, { status: 200 });
  } catch (error) {
    console.error('[Broadcast API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

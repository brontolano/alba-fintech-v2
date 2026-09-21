import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const createBroadcastSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  message: z.string().min(1, 'Pesan wajib diisi'),
  type: z.string().default('INFO'),
  priority: z.string().default('NORMAL'),
  lembagaId: z.string().optional(),
  isSent: z.boolean().default(false),
});

const querySchema = z.object({
  lembagaId: z.string().optional(),
  unitId: z.string().optional(),
  status: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 20)),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role as string;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }

    const where: any = {};
    const lembagaId = (session.user as any)?.lembagaId;

    if (role === 'PIMPINAN') {
      where.lembagaId = lembagaId;
    }
    if (parsed.data.status) {
      where.status = parsed.data.status;
    }

    const broadcasts = await prisma.broadcastMessage.findMany({
      where,
      include: {
        lembagas: { select: { id: true, name: true, code: true } },
        users: { select: { id: true, name: true, email: true } },
        _count: { select: { broadcast_recipients: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (parsed.data.page - 1) * parsed.data.limit,
      take: parsed.data.limit,
    });

    const total = await prisma.broadcastMessage.count({ where });

    return NextResponse.json({
      data: broadcasts,
      summary: { total, pages: Math.ceil(total / parsed.data.limit) },
    }, { status: 200 });
  } catch (error) {
    console.error('[Broadcast API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role as string;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createBroadcastSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    const lembagaId = (session.user as any)?.lembagaId;
    const senderId = session.user.id as string;

    const broadcast = await prisma.broadcastMessage.create({
      data: {
        title: parsed.data.title,
        message: parsed.data.message,
        type: parsed.data.type,
        priority: parsed.data.priority,
        status: parsed.data.isSent ? 'SENT' : 'DRAFT',
        isDraft: !parsed.data.isSent,
        isSent: parsed.data.isSent,
        sentAt: parsed.data.isSent ? new Date() : null,
        lembagaId: parsed.data.lembagaId || lembagaId || undefined,
        senderId,
      },
    });

    if (parsed.data.isSent) {
      const where: any = {};
      if (parsed.data.lembagaId) {
        where.lembagaId = parsed.data.lembagaId;
      }
      const users = await prisma.user.findMany({
        where,
        select: { id: true },
      });
      if (users.length > 0) {
        await prisma.notification.createMany({
          data: users.map((u) => ({
            userId: u.id,
            title: broadcast.title,
            message: broadcast.message,
            type: 'INFO',
            isRead: false,
          })),
        });
      }
    }

    return NextResponse.json({ data: broadcast }, { status: 201 });
  } catch (error: any) {
    console.error('[Broadcast API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

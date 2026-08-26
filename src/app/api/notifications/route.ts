import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';

const createSchema = z.object({
  userId: z.string().optional(),
  title: z.string().min(1, 'Title wajib diisi'),
  message: z.string().min(1, 'Message wajib diisi'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']).default('INFO'),
});

export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ data: notifications });
  } catch (error) {
    console.error('[GET /api/notifications]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const { userId, title, message, type } = parsed.data;

    const notification = await prisma.notification.create({
      data: {
        userId: userId ?? session.user.id,
        title,
        message,
        type,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'notification',
        entityId: notification.id,
        newData: JSON.stringify(notification),
      },
    });

    return NextResponse.json({ data: notification }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/notifications]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications/:id/mark-read (handled via query param) or bulk read
// We'll support a query param: ?action=markRead
export async function PATCH(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const id = url.searchParams.get('id');

  try {
    if (action === 'markRead' && id) {
      const notification = await prisma.notification.update({
        where: { id, userId: session.user.id },
        data: { isRead: true },
      });
      return NextResponse.json({ data: notification });
    }

    if (action === 'markAllRead') {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[PATCH /api/notifications]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

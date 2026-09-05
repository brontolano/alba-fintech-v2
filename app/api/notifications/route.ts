import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

// Schema for query parameters
const querySchema = z.object({
  unreadOnly: z.string().optional().transform((val) => val === 'true'),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }

    const userId = (session.user as any)?.id;

    // Build where clause
    const where: any = { userId };
    if (parsed.data.unreadOnly) {
      where.isRead = false;
    }

    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parsed.data.limit,
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({
      data: notifications,
      summary: {
        unreadCount,
        total: notifications.length,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;

    // Parse body
    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({
        message: 'Semua notifikasi berhasil dibaca',
      }, { status: 200 });
    }

    if (notificationId) {
      const notification = await prisma.notification.update({
        where: { id: notificationId, userId },
        data: { isRead: true },
      });
      return NextResponse.json({
        message: 'Notifikasi berhasil dibaca',
        data: notification,
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  } catch (error) {
    console.error('[Notifications PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
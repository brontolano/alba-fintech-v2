import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';
import { sendPushNotification } from '@/lib/push-notification';

// PATCH /api/broadcasts/:id
// Actions: send | cancel | preview
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PIMPINAN' && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const actionSchema = z.object({
      action: z.enum(['send', 'cancel', 'preview']).optional(),
    });
    const { action } = actionSchema.parse(body);

    const broadcast = await prisma.broadcastMessage.findUnique({
      where: { id },
    });

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast tidak ditemukan' }, { status: 404 });
    }

    if (action === 'send' && !broadcast.isDraft) {
      return NextResponse.json({ error: 'Broadcast sudah dikirim' }, { status: 400 });
    }

    if (action === 'cancel' && broadcast.isSent) {
      return NextResponse.json({ error: 'Broadcast sudah dikirim, tidak bisa dibatalkan' }, { status: 400 });
    }

    let updated: any;

    if (action === 'send') {
      // Get all active users, optionally scoped to a lembaga
      const userWhere: any = { isActive: true };
      if (broadcast.lembagaId) {
        userWhere.lembagaId = broadcast.lembagaId;
      }

      const users = await prisma.user.findMany({
        where: userWhere,
        select: { id: true },
      });

      // Create broadcast recipients
      await prisma.broadcastRecipient.createMany({
        data: users.map(user => ({
          broadcastId: id,
          userId: user.id,
        })),
        skipDuplicates: true,
      });

      // Send push notifications for each user with push subscriptions
      for (const user of users) {
        try {
          await sendPushNotification(user.id, {
            title: broadcast.title,
            body: broadcast.message,
            url: `/broadcast/${broadcast.id}`,
            tag: `broadcast-${broadcast.id}`,
            requireInteraction: broadcast.priority === 'URGENT',
          });
        } catch (err) {
          console.error(`Failed to send push to user ${user.id}:`, err);
        }
      }

      // Update broadcast as sent
      updated = await prisma.broadcastMessage.update({
        where: { id },
        data: {
          status: 'SENT',
          isDraft: false,
          isSent: true,
          sentAt: new Date(),
          deliveredTo: users.length,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SEND_BROADCAST',
          entity: 'broadcast_message',
          entityId: id,
          oldData: JSON.stringify({ isDraft: broadcast.isDraft, isSent: broadcast.isSent }),
          newData: JSON.stringify({ isDraft: false, isSent: true, sentAt: updated.sentAt }),
        },
      });

      // Also create a notification for each user
      await prisma.notification.createMany({
        data: users.map(user => ({
          userId: user.id,
          title: broadcast.title,
          message: broadcast.message,
          type: broadcast.type as any,
          isRead: false,
        })),
        skipDuplicates: true,
      });

      return NextResponse.json({
        data: updated,
        message: `Broadcast berhasil dikirim ke ${users.length} pengguna`,
      });
    }

    if (action === 'cancel') {
      updated = await prisma.broadcastMessage.update({
        where: { id },
        data: { status: 'FAILED' },
      });
      return NextResponse.json({ data: updated, message: 'Broadcast dibatalkan' });
    }

    if (action === 'preview') {
      return NextResponse.json({ data: broadcast, message: 'Preview mode' });
    }

    // Unknown action — return current state
    return NextResponse.json({ data: broadcast, message: 'No action taken' });
  } catch (error: any) {
    console.error('[PATCH /api/broadcasts/:id]', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/broadcasts/:id
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'PIMPINAN' && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const broadcast = await prisma.broadcastMessage.findUnique({
      where: { id },
      select: { id: true, isSent: true },
    });

    if (!broadcast) {
      return NextResponse.json({ error: 'Broadcast tidak ditemukan' }, { status: 404 });
    }

    // Hapus draft yang belum dikirim
    if (broadcast.isSent) {
      return NextResponse.json(
        { error: 'Broadcast sudah dikirim, tidak bisa dihapus' },
        { status: 400 }
      );
    }

    await prisma.broadcastMessage.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_BROADCAST',
        entity: 'broadcast_message',
        entityId: id,
      },
    });

    return NextResponse.json({ message: 'Broadcast draft berhasil dihapus' });
  } catch (error: any) {
    console.error('[DELETE /api/broadcasts/:id]', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/broadcasts/:id
// Ambil detail satu broadcast termasuk recipients
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;

  try {
    let broadcast;

    if (role === 'PIMPINAN' || role === 'SUPERADMIN') {
      broadcast = await prisma.broadcastMessage.findUnique({
        where: { id },
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
          recipients: {
            select: {
              id: true,
              isRead: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: { select: { recipients: true } },
        },
      });

      if (!broadcast) {
        return NextResponse.json({ error: 'Broadcast tidak ditemukan' }, { status: 404 });
      }

      return NextResponse.json({
        data: {
          id: broadcast.id,
          title: broadcast.title,
          message: broadcast.message,
          type: broadcast.type,
          priority: broadcast.priority,
          status: broadcast.status,
          isDraft: broadcast.isDraft,
          isSent: broadcast.isSent,
          sentAt: broadcast.sentAt,
          deliveredTo: broadcast.deliveredTo,
          createdAt: broadcast.createdAt,
          updatedAt: broadcast.updatedAt,
          sender: broadcast.sender,
          recipients: broadcast.recipients,
          recipientCount: broadcast._count.recipients,
        },
      });
    } else {
      // Manager/Staff: hanya bisa lihat broadcast yang mereka terima
      const received = await prisma.broadcastRecipient.findFirst({
        where: {
          broadcastId: id,
          userId: session.user.id,
        },
        include: {
          broadcast: {
            include: {
              sender: { select: { id: true, name: true, email: true, role: true } },
            },
          },
        },
      });

      if (!received) {
        return NextResponse.json({ error: 'Broadcast tidak ditemukan' }, { status: 404 });
      }

      return NextResponse.json({
        data: {
          id: received.broadcast.id,
          title: received.broadcast.title,
          message: received.broadcast.message,
          type: received.broadcast.type,
          priority: received.broadcast.priority,
          status: received.broadcast.status,
          isRead: received.isRead,
          createdAt: received.broadcast.createdAt,
          sender: received.broadcast.sender,
        },
      });
    }
  } catch (error: any) {
    console.error('[GET /api/broadcasts/:id]', error);
    return NextResponse.json(
      { error: 'Internal server server' },
      { status: 500 }
    );
  }
}

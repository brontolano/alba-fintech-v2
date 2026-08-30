import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/broadcasts
// Daftar broadcast message.
// Role access:
//   PIMPINAN: lihat semua broadcast (draft + sent) + dapat melihat penerima
//   MANAGER/ STAFF: hanya melihat broadcast yang diterima
//   SUPERADMIN: lihat semua

const listQuerySchema = z.object({
  isDraft: z.boolean().optional(),
  isSent: z.boolean().optional(),
});

// POST /api/broadcasts
// Buat draft broadcast baru (dari Pimpinan melalui AI Assistant atau Superadmin)
const createSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(200),
  message: z.string().min(1, 'Pesan wajib diisi'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']).default('INFO'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  lembagaId: z.string().optional(), // Superadmin can scope to a lembaga
});

// PATCH /api/broadcasts
// Kirim draft broadcast ke semua pengguna
// Hanya PIMPINAN yang dapat mengirim
const sendSchema = z.object({
  action: z.enum(['send', 'cancel', 'preview']).optional(),
  broadcastId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;

  const url = new URL(request.url);
  const params = url.searchParams;

  const parseResult = listQuerySchema.safeParse({
    isDraft: params.get('isDraft') ? params.get('isDraft') === 'true' : undefined,
    isSent: params.get('isSent') ? params.get('isSent') === 'true' : undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid query', details: parseResult.error.errors }, { status: 400 });
  }

  const { isDraft, isSent } = parseResult.data;

  const where: any = {};

  if (role === 'PIMPINAN' || role === 'SUPERADMIN') {
    // Pimpinan/Superadmin can see all broadcasts
    if (isDraft !== undefined) where.isDraft = isDraft;
    if (isSent !== undefined) where.isSent = isSent;
  } else {
    // Manager/Staff can only see their received broadcasts
    // Filter by recipient
  }

  try {
    let broadcasts;

    if (role === 'PIMPINAN' || role === 'SUPERADMIN') {
      const broadcastWhere: any = {};
      if (isDraft !== undefined) broadcastWhere.isDraft = isDraft;
      if (isSent !== undefined) broadcastWhere.isSent = isSent;

      broadcasts = await prisma.broadcastMessage.findMany({
        where: broadcastWhere,
        include: {
          sender: {
            select: { id: true, name: true, email: true, role: true },
          },
          _count: {
            select: { recipients: true },
          },
          recipients: {
            where: { isRead: false },
            select: { userId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Format response for pimpinan
      return NextResponse.json({
        data: broadcasts.map(b => ({
          id: b.id,
          title: b.title,
          message: b.message,
          type: b.type,
          priority: b.priority,
          status: b.status,
          isDraft: b.isDraft,
          isSent: b.isSent,
          sentAt: b.sentAt,
          deliveredTo: b.deliveredTo,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          sender: b.sender,
          recipientCount: b._count.recipients,
          unreadRecipients: b.recipients.map(r => r.userId),
        })),
      });
    } else {
      // Manager/Staff: get broadcasts where they are a recipient
      const recipientWhere: any = {
        userId: session.user.id,
      };

      broadcasts = await prisma.broadcastRecipient.findMany({
        where: recipientWhere,
        include: {
          broadcast: {
            include: {
              sender: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
        },
        orderBy: { broadcast: { createdAt: 'desc' } },
      });

      return NextResponse.json({
        data: broadcasts.map(r => ({
          id: r.broadcast.id,
          title: r.broadcast.title,
          message: r.broadcast.message,
          type: r.broadcast.type,
          status: r.broadcast.status,
          priority: r.broadcast.priority,
          isRead: r.isRead,
          createdAt: r.broadcast.createdAt,
          sender: r.broadcast.sender,
        })),
      });
    }
  } catch (error) {
    console.error('[GET /api/broadcasts]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;

  // PIMPINAN or SUPERADMIN can create broadcast messages
  if (role !== 'PIMPINAN' && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden — Hanya Pimpinan atau Superadmin yang dapat mengirim broadcast' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Handle send action
    if (action === 'send') {
      const { broadcastId: rawBroadcastId } = sendSchema.parse({ action, broadcastId: data.broadcastId });

      const broadcast = await prisma.broadcastMessage.findUnique({
        where: { id: rawBroadcastId },
      });

      if (!broadcast) {
        return NextResponse.json({ error: 'Broadcast tidak ditemukan' }, { status: 404 });
      }

      if (!broadcast.isDraft) {
        return NextResponse.json({ error: 'Broadcast sudah dikirim' }, { status: 400 });
      }

      const broadcastId = rawBroadcastId;

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
          broadcastId: broadcastId as string,
          userId: user.id,
        })),
        skipDuplicates: true,
      });

      // Send push notifications for each user with push subscriptions
      for (const user of users) {
        const subscriptions = await prisma.pushSubscription.findMany({
          where: { userId: user.id },
        });

        for (const sub of subscriptions) {
          try {
            // In production, would use web-push library
            // await push.sendNotification(sub, JSON.stringify({
            //   title: broadcast.title,
            //   body: broadcast.message,
            //   data: { broadcastId: broadcast.id },
            // }));
          } catch (err) {
            console.error(`Failed to send push to user ${user.id}:`, err);
          }
        }
      }

      // Update broadcast as sent
      const updated = await prisma.broadcastMessage.update({
        where: { id: broadcastId },
        data: {
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
          entityId: broadcastId,
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

    // Create draft
    const parsed = createSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const { title, message, type, priority, lembagaId } = parsed.data;

    const draft = await prisma.broadcastMessage.create({
      data: {
        title,
        message,
        type,
        priority,
        isDraft: true,
        isSent: false,
        senderId: session.user.id,
        ...(lembagaId ? { lembagaId } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_DRAFT',
        entity: 'broadcast_message',
        entityId: draft.id,
        newData: JSON.stringify({ title, message, type, priority }),
      },
    });

    return NextResponse.json(
      { data: draft, message: 'Draft broadcast berhasil dibuat' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/broadcasts]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

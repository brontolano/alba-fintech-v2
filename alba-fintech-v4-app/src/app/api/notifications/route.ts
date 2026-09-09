import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { NotificationType, Role } from '@prisma/client';

// GET /api/notifications - list (BUG-008)
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'notifications');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const skip = parseInt(searchParams.get('skip') || '0', 10);
        const isRead = searchParams.get('isRead');

        let where: any = { userId: user.id };
        if (isRead !== null) where.isRead = isRead === 'true';

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            prisma.notification.count({ where }),
        ]);

        return NextResponse.json({ data: notifications, total });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/notifications (BUG-008 - system/manager broadcast)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'notifications');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    if (user.role !== Role.SUPERADMIN && user.role !== Role.PIMPINAN) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { userId, title, message, type, data } = body;

        if (!userId) return NextResponse.json({ error: 'userId wajib diisi' }, { status: 400 });
        if (!title) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
        if (!message) return NextResponse.json({ error: 'Pesan wajib diisi' }, { status: 400 });

        // Permission check for target user scope
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { unit: true },
        });

        if (!targetUser) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

        if (user.role === Role.PIMPINAN) {
            if (targetUser.lembagaId !== user.lembagaId) {
                return NextResponse.json({ error: 'Tidak dapat mengirim notifikasi ke user luar lembaga' }, { status: 403 });
            }
        }

        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type: type as NotificationType || NotificationType.SYSTEM,
                data: data ? JSON.stringify(data) : undefined,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE',
                entity: 'Notification',
                entityId: notification.id,
                newData: JSON.stringify(notification),
                unitId: user.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json(notification, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

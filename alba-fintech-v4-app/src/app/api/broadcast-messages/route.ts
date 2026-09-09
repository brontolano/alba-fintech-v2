import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { NotificationType, Role } from '@prisma/client';

// GET /api/broadcast-messages - list (BUG-012)
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'broadcast_messages');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });

    try {
        const messages = await prisma.broadcastMessage.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ data: messages, total: messages.length });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/broadcast-messages (BUG-012 - PIMPINAN/MANAGER send to unit users)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'broadcast_messages');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    if (user.role !== Role.SUPERADMIN && user.role !== Role.PIMPINAN && user.role !== Role.MANAGER) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { title, message, type, targetRole, targetUnitId, isActive } = body;

        if (!title) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
        if (!message) return NextResponse.json({ error: 'Pesan wajib diisi' }, { status: 400 });

        let resolvedTargetUnitId = null;
        if (user.role === Role.MANAGER) {
            resolvedTargetUnitId = user.unitId;
        } else if (user.role === Role.PIMPINAN) {
            resolvedTargetUnitId = targetUnitId;
            if (targetUnitId) {
                const unit = await prisma.unit.findUnique({ where: { id: targetUnitId } });
                if (!unit || unit.lembagaId !== user.lembagaId) {
                    return NextResponse.json({ error: 'Unit tidak termasuk dalam lembaga Anda' }, { status: 403 });
                }
            }
        } else {
            resolvedTargetUnitId = targetUnitId || null;
        }

        const broadcast = await prisma.broadcastMessage.create({
            data: {
                title,
                message,
                type: type as NotificationType || NotificationType.BROADCAST,
                targetRole: targetRole ? (targetRole as Role) : null,
                targetUnitId: resolvedTargetUnitId,
                isActive: isActive !== undefined ? isActive : true,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE',
                entity: 'BroadcastMessage',
                entityId: broadcast.id,
                newData: JSON.stringify(broadcast),
                unitId: user.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json(broadcast, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { NotificationType, Role } from '@prisma/client';

// PATCH /api/broadcast-messages/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'broadcast_messages');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    if (user.role !== Role.SUPERADMIN && user.role !== Role.PIMPINAN) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { title, message, type, targetRole, targetUnitId, isActive } = body;

        const existing = await prisma.broadcastMessage.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Broadcast tidak ditemukan' }, { status: 404 });

        let resolvedTargetUnitId = existing.targetUnitId;
        if (user.role === Role.PIMPINAN && targetUnitId) {
            const unit = await prisma.unit.findUnique({ where: { id: targetUnitId } });
            if (!unit || unit.lembagaId !== user.lembagaId) {
                return NextResponse.json({ error: 'Unit tidak termasuk dalam lembaga Anda' }, { status: 403 });
            }
            resolvedTargetUnitId = targetUnitId;
        }

        const updated = await prisma.broadcastMessage.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(message !== undefined && { message }),
                ...(type !== undefined && { type: type as NotificationType }),
                ...(targetRole !== undefined && { targetRole: targetRole ? (targetRole as Role) : null }),
                ...(targetUnitId !== undefined && { targetUnitId: resolvedTargetUnitId }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'BroadcastMessage',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: JSON.stringify(updated),
                unitId: user.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/broadcast-messages/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'broadcast_messages');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json({ error: 'Hanya SUPERADMIN yang dapat menghapus broadcast' }, { status: 403 });
    }

    try {
        const existing = await prisma.broadcastMessage.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Broadcast tidak ditemukan' }, { status: 404 });

        await prisma.broadcastMessage.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DELETE',
                entity: 'BroadcastMessage',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: undefined,
                unitId: user.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json({ message: 'Broadcast berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}

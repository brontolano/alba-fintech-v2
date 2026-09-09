import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';

// PATCH /api/notifications/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'notifications');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    try {
        const body = await req.json();
        const { isRead } = body;

        const existing = await prisma.notification.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Notifikasi tidak ditemukan' }, { status: 404 });

        // Scope: only owner can modify own notification
        if (existing.userId !== user.id && user.role !== Role.SUPERADMIN) {
            return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: {
                ...(isRead !== undefined && { isRead }),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/notifications/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'notifications');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json({ error: 'Hanya SUPERADMIN yang dapat menghapus notifikasi' }, { status: 403 });
    }

    try {
        const existing = await prisma.notification.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Notifikasi tidak ditemukan' }, { status: 404 });

        await prisma.notification.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DELETE',
                entity: 'Notification',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: undefined,
                unitId: user.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json({ message: 'Notifikasi berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}

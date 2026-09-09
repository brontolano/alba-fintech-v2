import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError, parseMultipart, saveUploadedFile } from '@/lib/api-utils';
import { Role } from '@prisma/client';

// GET /api/users/profile - get current user profile
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'users');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const profile = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                unit: { select: { id: true, name: true, code: true } },
                lembaga: { select: { id: true, name: true } },
            },
        });

        if (!profile) return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 404 });

        const { password, ...safe } = profile;
        return NextResponse.json(safe);
    } catch (error) {
        return handleApiError(error);
    }
}

// PATCH /api/users/profile - update current user profile
export async function PATCH(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'users');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const { body } = await parseMultipart(req);
        const { name, avatarUrl } = body;

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                ...(name !== undefined && { name }),
                ...(avatarUrl !== undefined && { avatarUrl }),
            },
            include: {
                unit: { select: { id: true, name: true } },
                lembaga: { select: { id: true, name: true } },
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'User',
                entityId: user.id,
                oldData: undefined,
                newData: JSON.stringify({ name, avatarUrl }),
                unitId: user.unitId,
                lembagaId: user.lembagaId,
            },
        });

        const { password, ...safe } = updated;
        return NextResponse.json(safe);
    } catch (error) {
        return handleApiError(error);
    }
}

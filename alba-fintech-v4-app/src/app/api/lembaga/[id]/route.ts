import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';

// PATCH /api/lembaga/[id] (UNI-02 / BUG-010)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'lembaga');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json({ error: 'Hanya SUPERADMIN yang dapat mengubah lembaga' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, code, address, phone, email, isActive } = body;

        const existing = await prisma.lembaga.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Lembaga tidak ditemukan' }, { status: 404 });

        const updated = await prisma.lembaga.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(code !== undefined && { code }),
                ...(address !== undefined && { address: address || null }),
                ...(phone !== undefined && { phone: phone || null }),
                ...(email !== undefined && { email: email || null }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'Lembaga',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: JSON.stringify(updated),
                lembagaId: updated.id,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/lembaga/[id] (BUG-010)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'lembaga');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json({ error: 'Hanya SUPERADMIN yang dapat menghapus lembaga' }, { status: 403 });
    }

    try {
        const existing = await prisma.lembaga.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Lembaga tidak ditemukan' }, { status: 404 });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DELETE',
                entity: 'Lembaga',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: undefined,
                lembagaId: id,
            },
        });

        await prisma.lembaga.delete({ where: { id } });
        return NextResponse.json({ message: 'Lembaga berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}

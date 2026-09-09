import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { UnitType, Role } from '@prisma/client';

// PATCH /api/units/[id] (UNI-01)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'units');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    try {
        const body = await req.json();
        const { name, code, type, isRetail, address, isActive, lembagaId } = body;

        const existing = await prisma.unit.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 });

        // Scope check
        if (user.role === Role.MANAGER) {
            if (existing.lembagaId !== user.lembagaId) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
        }

        let resolvedLembagaId = existing.lembagaId;
        if (lembagaId !== undefined && user.role === Role.SUPERADMIN) {
            resolvedLembagaId = lembagaId;
        }

        const updated = await prisma.unit.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(code !== undefined && { code }),
                ...(type !== undefined && { type: type as UnitType }),
                ...(isRetail !== undefined && { isRetail }),
                ...(address !== undefined && { address: address || null }),
                ...(isActive !== undefined && { isActive }),
                lembagaId: resolvedLembagaId,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'Unit',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: JSON.stringify(updated),
                lembagaId: updated.lembagaId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/units/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'units');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json({ error: 'Hanya SUPERADMIN yang dapat menghapus unit' }, { status: 403 });
    }

    try {
        const existing = await prisma.unit.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DELETE',
                entity: 'Unit',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: undefined,
                lembagaId: existing.lembagaId,
            },
        });

        await prisma.unit.delete({ where: { id } });
        return NextResponse.json({ message: 'Unit berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}

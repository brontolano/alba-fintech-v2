import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { TransactionType, Role } from '@prisma/client';

// PATCH /api/financial-categories/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'financial_categories');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json({ error: 'Hanya SUPERADMIN yang dapat mengubah kategori' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, type, code, description, isDefault } = body;

        const existing = await prisma.financialCategory.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });

        const updated = await prisma.financialCategory.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(type !== undefined && { type: type as TransactionType }),
                ...(code !== undefined && { code }),
                ...(description !== undefined && { description: description || null }),
                ...(isDefault !== undefined && { isDefault }),
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'FinancialCategory',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: JSON.stringify(updated),
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/financial-categories/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'financial_categories');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json({ error: 'Hanya SUPERADMIN yang dapat menghapus kategori' }, { status: 403 });
    }

    try {
        const existing = await prisma.financialCategory.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });

        await prisma.financialCategory.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DELETE',
                entity: 'FinancialCategory',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: undefined,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json({ message: 'Kategori berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}

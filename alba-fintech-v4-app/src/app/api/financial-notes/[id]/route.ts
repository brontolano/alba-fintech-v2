import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';

// PATCH /api/financial-notes/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'financial_notes');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    try {
        const body = await req.json();
        const { title, description, amount, categoryId, date } = body;

        const existing = await prisma.financialNote.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 });

        // Scope check
        if (user.role === Role.MANAGER) {
            if (existing.unitId !== user.unitId) {
                return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
            }
        } else if (user.role === Role.PIMPINAN) {
            const unit = await prisma.unit.findUnique({ where: { id: existing.unitId } });
            if (!unit || unit.lembagaId !== user.lembagaId) {
                return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
            }
        }

        const updated = await prisma.financialNote.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description: description || null }),
                ...(amount !== undefined && { amount: parseFloat(amount) }),
                ...(categoryId !== undefined && { categoryId }),
                ...(date !== undefined && { date: new Date(date) }),
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'FinancialNote',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: JSON.stringify(updated),
                unitId: existing.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/financial-notes/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'financial_notes');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json({ error: 'Hanya SUPERADMIN yang dapat menghapus catatan' }, { status: 403 });
    }

    try {
        const existing = await prisma.financialNote.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Catatan tidak ditemukan' }, { status: 404 });

        await prisma.financialNote.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DELETE',
                entity: 'FinancialNote',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: undefined,
                unitId: existing.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json({ message: 'Catatan berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}

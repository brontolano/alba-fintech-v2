import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { TransactionStatus, Role } from '@prisma/client';

// PATCH /api/approvals/[id] - approve or reject (BUG-021/BUG-003: unit+lembaga authority check)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'approvals');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    try {
        const body = await req.json();
        const { status, notes } = body;

        // Fetch approval with transaction and unit
        const approval = await prisma.approval.findUnique({
            where: { id },
            include: {
                transaction: {
                    include: {
                        unit: { select: { id: true, name: true, lembagaId: true } },
                    },
                    select: {
                        id: true,
                        unitId: true,
                        status: true,
                        type: true,
                        amount: true,
                        description: true,
                        unit: { select: { id: true, lembagaId: true } },
                    },
                },
            },
        });

        if (!approval) return NextResponse.json({ error: 'Persetujuan tidak ditemukan' }, { status: 404 });

        const tx = approval.transaction;

        // BUG-003/BUG-021: Validate authority based on unit+lembaga scope
        // PIMPINAN: can approve all transactions in their lembaga
        // MANAGER: can approve only transactions in their own unit
        if (user.role === Role.MANAGER) {
            if (tx.unitId !== user.unitId || tx.unit.lembagaId !== user.lembagaId) {
                return NextResponse.json(
                    { error: 'Anda tidak memiliki otoritas menyetujui transaksi unit ini' },
                    { status: 403 }
                );
            }
        } else if (user.role === Role.PIMPINAN) {
            if (tx.unit.lembagaId !== user.lembagaId) {
                return NextResponse.json(
                    { error: 'Anda tidak memiliki otoritas menyetujui transaksi lembaga ini' },
                    { status: 403 }
                );
            }
        } else if (user.role !== Role.SUPERADMIN) {
            return NextResponse.json(
                { error: 'Hanya MANAGER/PIMPINAN/SUPERADMIN yang dapat menyetujui' },
                { status: 403 }
            );
        }

        const newStatus = status as 'APPROVED' | 'REJECTED';
        if (!newStatus || !['APPROVED', 'REJECTED'].includes(newStatus)) {
            return NextResponse.json(
                { error: 'Status harus APPROVED atau REJECTED' },
                { status: 400 }
            );
        }

        const newStatusEnum = newStatus as TransactionStatus;

        // Update approval
        const updated = await prisma.approval.update({
            where: { id },
            data: {
                status: newStatusEnum,
                notes: notes || null,
            },
        });

        // Sync transaction status
        await prisma.transaction.update({
            where: { id: tx.id },
            data: {
                status: newStatusEnum,
                approvedById: user.id,
                approvedAt: new Date(),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/approvals/[id] - delete approval (SUPERADMIN only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'approvals');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json(
            { error: 'Hanya SUPERADMIN yang dapat menghapus persetujuan' },
            { status: 403 }
        );
    }

    try {
        const approval = await prisma.approval.findUnique({ where: { id } });
        if (!approval) return NextResponse.json({ error: 'Persetujuan tidak ditemukan' }, { status: 404 });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DELETE',
                entity: 'Approval',
                entityId: id,
                oldData: JSON.stringify(approval),
                newData: undefined,
                unitId: null,
                lembagaId: user.lembagaId,
            },
        });

        await prisma.approval.delete({ where: { id } });
        return NextResponse.json({ message: 'Persetujuan berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}

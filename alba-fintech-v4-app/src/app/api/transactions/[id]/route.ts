import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAccessUnit } from '@/lib/auth/rbac';
import { parseMultipart, handleApiError } from '@/lib/api-utils';
import { TransactionStatus, Role } from '@prisma/client';

// GET /api/transactions/[id] - get single transaction
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'transactions');
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const user = auth.user!;
    const { id } = await params;

    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                unit: { select: { id: true, name: true, code: true, lembagaId: true } },
                category: {
                    select: { id: true, name: true, code: true, type: true },
                },
                account: { select: { id: true, name: true, bankName: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                approvedBy: { select: { id: true, name: true } },
                approvals: {
                    include: { approver: { select: { id: true, name: true, role: true } } },
                },
            },
        });

        if (!transaction) {
            return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
        }

        // RBAC: scope data to user's lembaga/unit
        let authorized = false;
        if (user.role === Role.SUPERADMIN) {
            authorized = true;
        } else if (user.role === Role.PIMPINAN) {
            authorized = transaction.unit.lembagaId === user.lembagaId
                ? await prisma.unit.findUnique({
                    where: { id: transaction.unitId },
                    select: { lembagaId: true },
                }).then(u => u?.lembagaId === user.lembagaId)
                : false;
        } else {
            // STAFF/MANAGER: must be in same unit
            authorized = canAccessUnit(
                user.unitId,
                user.lembagaId,
                transaction.unitId,
                transaction.unit.lembagaId
            );
        }

        if (!authorized) {
            return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
        }

        return NextResponse.json(transaction);
    } catch (error) {
        return handleApiError(error);
    }
}

// PATCH /api/transactions/[id] - update transaction
// BUG-021/BUG-003: authority check (approve/reject) based on unit+lembaga scope
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'transactions');
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const user = auth.user!;
    const { id } = await params;

    try {
        const { body } = await parseMultipart(req);
        const {
            status,
            amount,
            description,
            categoryId,
            accountId,
            reference,
            orderItems,
        } = body;

        const existing = await prisma.transaction.findUnique({
            where: { id },
            include: { unit: { select: { id: true, name: true, lembagaId: true } } },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
        }

        // Scope check
        let authorized = false;
        if (user.role === Role.SUPERADMIN) {
            authorized = true;
        } else if (user.role === Role.PIMPINAN) {
            authorized = existing.unit.lembagaId === user.lembagaId;
        } else {
            authorized = canAccessUnit(
                user.unitId,
                user.lembagaId,
                existing.unitId,
                existing.unit.lembagaId
            );
        }
        if (!authorized) {
            return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
        }

        const updateData: any = {};
        if (amount !== undefined) updateData.amount = parseFloat(amount);
        if (description !== undefined) updateData.description = description;
        if (categoryId !== undefined) updateData.categoryId = categoryId;
        if (accountId !== undefined) updateData.accountId = accountId;
        if (reference !== undefined) updateData.reference = reference;
        if (orderItems !== undefined) updateData.orderItems = JSON.stringify(orderItems);

        // Handle photo upload
        if (body.file) {
            const { saveUploadedFile } = await import('@/lib/api-utils');
            const photoPath = await saveUploadedFile(
                body.file,
                process.cwd() + '/public/uploads/transactions'
            );
            updateData.photoUrl = photoPath;
        }

        // Handle status transitions: APPROVE / REJECT (BUG-021 authority check)
        if (status !== undefined && status !== existing.status) {
            const newStatus = status as TransactionStatus;

            if (newStatus === TransactionStatus.APPROVED) {
                // Only authorized roles can approve
                const allowedApprovers = [Role.SUPERADMIN, Role.PIMPINAN, Role.MANAGER] as Role[];
                if (!allowedApprovers.includes(user.role)) {
                    return NextResponse.json(
                        { error: 'Hanya MANAGER/PIMPINAN/SUPERADMIN yang dapat menyetujui' },
                        { status: 403 }
                    );
                }
                updateData.status = TransactionStatus.APPROVED;
                updateData.approvedById = user.id;
                updateData.approvedAt = new Date();
            } else if (newStatus === TransactionStatus.REJECTED) {
                const allowedApprovers = [Role.SUPERADMIN, Role.PIMPINAN, Role.MANAGER] as Role[];
                if (!allowedApprovers.includes(user.role)) {
                    return NextResponse.json(
                        { error: 'Hanya MANAGER/PIMPINAN/SUPERADMIN yang dapat menolak' },
                        { status: 403 }
                    );
                }
                updateData.status = TransactionStatus.REJECTED;
                updateData.approvedById = user.id;
                updateData.approvedAt = new Date();
            } else if (newStatus === TransactionStatus.PENDING) {
                // Only allow moving to PENDING from DRAFT
                if (existing.status !== TransactionStatus.DRAFT) {
                    return NextResponse.json(
                        { error: 'Hanya transaksi DRAFT yang dapat disubmit ke PENDING' },
                        { status: 400 }
                    );
                }
                updateData.status = TransactionStatus.PENDING;
            } else {
                updateData.status = newStatus;
            }
        }

        const updated = await prisma.transaction.update({
            where: { id },
            data: updateData,
        });

        // AuditLog
        const unit = await prisma.unit.findUnique({
            where: { id: updated.unitId },
            select: { lembagaId: true },
        });
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'Transaction',
                entityId: updated.id,
                oldData: JSON.stringify(existing),
                newData: JSON.stringify(updated),
                unitId: updated.unitId,
                lembagaId: unit?.lembagaId ?? user.lembagaId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/transactions/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'transactions');
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const user = auth.user!;
    const { id } = await params;

    try {
        const existing = await prisma.transaction.findUnique({
            where: { id },
            include: { unit: { select: { id: true, name: true, lembagaId: true } } },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
        }

        // Scope check
        let authorized = false;
        if (user.role === Role.SUPERADMIN) {
            authorized = true;
        } else if (user.role === Role.PIMPINAN) {
            authorized = existing.unit.lembagaId === user.lembagaId;
        } else {
            authorized = canAccessUnit(
                user.unitId,
                user.lembagaId,
                existing.unitId,
                existing.unit.lembagaId
            );
        }
        if (!authorized) {
            return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
        }

        // Only allow delete on DRAFT status
        if (existing.status !== TransactionStatus.DRAFT) {
            return NextResponse.json(
                { error: 'Hanya transaksi DRAFT yang dapat dihapus' },
                { status: 400 }
            );
        }

        await prisma.transaction.delete({ where: { id } });

        // AuditLog
        const unit = await prisma.unit.findUnique({
            where: { id: existing.unitId },
            select: { lembagaId: true },
        });
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DELETE',
                entity: 'Transaction',
                entityId: existing.id,
                oldData: JSON.stringify(existing),
                newData: undefined,
                unitId: existing.unitId,
                lembagaId: unit?.lembagaId ?? user.lembagaId,
            },
        });

        return NextResponse.json({ message: 'Transaksi berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}

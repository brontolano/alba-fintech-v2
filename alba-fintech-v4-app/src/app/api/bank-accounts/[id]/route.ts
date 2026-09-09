import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAccessUnit } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { AccountType, Role } from '@prisma/client';

// GET /api/bank-accounts/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'bank_accounts');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    try {
        const account = await prisma.bankAccount.findUnique({
            where: { id },
            include: { unit: { select: { id: true, name: true, lembagaId: true } } },
        });

        if (!account) {
            return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
        }

        let authorized = false;
        if (user.role === Role.SUPERADMIN) authorized = true;
        else if (user.role === Role.PIMPINAN) {
            authorized = account.unit.lembagaId === user.lembagaId;
        } else {
            authorized = canAccessUnit(user.unitId, user.lembagaId, account.unitId, account.unit.lembagaId);
        }
        if (!authorized) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

        return NextResponse.json(account);
    } catch (error) {
        return handleApiError(error);
    }
}

// PATCH /api/bank-accounts/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'bank_accounts');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    try {
        const body = await req.json();
        const { name, accountNumber, bankName, type, balance, isActive } = body;

        const existing = await prisma.bankAccount.findUnique({
            where: { id },
            include: { unit: { select: { lembagaId: true } } },
        });
        if (!existing) return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });

        let authorized = false;
        if (user.role === Role.SUPERADMIN) authorized = true;
        else if (user.role === Role.PIMPINAN) authorized = existing.unit.lembagaId === user.lembagaId;
        else authorized = canAccessUnit(user.unitId, user.lembagaId, existing.unitId, existing.unit.lembagaId);
        if (!authorized) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

        const updated = await prisma.bankAccount.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(accountNumber !== undefined && { accountNumber }),
                ...(bankName !== undefined && { bankName: bankName || null }),
                ...(type !== undefined && { type: type as AccountType }),
                ...(balance !== undefined && { balance: parseFloat(balance) }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'BankAccount',
                entityId: updated.id,
                oldData: JSON.stringify(existing),
                newData: JSON.stringify(updated),
                unitId: updated.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/bank-accounts/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'bank_accounts');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    try {
        const existing = await prisma.bankAccount.findUnique({
            where: { id },
            include: { unit: { select: { lembagaId: true } } },
        });
        if (!existing) return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });

        let authorized = false;
        if (user.role === Role.SUPERADMIN) authorized = true;
        else if (user.role === Role.PIMPINAN) authorized = existing.unit.lembagaId === user.lembagaId;
        else authorized = canAccessUnit(user.unitId, user.lembagaId, existing.unitId, existing.unit.lembagaId);
        if (!authorized) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

        await prisma.bankAccount.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DELETE',
                entity: 'BankAccount',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: undefined,
                unitId: existing.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json({ message: 'Akun berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}

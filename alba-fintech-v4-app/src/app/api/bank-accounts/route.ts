import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAccessUnit } from '@/lib/auth/rbac';
import { handleApiError, getPagination } from '@/lib/api-utils';
import { AccountType, Role } from '@prisma/client';

// GET /api/bank-accounts - list accounts with scope filtering
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'bank_accounts');
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        const { skip, limit } = getPagination(searchParams);
        const unitIdFilter = searchParams.get('unitId');

        let where: any = {};

        if (user.role === Role.STAFF || user.role === Role.MANAGER) {
            where.unitId = unitIdFilter ?? user.unitId;
        } else if (user.role === Role.PIMPINAN) {
            if (unitIdFilter) {
                // Validate unit belongs to user's lembaga
                const targetUnit = await prisma.unit.findUnique({
                    where: { id: unitIdFilter },
                    select: { lembagaId: true },
                });
                if (!targetUnit || targetUnit.lembagaId !== user.lembagaId) {
                    return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 403 });
                }
                where.unitId = unitIdFilter;
            } else {
                where.unit = { lembagaId: user.lembagaId };
            }
        }

        const [data, total] = await Promise.all([
            prisma.bankAccount.findMany({
                where,
                include: { unit: { select: { id: true, name: true } } },
                skip,
                take: limit,
            }),
            prisma.bankAccount.count({ where }),
        ]);

        return NextResponse.json({ data, total });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/bank-accounts - create bank account
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'bank_accounts');
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const user = auth.user!;

    try {
        const body = await req.json();
        const { name, accountNumber, bankName, type, unitId } = body;

        if (!name) {
            return NextResponse.json({ error: 'Nama akun wajib diisi' }, { status: 400 });
        }
        if (!accountNumber) {
            return NextResponse.json({ error: 'Nomor rekening wajib diisi' }, { status: 400 });
        }

        let resolvedUnitId = unitId;
        if (user.role === Role.STAFF || user.role === Role.MANAGER) {
            resolvedUnitId = user.unitId!;
        } else if (user.role === Role.PIMPINAN) {
            if (unitId) {
                const targetUnit = await prisma.unit.findUnique({
                    where: { id: unitId },
                    select: { lembagaId: true },
                });
                if (!targetUnit || targetUnit.lembagaId !== user.lembagaId) {
                    return NextResponse.json({ error: 'Unit tidak ditemukan di lembaga Anda' }, { status: 403 });
                }
                resolvedUnitId = unitId;
            } else {
                resolvedUnitId = user.unitId;
            }
        }

        const account = await prisma.bankAccount.create({
            data: {
                name,
                accountNumber,
                bankName: bankName || null,
                type: (type as AccountType) || AccountType.BANK,
                unitId: resolvedUnitId!,
            },
        });

        // AuditLog
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE',
                entity: 'BankAccount',
                entityId: account.id,
                newData: JSON.stringify(account),
                unitId: account.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json(account, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

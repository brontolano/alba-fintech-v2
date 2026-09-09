import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAccessUnit } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { TransactionStatus, Role } from '@prisma/client';

// GET /api/approvals - list approvals with status filter (BUG-004)
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'approvals');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        // BUG-004: support status filter (PENDING / APPROVED / REJECTED)
        const status = searchParams.get('status') as TransactionStatus | null;
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = parseInt(searchParams.get('skip') || '0', 10);

        let where: any = {};

        if (status) {
            where.status = status;
        }

        // Approvals belong to transactions owned by user's unit/lembaga
        if (user.role === Role.STAFF) {
            where.transaction = { createdById: user.id };
        } else if (user.role === Role.MANAGER) {
            where.transaction = { unitId: user.unitId };
        } else if (user.role === Role.PIMPINAN) {
            where.transaction = { unit: { lembagaId: user.lembagaId } };
        }

        const [approvals, total] = await Promise.all([
            prisma.approval.findMany({
                where,
                include: {
                    transaction: {
                        include: {
                            unit: { select: { id: true, name: true } },
                            category: { select: { id: true, name: true } },
                            createdBy: { select: { id: true, name: true, role: true } },
                        },
                    },
                    approver: { select: { id: true, name: true, role: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            prisma.approval.count({ where }),
        ]);

        return NextResponse.json({ data: approvals, total });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/approvals - create approval (usually auto-created)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'approvals');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const body = await req.json();
        const { transactionId, notes } = body;

        if (!transactionId) {
            return NextResponse.json({ error: 'transactionId wajib diisi' }, { status: 400 });
        }

        // Validate transaction exists and user can access it
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { unit: { select: { id: true, name: true, lembagaId: true } } },
        });
        if (!transaction) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });

        let authorized = false;
        if (user.role === Role.SUPERADMIN) authorized = true;
        else if (user.role === Role.PIMPINAN) authorized = transaction.unit.lembagaId === user.lembagaId;
        else authorized = canAccessUnit(user.unitId, user.lembagaId, transaction.unitId, transaction.unit.lembagaId);
        if (!authorized) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

        const approval = await prisma.approval.create({
            data: {
                transactionId,
                approverId: user.id,
                notes: notes || null,
            },
        });

        return NextResponse.json(approval, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

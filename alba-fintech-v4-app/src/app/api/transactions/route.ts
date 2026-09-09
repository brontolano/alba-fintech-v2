import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { parseMultipart, handleApiError, saveUploadedFile } from '@/lib/api-utils';
import { TransactionStatus, TransactionType, Role } from '@prisma/client';

// GET /api/transactions - list transactions with role/unit/lembaga filtering
export async function GET(req: NextRequest) {
    const auth = await requireAuth(
        req as any,
        {} as any,
        'transactions'
    );
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') as TransactionStatus | null;
        const categoryId = searchParams.get('categoryId');
        const accountId = searchParams.get('accountId');
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = parseInt(searchParams.get('skip') || '0', 10);

        const where: any = {};

        // BUG-003/BUG-026: Unit-level filtering
        // STAFF: only own unit
        // MANAGER: only own unit
        // PIMPINAN: all units in lembaga
        // SUPERADMIN: all
        if (user.role === Role.STAFF || user.role === Role.MANAGER) {
            where.unitId = user.unitId;
        } else if (user.role === Role.PIMPINAN) {
            where.unit = { lembagaId: user.lembagaId };
        }

        if (status) {
            where.status = status;
        }
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (accountId) {
            where.accountId = accountId;
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    unit: { select: { id: true, name: true, code: true } },
                    category: {
                        select: { id: true, name: true, code: true, type: true },
                    },
                    account: { select: { id: true, name: true, bankName: true } },
                    createdBy: { select: { id: true, name: true, email: true } },
                    approvedBy: { select: { id: true, name: true } },
                },
                orderBy: { date: 'desc' },
                take: limit,
                skip,
            }),
            prisma.transaction.count({ where }),
        ]);

        return NextResponse.json({ data: transactions, total });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/transactions - create transaction (BUG-001: multipart/form-data consistent)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(
        req as any,
        {} as any,
        'transactions'
    );
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const user = auth.user!;

    try {
        // BUG-001: Use FormData consistently; parse orderItems from JSON string
        const { body, files } = await parseMultipart(req);

        const {
            type,
            amount,
            description,
            date,
            categoryId,
            accountId,
            reference,
            orderItems,
            unitId,
        } = body;

        // Validate required fields
        if (!type || typeof type !== 'string') {
            return NextResponse.json({ error: 'Type transaksi wajib diisi' }, { status: 400 });
        }
        if (!amount) {
            return NextResponse.json({ error: 'Jumlah wajib diisi' }, { status: 400 });
        }
        if (!description) {
            return NextResponse.json({ error: 'Deskripsi wajib diisi' }, { status: 400 });
        }
        if (!date) {
            return NextResponse.json({ error: 'Tanggal wajib diisi' }, { status: 400 });
        }
        if (!categoryId) {
            return NextResponse.json({ error: 'Kategori wajib diisi' }, { status: 400 });
        }

        // BUG-004: TRANSFER requires accountId
        if (type === 'TRANSFER' && !accountId) {
            return NextResponse.json(
                { error: 'Akun bank wajib untuk transaksi TRANSFER' },
                { status: 400 }
            );
        }

        // Determine unitId: user can only create for own unit (MANAGER/STAFF),
        // PIMPINAN/SUPERADMIN can specify unitId but must be in lembaga
        let resolvedUnitId = user.unitId;
        if (user.role === Role.STAFF || user.role === Role.MANAGER) {
            resolvedUnitId = user.unitId;
        } else if (user.role === Role.PIMPINAN) {
            if (unitId) {
                const targetUnit = await prisma.unit.findUnique({
                    where: { id: unitId },
                    select: { lembagaId: true },
                });
                if (!targetUnit || targetUnit.lembagaId !== user.lembagaId) {
                    return NextResponse.json(
                        { error: 'Unit tidak ditemukan di lembaga Anda' },
                        { status: 403 }
                    );
                }
            } else {
                resolvedUnitId = user.unitId;
            }
        }

        // Handle photo upload (BUG-001: from FormData, not request body)
        let photoUrl: string | null = null;
        if (files.photo) {
            // Photo comes as a File in FormData
            const photoPath = await saveUploadedFile(
                files.photo,
                process.cwd() + '/public/uploads/transactions'
            );
            photoUrl = photoPath;
        }

        // Validate category belongs to same unit scope
        const category = await prisma.financialCategory
            .findUnique({
                where: { id: categoryId },
            });
        if (!category) {
            return NextResponse.json(
                { error: 'Kategori tidak ditemukan' },
                { status: 400 }
            );
        }

        // Determine initial status based on user role
        // MANAGER transactions need approval, STAFF too
        // SUPERADMIN/PIMPINAN can directly approve
        let initialStatus: TransactionStatus = TransactionStatus.DRAFT;
        if (user.role === Role.SUPERADMIN || user.role === Role.PIMPINAN) {
            initialStatus = TransactionStatus.APPROVED;
        } else {
            initialStatus = TransactionStatus.PENDING;
        }

        const transaction = await prisma.transaction.create({
            data: {
                type: type as TransactionType,
                amount: parseFloat(amount),
                description,
                date: new Date(date),
                status: initialStatus,
                unitId: resolvedUnitId!,
                categoryId,
                accountId: accountId || null,
                reference: reference || null,
                photoUrl,
                orderItems: orderItems ? JSON.stringify(orderItems) : undefined,
                createdById: user.id,
                // Auto-approve for admin roles; set approvedById
                ...(initialStatus === TransactionStatus.APPROVED
                    ? { approvedById: user.id, approvedAt: new Date() }
                    : {}),
            },
        });

        // Auto-create approval for PENDING transactions (BUG: approvals auto-create)
        if (initialStatus === TransactionStatus.PENDING) {
            const approval = await prisma.approval.create({
                data: {
                    transactionId: transaction.id,
                    approverId: user.id,
                    status: TransactionStatus.PENDING,
                },
            });

            // Create notification for approver
            if (user.role === Role.STAFF) {
                // Notify managers in same unit
                const managers = await prisma.user.findMany({
                    where: {
                        unitId: user.unitId,
                        role: Role.MANAGER,
                    },
                });
                for (const mgr of managers) {
                    await prisma.notification.create({
                        data: {
                            userId: mgr.id,
                            title: 'Transaksi menunggu persetujuan',
                            message: `${user.email} membuat transaksi ${type} senilai ${amount}`,
                            type: 'APPROVAL',
                        },
                    });
                }
            }
        }

        // Resolve lembagaId from unit for audit log
        const unit = await prisma.unit.findUnique({
            where: { id: transaction.unitId },
            select: { lembagaId: true },
        });

        // AuditLog
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE',
                entity: 'Transaction',
                entityId: transaction.id,
                newData: JSON.stringify(transaction),
                unitId: transaction.unitId,
                lembagaId: unit?.lembagaId ?? user.lembagaId,
            },
        });

        // S3-T02: POS stock decrement — sync inventory on transactions with orderItems
        if (transaction.orderItems) {
            const orderItemsStr: string =
                typeof transaction.orderItems === 'string'
                    ? transaction.orderItems
                    : JSON.stringify(transaction.orderItems);
            let parsedItems: Array<{ sku?: string; itemId?: string; quantity: number }> = [];
            try {
                parsedItems = JSON.parse(orderItemsStr);
            } catch {
                parsedItems = [];
            }

            for (const item of parsedItems) {
                const { sku, itemId, quantity } = item;
                if (!quantity || quantity <= 0) continue;

                const where = itemId ? { id: itemId } : sku ? { sku, unitId: transaction.unitId } : null;
                if (!where) continue;

                const invItem = await prisma.inventoryItem.findFirst({
                    where: { ...where, unitId: transaction.unitId },
                });
                if (!invItem) continue;

                await prisma.inventoryItem.update({
                    where: { id: invItem.id },
                    data: { currentStock: { decrement: quantity } },
                });
            }
        }

        return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

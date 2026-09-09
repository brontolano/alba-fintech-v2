import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { TransactionStatus, TransactionType, Role } from '@prisma/client';

// GET /api/dashboard - aggregates (BUG-023: exclude TRANSFER double-count)
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'dashboard');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        let unitWhere: any = {};
        if (user.role === Role.MANAGER) {
            unitWhere.id = user.unitId;
        } else if (user.role === Role.PIMPINAN) {
            unitWhere.lembagaId = user.lembagaId;
        }

        const [
            totalIncome,
            totalExpense,
            pendingApprovals,
            totalTransactions,
            lowStockItems,
        ] = await Promise.all([
            prisma.transaction.aggregate({
                where: {
                    status: TransactionStatus.APPROVED,
                    type: TransactionType.INCOME,
                    ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
                    unit: unitWhere,
                },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: {
                    status: TransactionStatus.APPROVED,
                    type: TransactionType.EXPENSE,
                    ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
                    unit: unitWhere,
                },
                _sum: { amount: true },
            }),
            prisma.approval.count({
                where: {
                    status: TransactionStatus.PENDING,
                    transaction: {
                        unit: unitWhere,
                        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
                    },
                },
            }),
            prisma.transaction.count({
                where: {
                    status: TransactionStatus.APPROVED,
                    ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
                    unit: unitWhere,
                },
            }),
            prisma.inventoryItem.findMany({
                where: {
                    currentStock: { lt: { _type: "Int", value: 0 } as any },
                    unit: unitWhere,
                },
                select: { id: true, name: true, currentStock: true, minStock: true },
            }),
        ]);

        return NextResponse.json({
            totalIncome: Number(totalIncome._sum.amount) || 0,
            totalExpense: Number(totalExpense._sum.amount) || 0,
            netBalance: (Number(totalIncome._sum.amount) || 0) - (Number(totalExpense._sum.amount) || 0),
            pendingApprovals,
            totalTransactions,
            lowStockItems: lowStockItems.filter(item => item.currentStock < item.minStock),
        });
    } catch (error) {
        return handleApiError(error);
    }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { TransactionStatus, TransactionType, Role } from '@prisma/client';

// GET /api/reports - aggregations with unit filter (BUG-026)
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'reports');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const unitId = searchParams.get('unitId');
        const groupBy = searchParams.get('groupBy') || 'daily';

        const dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        let unitWhere: any = {};
        if (user.role === Role.MANAGER) {
            unitWhere.id = user.unitId;
        } else if (user.role === Role.PIMPINAN) {
            unitWhere.lembagaId = user.lembagaId;
            if (unitId) {
                const unit = await prisma.unit.findUnique({ where: { id: unitId } });
                if (!unit || unit.lembagaId !== user.lembagaId) {
                    return NextResponse.json({ error: 'Unit tidak termasuk dalam lembaga Anda' }, { status: 403 });
                }
                unitWhere.id = unitId;
            }
        } else if (user.role === Role.SUPERADMIN && unitId) {
            unitWhere.id = unitId;
        }

        const transactions = await prisma.transaction.findMany({
            where: {
                status: TransactionStatus.APPROVED,
                type: { not: TransactionType.TRANSFER }, // BUG-023: exclude TRANSFER from income/expense
                ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
                unit: unitWhere,
            },
            select: {
                date: true,
                amount: true,
                type: true,
                description: true,
                category: { select: { name: true, type: true } },
            },
            orderBy: { date: 'asc' },
        });

        // Group by period
        const grouped: Record<string, { income: number; expense: number; count: number }> = {};
        for (const tx of transactions) {
            let key: string;
            const d = tx.date;
            if (groupBy === 'daily') {
                key = d.toISOString().split('T')[0];
            } else if (groupBy === 'monthly') {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            } else {
                key = d.toISOString().split('T')[0];
            }

            if (!grouped[key]) grouped[key] = { income: 0, expense: 0, count: 0 };
            if (tx.type === TransactionType.INCOME) {
                grouped[key].income += Number(tx.amount);
            } else {
                grouped[key].expense += Number(tx.amount);
            }
            grouped[key].count += 1;
        }

        return NextResponse.json({
            summary: Object.entries(grouped).map(([period, data]) => ({
                period,
                income: data.income,
                expense: data.expense,
                net: data.income - data.expense,
                count: data.count,
            })),
            transactions: transactions.slice(0, 100),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

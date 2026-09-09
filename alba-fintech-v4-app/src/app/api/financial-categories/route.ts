import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { TransactionType, Role } from '@prisma/client';

// GET /api/financial-categories - list
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'financial_categories');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });

    try {
        const categories = await prisma.financialCategory.findMany();
        return NextResponse.json({ data: categories, total: categories.length });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/financial-categories (SUPERADMIN only)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'financial_categories');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, type, code, description } = body;

        if (!name) return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 });
        if (!type) return NextResponse.json({ error: 'Type wajib diisi' }, { status: 400 });
        if (!code) return NextResponse.json({ error: 'Kode wajib diisi' }, { status: 400 });

        const category = await prisma.financialCategory.create({
            data: {
                name,
                type: type as TransactionType,
                code,
                description: description || null,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE',
                entity: 'FinancialCategory',
                entityId: category.id,
                newData: JSON.stringify(category),
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

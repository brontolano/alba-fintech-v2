import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';

// GET /api/inventory - list items with unit scope
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'inventory');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = parseInt(searchParams.get('skip') || '0', 10);
        const categoryId = searchParams.get('category');

        let where: any = {};

        if (user.role === Role.STAFF || user.role === Role.MANAGER) {
            where.unitId = user.unitId;
        } else if (user.role === Role.PIMPINAN) {
            where.unit = { lembagaId: user.lembagaId };
        }

        if (categoryId) where.category = categoryId;

        const [items, total] = await Promise.all([
            prisma.inventoryItem.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            prisma.inventoryItem.count({ where }),
        ]);

        return NextResponse.json({ data: items, total });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/inventory - create inventory item
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'inventory');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const body = await req.json();
        const { name, sku, category, unitPrice, sellPrice, minStock, unitId } = body;

        if (!name) return NextResponse.json({ error: 'Nama barang wajib diisi' }, { status: 400 });
        if (!unitPrice) return NextResponse.json({ error: 'Harga beli wajib diisi' }, { status: 400 });
        if (!sellPrice) return NextResponse.json({ error: 'Harga jual wajib diisi' }, { status: 400 });

        let resolvedUnitId = unitId;
        if (user.role === Role.STAFF || user.role === Role.MANAGER) {
            resolvedUnitId = user.unitId;
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

        const item = await prisma.inventoryItem.create({
            data: {
                name,
                sku: sku || null,
                category: category || null,
                unitPrice: parseFloat(unitPrice),
                sellPrice: parseFloat(sellPrice),
                currentStock: 0,
                minStock: minStock || 0,
                unitId: resolvedUnitId!,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE',
                entity: 'InventoryItem',
                entityId: item.id,
                newData: JSON.stringify(item),
                unitId: item.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}


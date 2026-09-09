import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAccessUnit } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';

// GET /api/inventory/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'inventory');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    try {
        const item = await prisma.inventoryItem.findUnique({
            where: { id },
            include: { unit: { select: { id: true, lembagaId: true } } },
        });
        if (!item) return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 });

        let authorized = false;
        if (user.role === Role.SUPERADMIN) authorized = true;
        else if (user.role === Role.PIMPINAN) authorized = item.unit.lembagaId === user.lembagaId;
        else authorized = canAccessUnit(user.unitId, user.lembagaId, item.unitId, item.unit.lembagaId);
        if (!authorized) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

        return NextResponse.json(item);
    } catch (error) {
        return handleApiError(error);
    }
}

// PATCH /api/inventory/[id] - update item + stock adjustment (INV-02)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'inventory');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    try {
        const body = await req.json();
        const { name, sku, category, unitPrice, sellPrice, minStock, currentStock, stockAdjustment } = body;

        const existing = await prisma.inventoryItem.findUnique({
            where: { id },
            include: { unit: { select: { lembagaId: true } } },
        });
        if (!existing) return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 });

        let authorized = false;
        if (user.role === Role.SUPERADMIN) authorized = true;
        else if (user.role === Role.PIMPINAN) authorized = existing.unit.lembagaId === user.lembagaId;
        else authorized = canAccessUnit(user.unitId, user.lembagaId, existing.unitId, existing.unit.lembagaId);
        if (!authorized) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

        let newStock = existing.currentStock;

        if (stockAdjustment !== undefined) {
            // stockAdjustment is delta (can be negative)
            newStock = existing.currentStock + (parseInt(stockAdjustment) || 0);
        } else if (currentStock !== undefined) {
            newStock = parseInt(currentStock);
        }

        const updated = await prisma.inventoryItem.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(sku !== undefined && { sku: sku || null }),
                ...(category !== undefined && { category: category || null }),
                ...(unitPrice !== undefined && { unitPrice: parseFloat(unitPrice) }),
                ...(sellPrice !== undefined && { sellPrice: parseFloat(sellPrice) }),
                ...(minStock !== undefined && { minStock: parseInt(minStock) }),
                currentStock: newStock,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'InventoryItem',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: JSON.stringify(updated),
                unitId: existing.unitId,
                lembagaId: existing.unit.lembagaId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/inventory/[id] (INV-01)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'inventory');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { id } = await params;

    try {
        const existing = await prisma.inventoryItem.findUnique({
            where: { id },
            include: { unit: { select: { lembagaId: true } } },
        });
        if (!existing) return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 });

        let authorized = false;
        if (user.role === Role.SUPERADMIN) authorized = true;
        else if (user.role === Role.PIMPINAN) authorized = existing.unit.lembagaId === user.lembagaId;
        else authorized = canAccessUnit(user.unitId, user.lembagaId, existing.unitId, existing.unit.lembagaId);
        if (!authorized) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

        await prisma.inventoryItem.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DELETE',
                entity: 'InventoryItem',
                entityId: id,
                oldData: JSON.stringify(existing),
                newData: undefined,
                unitId: existing.unitId,
                lembagaId: existing.unit.lembagaId,
            },
        });

        return NextResponse.json({ message: 'Barang berhasil dihapus' });
    } catch (error) {
        return handleApiError(error);
    }
}

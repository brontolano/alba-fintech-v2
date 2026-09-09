import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { UnitType, Role } from '@prisma/client';

// GET /api/units - list units
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'units_read');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = parseInt(searchParams.get('skip') || '0', 10);

        let where: any = {};
        if (user.role === Role.PIMPINAN || user.role === Role.MANAGER) {
            where.lembagaId = user.lembagaId;
        }

        const [units, total] = await Promise.all([
            prisma.unit.findMany({ where, take: limit, skip }),
            prisma.unit.count({ where }),
        ]);

        return NextResponse.json({ data: units, total });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/units - create unit (SUPERADMIN)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'units');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const body = await req.json();
        const { name, code, type, isRetail, address, lembagaId } = body;

        if (!name) return NextResponse.json({ error: 'Nama unit wajib diisi' }, { status: 400 });
        if (!code) return NextResponse.json({ error: 'Kode unit wajib diisi' }, { status: 400 });
        if (!lembagaId) return NextResponse.json({ error: 'lembagaId wajib diisi' }, { status: 400 });

        const unit = await prisma.unit.create({
            data: {
                name,
                code,
                type: (type as UnitType) || UnitType.OFFICE,
                isRetail: isRetail ?? false,
                address: address || null,
                lembagaId,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE',
                entity: 'Unit',
                entityId: unit.id,
                newData: JSON.stringify(unit),
                lembagaId: lembagaId,
            },
        });

        return NextResponse.json(unit, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

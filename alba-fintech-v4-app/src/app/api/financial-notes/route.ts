import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';

// GET /api/financial-notes - list (BUG-005: filter by unit user)
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'financial_notes');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = parseInt(searchParams.get('skip') || '0', 10);

        let where: any = {};
        if (user.role === Role.SUPERADMIN) {
            const unitId = searchParams.get('unitId');
            if (unitId) where.unitId = unitId;
        } else if (user.role === Role.PIMPINAN) {
            const unitId = searchParams.get('unitId');
            if (unitId) {
                const unit = await prisma.unit.findUnique({ where: { id: unitId } });
                if (!unit || unit.lembagaId !== user.lembagaId) {
                    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
                }
                where.unitId = unitId;
            } else {
                where.unit = { lembagaId: user.lembagaId };
            }
        } else {
            // MANAGER / STAFF: only own unit
            where.unitId = user.unitId;
        }

        const [notes, total] = await Promise.all([
            prisma.financialNote.findMany({
                where,
                include: { category: true, unit: true },
                take: limit,
                skip,
                orderBy: { date: 'desc' },
            }),
            prisma.financialNote.count({ where }),
        ]);

        return NextResponse.json({ data: notes, total });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/financial-notes (BUG-005: unitId from scope, not body)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'financial_notes');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const body = await req.json();
        const { title, description, amount, categoryId, date } = body;

        if (!title) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
        if (!amount) return NextResponse.json({ error: 'Jumlah wajib diisi' }, { status: 400 });
        if (!categoryId) return NextResponse.json({ error: 'Kategori wajib diisi' }, { status: 400 });

        // BUG-005: unitId resolved from user scope, never from body
        let resolvedUnitId = user.unitId;
        if (user.role === Role.SUPERADMIN) {
            resolvedUnitId = body.unitId;
            if (!resolvedUnitId) return NextResponse.json({ error: 'unitId wajib diisi untuk SUPERADMIN' }, { status: 400 });
        } else if (user.role === Role.PIMPINAN) {
            if (body.unitId) {
                const unit = await prisma.unit.findUnique({ where: { id: body.unitId } });
                if (!unit || unit.lembagaId !== user.lembagaId) {
                    return NextResponse.json({ error: 'Unit tidak termasuk dalam lembaga Anda' }, { status: 403 });
                }
                resolvedUnitId = body.unitId;
            }
        }

        if (!resolvedUnitId) {
            return NextResponse.json({ error: 'User tidak memiliki unit' }, { status: 400 });
        }

        const note = await prisma.financialNote.create({
            data: {
                title,
                description: description || null,
                amount: parseFloat(amount),
                categoryId,
                unitId: resolvedUnitId,
                date: date ? new Date(date) : new Date(),
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE',
                entity: 'FinancialNote',
                entityId: note.id,
                newData: JSON.stringify(note),
                unitId: resolvedUnitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

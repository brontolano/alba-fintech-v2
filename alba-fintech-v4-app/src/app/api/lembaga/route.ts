import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';

// GET /api/lembaga - list lembaga
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'lembaga');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = parseInt(searchParams.get('skip') || '0', 10);

        let where: any = {};
        if (user.role !== Role.SUPERADMIN) {
            where.id = user.lembagaId;
        }

        const [lembagas, total] = await Promise.all([
            prisma.lembaga.findMany({ where, take: limit, skip }),
            prisma.lembaga.count({ where }),
        ]);

        return NextResponse.json({ data: lembagas, total });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/lembaga - create (SUPERADMIN only)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'lembaga');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, code, address, phone, email } = body;

        if (!name) return NextResponse.json({ error: 'Nama lembaga wajib diisi' }, { status: 400 });
        if (!code) return NextResponse.json({ error: 'Kode lembaga wajib diisi' }, { status: 400 });

        const lembaga = await prisma.lembaga.create({
            data: {
                name,
                code,
                address: address || null,
                phone: phone || null,
                email: email || null,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE',
                entity: 'Lembaga',
                entityId: lembaga.id,
                newData: JSON.stringify(lembaga),
                lembagaId: lembaga.id,
            },
        });

        return NextResponse.json(lembaga, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

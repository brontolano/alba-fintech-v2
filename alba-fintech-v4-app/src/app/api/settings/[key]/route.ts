import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';

// GET /api/settings/[key] - get a single setting
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'settings');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;
    const { key } = await params;

    try {
        // Check URL query for unitId (to fetch unit-scoped setting)
        const { searchParams } = new URL(req.url);
        const unitId = searchParams.get('unitId');

        let setting: unknown;
        if (unitId) {
            // Fetch unit setting; PIMPINAN scoped to lembaga
            if (user.role === Role.PIMPINAN) {
                const unit = await prisma.unit.findUnique({
                    where: { id: unitId },
                    select: { lembagaId: true },
                });
                if (!unit || unit.lembagaId !== user.lembagaId) {
                    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
                }
            }
            setting = await prisma.unitSetting.findUnique({
                where: { unitId_key: { unitId, key } },
            });
        } else {
            setting = await prisma.systemSetting.findUnique({
                where: { key },
            });
        }

        if (!setting) return NextResponse.json({ error: 'Setting tidak ditemukan' }, { status: 404 });
        return NextResponse.json(setting);
    } catch (error) {
        return handleApiError(error);
    }
}

// PATCH /api/settings/[key] - update a single setting
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
    const auth = await requireAuth(req as any, {} as any, 'settings');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    if (user.role !== Role.SUPERADMIN && user.role !== Role.PIMPINAN) {
        return NextResponse.json({ error: 'Hanya admin yang dapat mengubah setting' }, { status: 403 });
    }

    const { key } = await params;
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get('unitId');

    try {
        const body = await req.json();
        const { value, description } = body;

        if (unitId) {
            if (user.role === Role.PIMPINAN) {
                const unit = await prisma.unit.findUnique({
                    where: { id: unitId },
                    select: { lembagaId: true },
                });
                if (!unit || unit.lembagaId !== user.lembagaId) {
                    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
                }
            }

            const existing = await prisma.unitSetting.findUnique({
                where: { unitId_key: { unitId, key } },
            });
            if (!existing) return NextResponse.json({ error: 'Setting tidak ditemukan' }, { status: 404 });

            const updated = await prisma.unitSetting.update({
                where: { unitId_key: { unitId, key } },
                data: {
                    ...(value !== undefined && { value }),
                    ...(description !== undefined && { description }),
                },
            });
            return NextResponse.json(updated);
        } else {
            const existing = await prisma.systemSetting.findUnique({ where: { key } });
            if (!existing) return NextResponse.json({ error: 'Setting tidak ditemukan' }, { status: 404 });

            const updated = await prisma.systemSetting.update({
                where: { key },
                data: {
                    ...(value !== undefined && { value }),
                    ...(description !== undefined && { description }),
                },
            });
            return NextResponse.json(updated);
        }
    } catch (error) {
        return handleApiError(error);
    }
}

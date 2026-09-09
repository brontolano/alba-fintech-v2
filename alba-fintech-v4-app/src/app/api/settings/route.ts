import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';

// GET /api/settings - list all settings (system-wide or unit-scoped), OR export action
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'settings');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action');

        // S3-T09: Export all settings as JSON
        if (action === 'export') {
            const systemSettings = await prisma.systemSetting.findMany({});

            let unitSettings: any[] = [];
            if (user.role === Role.SUPERADMIN) {
                unitSettings = await prisma.unitSetting.findMany({
                    include: { unit: { select: { id: true, code: true, name: true } } },
                });
            } else {
                unitSettings = await prisma.unitSetting.findMany({
                    where: { unit: { lembagaId: user.lembagaId } },
                    include: { unit: { select: { id: true, code: true, name: true } } },
                });
            }

            return NextResponse.json({ systemSettings, unitSettings });
        }

        // Default: list settings the user can access
        let where: any = {};
        const scope = searchParams.get('scope');
        if (scope === 'unit' && user.unitId) {
            where.OR = [
                { unitId: user.unitId },
                { unitId: null }, // system-wide (unitId null means global)
            ];
        } else if (user.role !== Role.SUPERADMIN) {
            where.OR = [{ unitId: user.unitId }, { unitId: null }];
        }

        const [system, unit] = await Promise.all([
            prisma.systemSetting.findMany({
                orderBy: { key: 'asc' },
            }),
            user.role === Role.SUPERADMIN
                ? prisma.unitSetting.findMany({
                    orderBy: { key: 'asc' },
                    include: { unit: { select: { id: true, code: true } } },
                })
                : prisma.unitSetting.findMany({
                    where: {
                        OR: [
                            { unitId: user.unitId },
                            { unit: { lembagaId: user.lembagaId } },
                        ],
                    },
                    orderBy: { key: 'asc' },
                    include: { unit: { select: { id: true, code: true } } },
                }),
        ]);

        return NextResponse.json({ system, unit });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/settings - bulk upsert settings (S3-T09: import)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'settings');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    // Only admin roles can write system settings
    if (user.role !== Role.SUPERADMIN && user.role !== Role.PIMPINAN) {
        return NextResponse.json({ error: 'Hanya admin yang dapat mengubah setting sistem' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { systemSettings, unitSettings } = body;

        // Upsert systemSettings
        if (Array.isArray(systemSettings)) {
            for (const s of systemSettings) {
                if (!s.key) continue;
                await prisma.systemSetting.upsert({
                    where: { key: s.key },
                    update: { value: s.value, description: s.description ?? undefined },
                    create: { key: s.key, value: s.value, description: s.description ?? undefined },
                });
            }
        }

        // Upsert unitSettings (PIMPINAN limited to own lembaga)
        if (Array.isArray(unitSettings)) {
            for (const s of unitSettings) {
                if (!s.key || !s.unitId) continue;

                if (user.role === Role.PIMPINAN) {
                    const unit = await prisma.unit.findUnique({
                        where: { id: s.unitId },
                        select: { lembagaId: true },
                    });
                    if (!unit || unit.lembagaId !== user.lembagaId) {
                        return NextResponse.json({ error: `Unit tidak ditemukan di lembaga Anda` }, { status: 403 });
                    }
                }

                await prisma.unitSetting.upsert({
                    where: { unitId_key: { unitId: s.unitId, key: s.key } },
                    update: { value: s.value, description: s.description ?? undefined },
                    create: { unitId: s.unitId, key: s.key, value: s.value, description: s.description ?? undefined },
                });
            }
        }

        return NextResponse.json({ success: true, message: 'Settings imported' });
    } catch (error) {
        return handleApiError(error);
    }
}

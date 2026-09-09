import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';

// GET /api/users - list users (BUG-006: N+1 fix using include)
export async function GET(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'users');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = parseInt(searchParams.get('skip') || '0', 10);
        const unitId = searchParams.get('unitId');
        const role = searchParams.get('role') as Role | null;

        let where: any = {};

        if (user.role === Role.SUPERADMIN) {
            // Can see all, optionally filter by unit
            if (unitId) where.unitId = unitId;
            if (role) where.role = role;
        } else if (user.role === Role.PIMPINAN) {
            // See all staff/users in their lembaga
            where.lembagaId = user.lembagaId;
            if (unitId) where.unitId = unitId;
            if (role) where.role = role;
        } else if (user.role === Role.MANAGER) {
            // Only see users in their unit
            where.unitId = user.unitId;
        } else {
            // STAFF can only see themselves
            where.id = user.id;
        }

        // BUG-006 fix: use include to avoid N+1 queries
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    unit: { select: { id: true, name: true, code: true } },
                    lembaga: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            prisma.user.count({ where }),
        ]);

        // Strip password field
        const safeUsers = users.map(u => {
            const { password, ...safe } = u;
            return safe;
        });

        return NextResponse.json({ data: safeUsers, total });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/users - create user (SUPERADMIN only)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'users');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    if (user.role !== Role.SUPERADMIN && user.role !== Role.PIMPINAN) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, email, password, role: newUserRole, unitId } = body;

        if (!name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
        if (!email) return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
        if (!password) return NextResponse.json({ error: 'Password wajib diisi' }, { status: 400 });

        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        let resolvedUnitId = unitId;
        let resolvedLembagaId = user.lembagaId;

        if (user.role === Role.SUPERADMIN) {
            if (!unitId && !body.lembagaId) {
                return NextResponse.json({ error: 'lembagaId wajib diisi untuk SUPERADMIN' }, { status: 400 });
            }
            resolvedLembagaId = body.lembagaId || user.lembagaId;
        } else if (user.role === Role.PIMPINAN) {
            // Only create users in their lembaga, optionally in specific unit
            resolvedLembagaId = user.lembagaId;
            if (unitId) {
                const targetUnit = await prisma.unit.findUnique({
                    where: { id: unitId },
                    select: { lembagaId: true },
                });
                if (!targetUnit || targetUnit.lembagaId !== user.lembagaId) {
                    return NextResponse.json({ error: 'Unit tidak valid' }, { status: 403 });
                }
                resolvedUnitId = unitId;
            }
        }

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: (newUserRole as Role) || Role.STAFF,
                unitId: resolvedUnitId || null,
                lembagaId: resolvedLembagaId,
            },
            include: {
                unit: { select: { id: true, name: true } },
                lembaga: { select: { id: true, name: true } },
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE',
                entity: 'User',
                entityId: newUser.id,
                newData: JSON.stringify({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role }),
                unitId: newUser.unitId,
                lembagaId: newUser.lembagaId,
            },
        });

        const { password: _pw, ...safeUser } = newUser;
        return NextResponse.json(safeUser, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

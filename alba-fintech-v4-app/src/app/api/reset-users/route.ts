import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

// POST /api/reset-users - reset password for a user (SUPERADMIN only, used by admin)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'users');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    if (user.role !== Role.SUPERADMIN) {
        return NextResponse.json({ error: 'Hanya SUPERADMIN yang dapat mereset password' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { userId, newPassword } = body;

        if (!userId) return NextResponse.json({ error: 'userId wajib diisi' }, { status: 400 });
        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
        }

        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, lembagaId: true, unitId: true, email: true },
        });
        if (!target) return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashed },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'User.password',
                entityId: userId,
                oldData: undefined,
                newData: undefined,
                unitId: target.unitId,
                lembagaId: target.lembagaId,
            },
        });

        return NextResponse.json({ message: 'Password berhasil direset', email: target.email });
    } catch (error) {
        return handleApiError(error);
    }
}

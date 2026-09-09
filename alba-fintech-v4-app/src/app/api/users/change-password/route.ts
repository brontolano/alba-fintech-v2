import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/api-utils';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

// POST /api/users/change-password - change current user password
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'users');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const body = await req.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword) return NextResponse.json({ error: 'Password saat ini wajib diisi' }, { status: 400 });
        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (!dbUser) return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });

        const isCurrentValid = await bcrypt.compare(currentPassword, dbUser.password);
        if (!isCurrentValid) return NextResponse.json({ error: 'Password saat ini salah' }, { status: 401 });

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashed },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'User.password',
                entityId: user.id,
                oldData: undefined,
                newData: undefined,
                unitId: user.unitId,
                lembagaId: user.lembagaId,
            },
        });

        return NextResponse.json({ message: 'Password berhasil diubah' });
    } catch (error) {
        return handleApiError(error);
    }
}

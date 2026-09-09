import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { handleApiError, saveUploadedFile } from '@/lib/api-utils';

// POST /api/users/profile/upload - upload profile image (BUG-013/S1-T07)
export async function POST(req: NextRequest) {
    const auth = await requireAuth(req as any, {} as any, 'users');
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
    const user = auth.user!;

    try {
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return NextResponse.json({ error: 'Content-Type harus multipart/form-data' }, { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file || file.size === 0) {
            return NextResponse.json({ error: 'File foto diperlukan' }, { status: 400 });
        }

        // Validate file is image
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Hanya file gambar yang diperbolehkan' }, { status: 400 });
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Ukuran file maksimal 5MB' }, { status: 400 });
        }

        // Save file
        const uploadDir = process.cwd() + '/public/uploads/profiles';
        const filename = `avatar_${user.id}_${Date.now()}_${file.name}`;
        const photoUrl = await saveUploadedFile(file as any, uploadDir, filename);

        // Update user avatarUrl
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: photoUrl },
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE',
                entity: 'User.avatar',
                entityId: user.id,
                oldData: undefined,
                newData: JSON.stringify({ avatarUrl: photoUrl }),
                unitId: user.unitId,
                lembagaId: user.lembagaId,
            },
        });

        const { password, ...safe } = updated;
        return NextResponse.json({ message: 'Foto profil berhasil diunggah', avatarUrl: photoUrl, user: safe });
    } catch (error) {
        return handleApiError(error);
    }
}

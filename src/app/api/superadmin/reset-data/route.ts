import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password admin super diperlukan' }, { status: 400 });
    }

    // Verify the requester is superadmin via password match
    const superadmin = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' },
    });

    if (!superadmin) {
      return NextResponse.json({ error: 'Superadmin tidak ditemukan' }, { status: 404 });
    }

    const bcrypt = await import('bcryptjs');
    const passwordValid = await bcrypt.compare(password, superadmin.passwordHash);

    if (!passwordValid) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 });
    }

    // Delete all data except users (we preserve all users including superadmin)
    await prisma.transaction.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.broadcastRecipient.deleteMany();
    await prisma.broadcastMessage.deleteMany();
    await prisma.unitSetting.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.lembaga.deleteMany();
    // Reset any other models that exist in schema

    return NextResponse.json({
      success: true,
      message: 'Semua data selain pengguna berhasil direset',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal mereset data' },
      { status: 500 }
    );
  }
}

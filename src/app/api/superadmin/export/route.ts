import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const lembagas = await prisma.lembaga.findMany();
    const units = await prisma.unit.findMany();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unitId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const transactions = await prisma.transaction.findMany();
    const inventoryItems = await prisma.inventoryItem.findMany();
    const broadcasts = await prisma.broadcastMessage.findMany();
    const recipients = await prisma.broadcastRecipient.findMany();
    const unitSettings = await prisma.unitSetting.findMany();

    const data = {
      exportedAt: new Date().toISOString(),
      lembagas,
      units,
      users,
      transactions,
      inventoryItems,
      broadcasts,
      recipients,
      unitSettings,
    };

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal mengekspor data' },
      { status: 500 }
    );
  }
}

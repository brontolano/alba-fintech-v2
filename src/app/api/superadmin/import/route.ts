import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 400 });
    }

    // Use transaction to import
    await prisma.$transaction(async (tx) => {
      if (data.lembagas && data.lembagas.length > 0) {
        await tx.lembaga.createMany({ data: data.lembagas, skipDuplicates: true });
      }
      if (data.units && data.units.length > 0) {
        await tx.unit.createMany({ data: data.units, skipDuplicates: true });
      }
      if (data.users && data.users.length > 0) {
        await tx.user.createMany({ data: data.users, skipDuplicates: true });
      }
      if (data.transactions && data.transactions.length > 0) {
        await tx.transaction.createMany({ data: data.transactions, skipDuplicates: true });
      }
      if (data.inventoryItems && data.inventoryItems.length > 0) {
        await tx.inventoryItem.createMany({ data: data.inventoryItems, skipDuplicates: true });
      }
      if (data.broadcasts && data.broadcasts.length > 0) {
        await tx.broadcastMessage.createMany({ data: data.broadcasts, skipDuplicates: true });
      }
      if (data.recipients && data.recipients.length > 0) {
        await tx.broadcastRecipient.createMany({ data: data.recipients, skipDuplicates: true });
      }
      if (data.unitSettings && data.unitSettings.length > 0) {
        await tx.unitSetting.createMany({ data: data.unitSettings, skipDuplicates: true });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Data berhasil diimpor',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal mengimpor data' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Restore data from JSON backup
export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role') || 'SUPERADMIN';
    if (role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden: only SUPERADMIN can restore' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';
    let backupData: any;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'File backup tidak ditemukan' }, { status: 400 });
      }
      const text = await file.text();
      backupData = JSON.parse(text);
    } else {
      // Handle JSON body
      backupData = await req.json();
    }

    // Validate backup format
    if (!backupData.metadata || !backupData.data) {
      return NextResponse.json({ error: 'Format backup tidak valid' }, { status: 400 });
    }

    const { data } = backupData;
    const results: Record<string, number> = {};
    const errors: string[] = [];

    // Restore order matters due to foreign keys
    // 1. Master data first
    const restoreOrder = [
      { key: 'units', model: 'unit', fn: (d: any) => prisma.unit.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'users', model: 'user', fn: (d: any) => prisma.user.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'unitPartners', model: 'unitPartner', fn: (d: any) => prisma.unitPartner.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'unitSettings', model: 'unitSetting', fn: (d: any) => prisma.unitSetting.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'santris', model: 'santri', fn: (d: any) => prisma.santri.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'nfcs', model: 'nfc', fn: (d: any) => prisma.nfc.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'tagihanTemplates', model: 'tagihanTemplate', fn: (d: any) => prisma.tagihanTemplate.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'tagihanTemplateItems', model: 'tagihanTemplateItem', fn: (d: any) => prisma.tagihanTemplateItem.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'retailUnits', model: 'retailUnit', fn: (d: any) => prisma.retailUnit.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'retailProducts', model: 'retailProduct', fn: (d: any) => prisma.retailProduct.upsert({ where: { id: d.id }, update: d, create: d }) },
      // 2. Transactional data
      { key: 'tagihans', model: 'tagihan', fn: (d: any) => prisma.tagihan.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'tagihanItems', model: 'tagihanItem', fn: (d: any) => prisma.tagihanItem.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'pembayarans', model: 'pembayaran', fn: (d: any) => prisma.pembayaran.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'shifts', model: 'shift', fn: (d: any) => prisma.shift.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'absensis', model: 'absensi', fn: (d: any) => prisma.absensi.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'rollings', model: 'rolling', fn: (d: any) => prisma.rolling.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'approvals', model: 'approval', fn: (d: any) => prisma.approval.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'notices', model: 'notice', fn: (d: any) => prisma.notice.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'noticeReads', model: 'noticeRead', fn: (d: any) => prisma.noticeRead.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'nfcLogs', model: 'nfcLog', fn: (d: any) => prisma.nfcLog.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'auditLogs', model: 'auditLog', fn: (d: any) => prisma.auditLog.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'notifications', model: 'notification', fn: (d: any) => prisma.notification.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'tabungans', model: 'tabungan', fn: (d: any) => prisma.tabungan.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'tabunganTransaksis', model: 'tabunganTransaksi', fn: (d: any) => prisma.tabunganTransaksi.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'retailInventories', model: 'retailInventory', fn: (d: any) => prisma.retailInventory.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'retailTransactions', model: 'retailTransaction', fn: (d: any) => prisma.retailTransaction.upsert({ where: { id: d.id }, update: d, create: d }) },
      { key: 'retailTransactionItems', model: 'retailTransactionItem', fn: (d: any) => prisma.retailTransactionItem.upsert({ where: { id: d.id }, update: d, create: d }) },
    ];

    // Execute restore in transaction for data integrity
    await prisma.$transaction(async (tx) => {
      for (const item of restoreOrder) {
        const records = data[item.key] || [];
        let count = 0;
        for (const record of records) {
          try {
            await item.fn(record);
            count++;
          } catch (err: any) {
            errors.push(`${item.model}:${record.id} - ${err.message}`);
          }
        }
        results[item.key] = count;
      }
    });

    // Log restore action
    await prisma.auditLog.create({
      data: {
        entityType: 'System',
        entityId: 'restore',
        action: 'RESTORE',
        userId: req.headers.get('x-user-id') || 'system',
        newData: JSON.stringify({ metadata: backupData.metadata, results }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Restore completed',
      metadata: backupData.metadata,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
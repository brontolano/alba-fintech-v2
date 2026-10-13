import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Export all data as JSON backup
export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role') || 'SUPERADMIN';
    if (!['SUPERADMIN', 'MANAGER KPAK'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json'; // json or csv
    const includeAudit = searchParams.get('includeAudit') === 'true';
    const includeNotifications = searchParams.get('includeNotifications') === 'true';

    // Fetch all data in parallel
    const [
      units,
      users,
      santris,
      nfcs,
      nfcLogs,
      unitPartners,
      unitSettings,
      tagihanTemplates,
      tagihanTemplateItems,
      tagihans,
      tagihanItems,
      pembayarans,
      shifts,
      absensis,
      rollings,
      approvals,
      notices,
      noticeReads,
      auditLogs,
      notifications,
      tabungans,
      tabunganTransaksis,
      retailUnits,
      retailProducts,
      retailInventories,
      retailTransactions,
      retailTransactionItems,
    ] = await Promise.all([
      prisma.unit.findMany(),
      prisma.user.findMany(),
      prisma.santri.findMany(),
      prisma.nfc.findMany(),
      prisma.nfcLog.findMany(),
      prisma.unitPartner.findMany(),
      prisma.unitSetting.findMany(),
      prisma.tagihanTemplate.findMany(),
      prisma.tagihanTemplateItem.findMany(),
      prisma.tagihan.findMany(),
      prisma.tagihanItem.findMany(),
      prisma.pembayaran.findMany(),
      prisma.shift.findMany(),
      prisma.absensi.findMany(),
      prisma.rolling.findMany(),
      prisma.approval.findMany(),
      prisma.notice.findMany(),
      prisma.noticeRead.findMany(),
      includeAudit ? prisma.auditLog.findMany() : Promise.resolve([]),
      includeNotifications ? prisma.notification.findMany() : Promise.resolve([]),
      prisma.tabungan.findMany(),
      prisma.tabunganTransaksi.findMany(),
      prisma.retailUnit.findMany(),
      prisma.retailProduct.findMany(),
      prisma.retailInventory.findMany(),
      prisma.retailTransaction.findMany(),
      prisma.retailTransactionItem.findMany(),
    ]);

    const backupData = {
      metadata: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        exportedBy: req.headers.get('x-user-id') || 'system',
        format: 'ALBA Finance Backup',
      },
      data: {
        units,
        users: users.map(u => ({ ...u, passwordHash: '[REDACTED]' })), // Never export passwords
        santris,
        nfcs,
        nfcLogs,
        unitPartners,
        unitSettings,
        tagihanTemplates,
        tagihanTemplateItems,
        tagihans,
        tagihanItems,
        pembayarans,
        shifts,
        absensis,
        rollings,
        approvals,
        notices,
        noticeReads,
        auditLogs,
        notifications,
        tabungans,
        tabunganTransaksis,
        retailUnits,
        retailProducts,
        retailInventories,
        retailTransactions,
        retailTransactionItems,
      },
    };

    if (format === 'csv') {
      // Return as downloadable JSON file (CSV would be complex for nested relations)
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', `attachment; filename="alba-backup-${new Date().toISOString().split('T')[0]}.json"`);
      return new NextResponse(JSON.stringify(backupData, null, 2), { headers });
    }

    return NextResponse.json(backupData);
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
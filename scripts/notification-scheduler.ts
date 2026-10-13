#!/usr/bin/env node
/**
 * Notification Scheduler Script
 * Run periodically to create notifications for:
 * 1. PAYMENT_DUE - Tagihan approaching due date (3 days before, 1 day before, on due date)
 * 2. APPROVAL_REQUEST - Pending approvals older than 24 hours
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createNotification(userId: string, type: string, title: string, message: string, referenceId?: string, referenceType?: string, priority: string = 'INFO') {
  return await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      referenceId,
      referenceType,
      priority,
      isRead: false,
    },
  });
}

async function checkPaymentDue() {
  console.log('🔍 Checking for upcoming payment due dates...');
  
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  
  // Find unpaid/partial tagihan with tanggal in the next 3 days
  // Using tanggal as due date since jatuhTempo field doesn't exist
  const tagihans = await prisma.tagihan.findMany({
    where: {
      status: { in: ['UNPAID', 'PARTIAL'] },
      tanggal: {
        gte: now,
        lte: threeDaysLater,
      },
    },
    include: {
      santri: true,
      unit: true,
      template: true,
    },
  });

  let created = 0;
  
  for (const tagihan of tagihans) {
    const daysUntilDue = Math.ceil((tagihan.tanggal.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    
    // Determine priority and message based on days until due
    let priority = 'INFO';
    let title = 'Pengingat Pembayaran';
    let message = '';
    
    if (daysUntilDue === 0) {
      priority = 'CRITICAL';
      title = 'Pembayaran Jatuh Tempo Hari Ini';
      message = `Tagihan ${tagihan.template?.name || 'SPP'} untuk ${tagihan.santri?.name} (NIS: ${tagihan.santri?.studentNumber}) jatuh tempo hari ini. Total: Rp ${tagihan.totalNilai.toLocaleString('id-ID')}`;
    } else if (daysUntilDue === 1) {
      priority = 'WARNING';
      title = 'Pembayaran Jatuh Tempo Besok';
      message = `Tagihan ${tagihan.template?.name || 'SPP'} untuk ${tagihan.santri?.name} (NIS: ${tagihan.santri?.studentNumber}) jatuh tempo besok. Total: Rp ${tagihan.totalNilai.toLocaleString('id-ID')}`;
    } else if (daysUntilDue <= 3) {
      priority = 'WARNING';
      title = 'Pembayaran Mendekati Jatuh Tempo';
      message = `Tagihan ${tagihan.template?.name || 'SPP'} untuk ${tagihan.santri?.name} (NIS: ${tagihan.santri?.studentNumber}) jatuh tempo dalam ${daysUntilDue} hari. Total: Rp ${tagihan.totalNilai.toLocaleString('id-ID')}`;
    }
    
    // Find relevant users to notify (MANAGER KPAK, STAFF KPAK in the same unit)
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['MANAGER KPAK', 'STAFF KPAK', 'SUPERADMIN'] },
        unitId: tagihan.unitId || undefined,
      },
    });
    
    for (const user of users) {
      // Check if notification already exists for this tagihan and user
      const existing = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          referenceId: tagihan.id,
          referenceType: 'Tagihan',
          type: 'PAYMENT_DUE',
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Created in last 24 hours
          },
        },
      });
      
      if (!existing) {
        await createNotification(user.id, 'PAYMENT_DUE', title, message, tagihan.id, 'Tagihan', priority);
        created++;
        console.log(`  ✅ Created ${priority} notification for user ${user.email} (${user.role}) - ${title}`);
      }
    }
  }
  
  console.log(`📊 Payment due check complete: ${created} notifications created`);
  return created;
}

async function checkApprovalReminders() {
  console.log('🔍 Checking for pending approvals older than 24 hours...');
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Find pending approvals older than 24 hours
  const approvals = await prisma.approval.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lte: twentyFourHoursAgo },
    },
    include: {
      unit: true,
      requestedBy: true,
    },
  });

  let created = 0;
  
  for (const approval of approvals) {
    const hoursPending = Math.floor((Date.now() - approval.createdAt.getTime()) / (60 * 60 * 1000));
    
    // Find managers who can approve
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ['MANAGER KPAK', 'SUPERADMIN'] },
        unitId: approval.unitId,
      },
    });
    
    for (const manager of managers) {
      // Check if reminder already sent in last 24 hours
      const existing = await prisma.notification.findFirst({
        where: {
          userId: manager.id,
          referenceId: approval.id,
          referenceType: 'Approval',
          type: 'APPROVAL_REQUEST',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });
      
      if (!existing) {
        await createNotification(
          manager.id,
          'APPROVAL_REQUEST',
          'Persetujuan Tertunda > 24 Jam',
          `Persetujuan ${approval.type} (${approval.referenceType}) dari ${approval.requestedBy?.name || 'Staff'} sudah menunggu ${hoursPending} jam. Silakan review di halaman Approval.`,
          approval.id,
          'Approval',
          'WARNING'
        );
        created++;
        console.log(`  ✅ Created APPROVAL_REQUEST reminder for manager ${manager.email} - Approval ${approval.id}`);
      }
    }
  }
  
  console.log(`📊 Approval reminder check complete: ${created} notifications created`);
  return created;
}

async function checkLowBalance() {
  console.log('🔍 Checking for low balance tabungan...');
  
  // Fetch all active tabungans and filter in memory
  const tabungans = await prisma.tabungan.findMany({
    where: {
      isDeleted: false,
    },
    include: {
      santri: true,
    },
  });

  // Filter for low balance: saldo <= minSaldo (critical) or saldo <= minSaldo * 1.2 (warning)
  const lowBalanceTabungans = tabungans.filter(t => {
    const ratio = t.saldo / t.minSaldo;
    return ratio <= 1.2;
  });

  let created = 0;
  
  for (const tabungan of lowBalanceTabungans) {
    const ratio = tabungan.saldo / tabungan.minSaldo;
    let priority = 'INFO';
    let title = '';
    let message = '';
    
    if (ratio <= 1) {
      priority = 'CRITICAL';
      title = 'Saldo Tabungan Di Bawah Minimum';
      message = `Saldo tabungan ${tabungan.santri?.name} (NIS: ${tabungan.santri?.studentNumber}) telah di bawah batas minimum. Saldo: Rp ${tabungan.saldo.toLocaleString('id-ID')}, Minimum: Rp ${tabungan.minSaldo.toLocaleString('id-ID')}`;
    } else if (ratio <= 1.2) {
      priority = 'WARNING';
      title = 'Saldo Tabungan Mendekati Minimum';
      message = `Saldo tabungan ${tabungan.santri?.name} (NIS: ${tabungan.santri?.studentNumber}) mendekati batas minimum. Saldo: Rp ${tabungan.saldo.toLocaleString('id-ID')}, Minimum: Rp ${tabungan.minSaldo.toLocaleString('id-ID')}`;
    } else {
      continue; // Skip if not low balance
    }
    
    // Notify relevant users
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['MANAGER KPAK', 'STAFF KPAK', 'SUPERADMIN'] },
      },
    });
    
    for (const user of users) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          referenceId: tabungan.id,
          referenceType: 'Tabungan',
          type: 'LOW_BALANCE',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });
      
      if (!existing) {
        await createNotification(user.id, 'LOW_BALANCE', title, message, tabungan.id, 'Tabungan', priority);
        created++;
        console.log(`  ✅ Created ${priority} LOW_BALANCE notification for ${user.email}`);
      }
    }
  }
  
  console.log(`📊 Low balance check complete: ${created} notifications created`);
  return created;
}

async function main() {
  console.log('🚀 Notification Scheduler Started');
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log('─'.repeat(50));
  
  try {
    const paymentDue = await checkPaymentDue();
    const approvalReminders = await checkApprovalReminders();
    const lowBalance = await checkLowBalance();
    
    console.log('─'.repeat(50));
    console.log('📈 Summary:');
    console.log(`  - PAYMENT_DUE: ${paymentDue} notifications`);
    console.log(`  - APPROVAL_REQUEST: ${approvalReminders} notifications`);
    console.log(`  - LOW_BALANCE: ${lowBalance} notifications`);
    console.log(`  - Total: ${paymentDue + approvalReminders + lowBalance} notifications`);
    console.log('✅ Notification Scheduler Completed Successfully');
  } catch (error) {
    console.error('❌ Notification Scheduler Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
/**
 * Dummy seed script untuk modul persetujuan (approval).
 *
 * - Membuat transaksi dengan status DRAFT/PENDING
 * - Membuat approval record yang terhubung ke transaksi
 * - Data terintegrasi dengan lembaga, unit, user yang ada (atau dibuat dummy)
 *
 * Jalankan setelah seed.ts / database sudah berisi lembaga + unit + user minimal:
 *   npx tsx scripts/seed-dummy-approvals.ts
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getOrCreateDummyContext() {
  // Ensure a lembaga exists
  let lembaga = await prisma.lembaga.findFirst({ where: { code: 'AL-BASYARIYAH' } });
  if (!lembaga?.id) {
    lembaga = await prisma.lembaga.create({
      data: {
        name: 'Pondok Pesantren Al-Basyariyah',
        code: 'AL-BASYARIYAH',
        description: 'Dummy lembaga for approval testing',
      },
    });
  }

  // Ensure two units: KPAK (unitId A) and KANTIN-01 (unitId B)
  let unitKpak = await prisma.unit.findFirst({ where: { code: 'DK-KPK-01' } });
  if (!unitKpak) {
    unitKpak = await prisma.unit.create({
      data: {
        name: 'KPAK Dummy',
        code: 'DK-KPK-01',
        type: 'KPAK',
        isRetail: false,
        lembagaId: lembaga!.id,
      },
    });
  }

  let unitKantin = await prisma.unit.findFirst({ where: { code: 'DK-KNT-01' } });
  if (!unitKantin) {
    unitKantin = await prisma.unit.create({
      data: {
        name: 'Kantin Dummy',
        code: 'DK-KNT-01',
        type: 'KANTIN',
        isRetail: true,
        lembagaId: lembaga!.id,
      },
    });
  }

  // Ensure a creator (STAFF) and an approver (PIMPINAN) exist with fixed emails
  let creator = await prisma.user.findUnique({
    where: { email: 'dummy-staff@alba.local' },
  });
  if (!creator) {
    const hashed = await bcrypt.hash('Bismillah123!', 12);
    creator = await prisma.user.create({
      data: {
        email: 'dummy-staff@alba.local',
        name: 'Dummy Staff',
        passwordHash: hashed,
        role: 'STAFF',
        unitId: unitKantin.id,
        lembagaId: lembaga!.id,
      },
    });
  }

  let approver = await prisma.user.findUnique({
    where: { email: 'dummy-pimpinan@alba.local' },
  });
  if (!approver) {
    const hashed = await bcrypt.hash('Bismillah123!', 12);
    approver = await prisma.user.create({
      data: {
        email: 'dummy-pimpinan@alba.local',
        name: 'Dummy Pimpinan',
        passwordHash: hashed,
        role: 'PIMPINAN',
        unitId: unitKpak.id,
        lembagaId: lembaga!.id,
      },
    });
  }

  // Ensure a financial category exists with INCOME and EXPENSE types
  let incomeCat = await prisma.financialCategory.findFirst({ where: { code: 'DK-INC' } });
  if (!incomeCat) {
    incomeCat = await prisma.financialCategory.create({
      data: {
        name: 'Dummy Income',
        code: 'DK-INC',
        type: 'INCOME',
        lembagaId: lembaga!.id,
      },
    });
  }

  let expenseCat = await prisma.financialCategory.findFirst({ where: { code: 'DK-EXP' } });
  if (!expenseCat) {
    expenseCat = await prisma.financialCategory.create({
      data: {
        name: 'Dummy Expense',
        code: 'DK-EXP',
        type: 'EXPENSE',
        lembagaId: lembaga!.id,
      },
    });
  }

  return { lembaga, unitKpak, unitKantin, creator, approver, incomeCat, expenseCat };
}

async function main() {
  console.log('🎯 Starting dummy approval seed...');

  const ctx = await getOrCreateDummyContext();

  // Static list of dummy approval scenarios for reproducible testing
  const scenarios = [
    { isIncome: true,  unit: ctx.unitKpak,     status: 'PENDING'  as const },
    { isIncome: false, unit: ctx.unitKpak,      status: 'APPROVED' as const },
    { isIncome: true,  unit: ctx.unitKantin,   status: 'REJECTED' as const },
    { isIncome: false, unit: ctx.unitKpak,     status: 'PENDING'  as const },
    { isIncome: true,  unit: ctx.unitKantin,   status: 'APPROVED' as const },
  ];

  let created = 0;
  for (const [i, s] of scenarios.entries()) {
    const categoryId = s.isIncome ? ctx.incomeCat.id : ctx.expenseCat.id;
    const txnType = s.isIncome ? ('INCOME' as const) : ('EXPENSE' as const);
    const txnPstatus = s.status === 'PENDING' ? 'PENDING' : s.status;
    const ref = `DUM-${String(i + 1).padStart(4, '0')}`;
    const amount = [500000, 1250000, 75000, 3000000, 2000000][i % 5];
    const products = ['Pensil', 'Buku Tulis', 'Nasi Goreng', 'Mineral', 'Kopi'];
    const descs = [
      '[dummy] Setoran pemasukan dari donasi',
      '[dummy] Pengeluaran pembelian perlengkapan',
      '[dummy] Penjualan menu kantin',
      '[dummy] Pemasukan dari iuran',
      '[dummy] Pengeluaran gaji karyawan',
    ];
    const methods = ['CASH', 'bank_transfer', 'e_wallet', 'CASH', 'CASH'] as const;

    const txn = await prisma.transaction.create({
      data: {
        unitId: s.unit.id,
        type: txnType,
        amount: Number(amount),
        description: descs[i],
        reference: ref,
        date: new Date(Date.now() - i * 86400000), // one day apart
        status: txnPstatus as any,
        paymentMethod: methods[i],
        createdById: ctx.creator.id,
        categoryId: categoryId,
      },
    });

    // Routing sesuai alur persetujuan ALBA:
    //  dibuat STAFF -> MANAGER unit; dibuat MANAGER -> PIMPINAN lembaga.
    //  Fallback: SUPERADMIN.
    let targetApproverId = ctx.approver.id;
    const superadmin = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN', isActive: true },
      select: { id: true },
    });
    if (ctx.creator.role === 'MANAGER') {
      const pimpinanLembaga = await prisma.user.findFirst({
        where: {
          role: 'PIMPINAN',
          isActive: true,
          lembagaId: s.unit.lembagaId ?? undefined,
        },
        select: { id: true },
      });
      targetApproverId = pimpinanLembaga?.id ?? superadmin?.id ?? ctx.approver.id;
    }
    // creator STAFF: MANAGER unit dummy tidak ada -> tetap ke approver (PIMPINAN) dummy

    const existing = await prisma.approval.findFirst({
      where: { transactionId: txn.id, status: s.status as any },
    });
    if (!existing) {
      await prisma.approval.create({
        data: {
          transactionId: txn.id,
          approverId: targetApproverId,
          unitId: txn.unitId,
          status: s.status as any,
          comment:
            s.status === 'APPROVED'
              ? `Disetujui oleh ${ctx.approver.name} — transaksi sesuai.`
              : s.status === 'REJECTED'
              ? `Ditolak oleh ${ctx.approver.name} — butuh revisi.`
              : undefined,
        },
      });
    }

    // For APPROVED/REJECTED, ensure transaction is approved/rejected too
    if (s.status !== 'PENDING') {
      await prisma.transaction.update({
        where: { id: txn.id },
        data: {
          status: s.status as any,
          approvedById: ctx.approver.id,
          approvedAt: new Date(),
        },
      });
    }

    created++;
    console.log(
      `✅ Created dummy txn + approval (${s.status}) for ${s.unit.name}: ${descs[i]}`,
    );
  }

  console.log(`\n🎉 Done! Created ${created} dummy approval records.`);
  console.log('   Login sebagai approver: dummy-pimpinan@alba.local / Bismillah123!');
}

main()
  .catch((e) => {
    console.error('❌ Dummy approval seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

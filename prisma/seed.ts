import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('bismillah', 10);

  // --- 1 Lembaga ---
  const lembaga = await prisma.lembaga.upsert({
    where: { code: 'ALBA' },
    update: {},
    create: {
      name: 'ALBA Finance Central',
      code: 'ALBA',
      description: 'Kantor pusat Yayasan ALBA Finance',
      isActive: true,
    },
  });

  // --- 4 Unit (2 retail, 2 non-retail) ---
  const units: { code: string; name: string; retail: boolean }[] = [
    { code: 'KPAK',    name: 'KPAK',       retail: true  },
    { code: 'UMI',     name: 'Kantin Umi', retail: true  },
    { code: 'KBARU',   name: 'Kantin Baru', retail: false },
    { code: 'KOPBUKU', name: 'Koperasi Buku', retail: false },
  ];

  const createdUnits: { [key: string]: string } = {};
  for (const u of units) {
    const unit = await prisma.unit.upsert({
      where: { code: u.code },
      update: { isRetail: u.retail },
      create: {
        name: u.name,
        code: u.code,
        description: `${u.name} unit ${u.retail ? 'retail' : 'non-retail'}`,
        isActive: true,
        isRetail: u.retail,
        lembagaId: lembaga.id,
      },
    });
    createdUnits[u.code] = unit.id;
    console.log(`  Unit: ${u.name} (${u.retail ? 'retail' : 'non-retail'})`);
  }

  // --- Users ---
  const pimpinan = await prisma.user.upsert({
    where: { email: 'pimpinan@alba.test' },
    update: { passwordHash },
    create: {
      email: 'pimpinan@alba.test',
      name: 'CEO Pimpinan',
      passwordHash,
      role: 'PIMPINAN',
      unitId: null, // pimpinan tanpa unit khusus
    },
  });

  const manager1 = await prisma.user.upsert({
    where: { email: 'manager1@alba.test' },
    update: { passwordHash },
    create: {
      email: 'manager1@alba.test',
      name: 'Manager KPAK',
      passwordHash,
      role: 'MANAGER',
      unitId: createdUnits['KPAK'],
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { email: 'manager2@alba.test' },
    update: { passwordHash },
    create: {
      email: 'manager2@alba.test',
      name: 'Manager Kantin Umi',
      passwordHash,
      role: 'MANAGER',
      unitId: createdUnits['UMI'],
    },
  });

  const manager3 = await prisma.user.upsert({
    where: { email: 'manager3@alba.test' },
    update: { passwordHash },
    create: {
      email: 'manager3@alba.test',
      name: 'Manager Kantin Baru',
      passwordHash,
      role: 'MANAGER',
      unitId: createdUnits['KBARU'],
    },
  });

  const staff1 = await prisma.user.upsert({
    where: { email: 'staff1@alba.test' },
    update: { passwordHash },
    create: {
      email: 'staff1@alba.test',
      name: 'Staff Koperasi Buku',
      passwordHash,
      role: 'STAFF',
      unitId: createdUnits['KOPBUKU'],
    },
  });

  // --- Sample Transactions (untuk laporan / rekonsiliasi) ---
  await prisma.transaction.createMany({
    data: [
      {
        unitId: createdUnits['KPAK'],
        type: 'INCOME',
        amount: 1500000,
        description: 'Penjualan produk KPAK pagi',
        reference: 'INV-001',
        status: 'APPROVED',
        createdById: manager1.id,
        approvedById: pimpinan.id,
        createdAt: new Date('2026-08-20T08:00:00Z'),
      },
      {
        unitId: createdUnits['UMI'],
        type: 'INCOME',
        amount: 2500000,
        description: 'Omzet kantin Umi',
        reference: 'INV-002',
        status: 'APPROVED',
        createdById: manager2.id,
        approvedById: pimpinan.id,
        createdAt: new Date('2026-08-21T12:00:00Z'),
      },
      {
        unitId: createdUnits['KBARU'],
        type: 'EXPENSE',
        amount: 500000,
        description: 'Beli bahan baku',
        reference: 'EXP-001',
        status: 'PENDING',
        createdById: manager3.id,
        createdAt: new Date('2026-08-22T09:30:00Z'),
      },
      {
        unitId: createdUnits['KOPBUKU'],
        type: 'INCOME',
        amount: 300000,
        description: 'Peminjaman buku',
        reference: 'TRANS-003',
        status: 'APPROVED',
        createdById: staff1.id,
        approvedById: pimpinan.id,
        createdAt: new Date('2026-08-23T15:00:00Z'),
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed complete.');
  console.log('');
  console.log('Default credentials (password: bismillah):');
  console.log('  Pimpinan   : pimpinan@alba.test');
  console.log('  Manager KPAK : manager1@alba.test');
  console.log('  Manager UMI  : manager2@alba.test');
  console.log('  Manager KBARU : manager3@alba.test');
  console.log('  Staff KOPBUKU : staff1@alba.test');
  console.log('');
  console.log('Unit info: KPAK & Kantin Umi = retail (POS/Inv aktif); Kantin Baru & Koperasi Buku = non-retail');
  console.log('⚠️  Segera ganti password setelah login pertama!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

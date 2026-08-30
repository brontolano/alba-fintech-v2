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

  // Set KBARU as child unit of KPAK (parent relationship)
  await prisma.unit.update({
    where: { id: createdUnits['KBARU'] },
    data: { parentId: createdUnits['KPAK'] },
  });
  console.log('  Unit: KBARU -> parent KPAK (hierarchy set)');

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

  // --- Chart of Accounts (untuk fitur akuntansi / laporan keuangan) ---
  const kasUnit = await prisma.account.upsert({
    where: { code: '1-101-00' },
    update: { isActive: true },
    create: {
      name: 'Kas Unit',
      code: '1-101-00',
      type: 'ASSET',
      description: 'Uang tunai di masing-masing unit',
    },
  });

  const modalSendiri = await prisma.account.upsert({
    where: { code: '3-301-00' },
    update: { isActive: true },
    create: {
      name: 'Modal Sendiri',
      code: '3-301-00',
      type: 'EQUITY',
      description: 'Ekuitas pemilik',
    },
  });

  const pendapatanJualan = await prisma.account.upsert({
    where: { code: '4-401-00' },
    update: { isActive: true },
    create: {
      name: 'Pendapatan Penjualan',
      code: '4-401-00',
      type: 'INCOME',
      description: 'Pendapatan utama dari penjualan produk/jasa',
    },
  });

  const bebanBiaya = await prisma.account.upsert({
    where: { code: '5-501-00' },
    update: { isActive: true },
    create: {
      name: 'Beban Usaha',
      code: '5-501-00',
      type: 'EXPENSE',
      description: 'Biaya operasional dan pokok penjualan',
      parentId: kasUnit.id,
    },
  });

  console.log('✅ Seed complete.');
  console.log('');

  // --- Sample Broadcast (draft untuk superadmin, akan dikirim ke semua unit) ---
  await prisma.broadcastMessage.upsert({
    where: { id: 'seed-broadcast-welcome' },
    update: {},
    create: {
      id: 'seed-broadcast-welcome',
      title: 'Selamat Datang di ALBA Finance v2',
      message: 'Sistem keuangan terbaru siap digunakan. Silakan cek dashboard unit masing-masing.',
      type: 'INFO' as any,
      priority: 'NORMAL' as any,
      isDraft: true,
      isSent: false,
      senderId: pimpinan.id,
      lembagaId: lembaga.id,
    },
  });
  console.log('  Broadcast: draft sambutan (DRAFT, pimpinan)');

  // --- Sample Admin settings for units ---
  // (placeholder untuk pengaturan unit yang akan dikelola lewat UI superadmin)
  await prisma.unitSetting.upsert({
    where: { unitId: createdUnits['KPAK'] },
    update: {
      posEnabled: true,
      inventoryEnabled: true,
      autoApproval: false,
    },
    create: {
      unitId: createdUnits['KPAK'],
      posEnabled: true,
      inventoryEnabled: true,
      autoApproval: false,
    },
  });
  console.log('  UnitSetting: KPAK (POS+Inventory aktif, auto-approval off)');

  // --- Sample Inventory Item per unit ---
  await prisma.inventoryItem.createMany({
    data: [
      {
        unitId: createdUnits['UMI'],
        name: 'Kopi Hitam',
        sku: 'KOP-001',
        currentStock: 50,
        minStock: 10,
        unitPrice: 5000,
        category: 'Minuman',
        isActive: true,
      },
      {
        unitId: createdUnits['KOPBUKU'],
        name: 'Buku Tulis',
        sku: 'BK-001',
        currentStock: 100,
        minStock: 20,
        unitPrice: 8000,
        category: 'Perlengkapan',
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log('  Inventory: 2 sample items (UMI kopi, KOPBUKU buku)');

  console.log('✅ Seed complete.');
  console.log('');
  console.log('Default credentials (password: bismillah):');
  console.log('  Pimpinan     : pimpinan@alba.test');
  console.log('  Manager KPAK : manager1@alba.test');
  console.log('  Manager UMI  : manager2@alba.test');
  console.log('  Manager KBARU : manager3@alba.test');
  console.log('  Staff KOPBUKU : staff1@alba.test');
  console.log('');
  console.log('Unit info: KPAK & Kantin Umi = retail (POS/Inv aktif); Kantin Baru & Koperasi Buku = non-retail');
  console.log('Hierarchy: KBARU parent = KPAK');
  console.log('Akun buku besar: 4 akun (Kas Unit, Modal Sendiri, Pendapatan Jualan, Beban Usaha)');
  console.log('Broadcast: 1 draft info dari pimpinan');
  console.log('Inventory: 2 sample items di UMI + KOPBUKU');
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

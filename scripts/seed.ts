import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create default lembaga
  const lembaga = await prisma.lembaga.upsert({
    where: { code: 'AL-BASYARIYAH' },
    update: {},
    create: {
      name: 'Pondok Pesantren Al-Basyariyah',
      code: 'AL-BASYARIYAH',
      description:
        'Pondok Pesantren Al-Basyariyah - Jl. Mahmud, Rahayu, Kec. Margaasih, Kabupaten Bandung, Jawa Barat 40218',
      address:
        'Jl. Mahmud, Rahayu, Kec. Margaasih, Kabupaten Bandung, Jawa Barat 40218',
      isActive: true,
    },
  });
  console.log('🏛️  Created lembaga:', lembaga.name);

  // Create units
  const units = [
    {
      name: 'KPAK',
      code: 'KPK-01',
      description:
        'Kantor Pelayanan Administrasi Keuangan - Penyimpanan Uang (Tabungan Santri), Pembayaran Administrasi Sekolah, Integrasi Pembelian Alat Transaksi Internal (Kupon)',
      type: 'KPAK' as const,
      isRetail: false,
      lembagaId: lembaga.id,
    },
    {
      name: 'Koperasi Buku',
      code: 'KOP-01',
      description: 'Koperasi buku dan perlengkapan sekolah',
      type: 'KOPERASI' as const,
      isRetail: true,
      lembagaId: lembaga.id,
    },
    {
      name: 'Kantin Umi',
      code: 'KNT-01',
      description: 'Kantin makanan dan jajanan - dikelola oleh Umi',
      type: 'KANTIN' as const,
      isRetail: true,
      lembagaId: lembaga.id,
    },
    {
      name: 'Kantin Baru',
      code: 'KNT-02',
      description: 'Kantin makanan dan jajanan baru',
      type: 'KANTIN' as const,
      isRetail: true,
      lembagaId: lembaga.id,
    },
  ];

  for (const unitData of units) {
    const unit = await prisma.unit.upsert({
      where: { code: unitData.code },
      update: {},
      create: unitData,
    });
    console.log(`🏢 Created unit: ${unit.name} (${unit.code})`);

    // Create unit settings
    await prisma.unitSetting.upsert({
      where: { unitId: unit.id },
      update: {},
      create: {
        unitId: unit.id,
        posEnabled: unitData.isRetail,
        inventoryEnabled: unitData.isRetail,
        autoApproval: false,
        requiresApproval: true,
      },
    });
  }

  // Create financial categories
  const categories = [
    { name: 'Pemasukan Administrasi', code: 'INC-ADM', type: 'INCOME' as const },
    { name: 'Tabungan Santri', code: 'INC-TAB', type: 'INCOME' as const },
    { name: 'Penjualan Barang', code: 'INC-PEN', type: 'INCOME' as const },
    { name: 'Donasi', code: 'INC-DON', type: 'INCOME' as const },
    { name: 'Pengeluaran Operasional', code: 'EXP-OPR', type: 'EXPENSE' as const },
    { name: 'Pembelian Barang', code: 'EXP-BEL', type: 'EXPENSE' as const },
    { name: 'Gaji Karyawan', code: 'EXP-GAJ', type: 'EXPENSE' as const },
    { name: 'Listrik & Air', code: 'EXP-LST', type: 'EXPENSE' as const },
  ];

  for (const cat of categories) {
    await prisma.financialCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: {
        ...cat,
        lembagaId: lembaga.id,
      },
    });
  }
  console.log('📊 Created financial categories');

  // Create users
  const users = [
    {
      email: 'superadmin@alba.local',
      name: 'Hamdan',
      role: 'SUPERADMIN' as const,
      password: 'Bismillah123!',
    },
    {
      email: 'pimpinan@alba.local',
      name: 'Ust. Ahmad',
      role: 'PIMPINAN' as const,
      password: 'Bismillah123!',
    },
    {
      email: 'manager.kpk@alba.local',
      name: 'Saudara Ali',
      role: 'MANAGER' as const,
      unitCode: 'KPK-01',
      password: 'Bismillah123!',
    },
    {
      email: 'manager.koperasi@alba.local',
      name: 'Saudara Budi',
      role: 'MANAGER' as const,
      unitCode: 'KOP-01',
      password: 'Bismillah123!',
    },
    {
      email: 'staff.kantin@alba.local',
      name: 'Saudara Charlie',
      role: 'STAFF' as const,
      unitCode: 'KNT-01',
      password: 'Bismillah123!',
    },
  ];

  for (const userData of users) {
    const { unitCode, password, ...rest } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);

    let unitId;
    if (unitCode) {
      const unit = await prisma.unit.findUnique({ where: { code: unitCode } });
      unitId = unit?.id;
    }

    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...rest,
        passwordHash: hashedPassword,
        lembagaId: lembaga.id,
        unitId,
      },
    });
    console.log(`👤 Created user: ${userData.email} (${userData.role})`);
  }

  // Create inventory items for retail units
  const retailUnits = await prisma.unit.findMany({ where: { isRetail: true } });
  const inventoryItems = [];

  for (const unit of retailUnits) {
    const items = [
      {
        name: 'Nasi Goreng',
        sku: `NG-${unit.code}`,
        category: 'Makanan',
        currentStock: 100,
        minStock: 10,
        unitPrice: 15000,
        purchasePrice: 10000,
        isActive: true,
      },
      {
        name: 'Mie Goreng',
        sku: `MG-${unit.code}`,
        category: 'Makanan',
        currentStock: 80,
        minStock: 15,
        unitPrice: 13000,
        purchasePrice: 9000,
        isActive: true,
      },
      {
        name: 'Es Teh Manis',
        sku: `ET-${unit.code}`,
        category: 'Minuman',
        currentStock: 150,
        minStock: 20,
        unitPrice: 8000,
        purchasePrice: 5000,
        isActive: true,
      },
      {
        name: 'Air Mineral',
        sku: `AM-${unit.code}`,
        category: 'Minuman',
        currentStock: 200,
        minStock: 30,
        unitPrice: 5000,
        purchasePrice: 3000,
        isActive: true,
      },
      {
        name: 'Bubur Ayam',
        sku: `BA-${unit.code}`,
        category: 'Makanan',
        currentStock: 60,
        minStock: 8,
        unitPrice: 12000,
        purchasePrice: 8000,
        isActive: true,
      },
    ];

    for (const itemData of items) {
      const item = await prisma.inventoryItem.upsert({
        where: { sku: itemData.sku },
        update: { unitId: unit.id, ...itemData },
        create: {
          ...itemData,
          unitId: unit.id,
        },
      });
      inventoryItems.push(item);
      console.log(`📦 Created inventory item: ${item.name} for ${unit.name}`);
    }
  }

  console.log(`📦 Created ${inventoryItems.length} inventory items total`);

  // Dummy transactions
  const staffKantin = await prisma.user.findUnique({ where: { email: 'staff.kantin@alba.local' } });
  const mgrKoperasi = await prisma.user.findUnique({ where: { email: 'manager.koperasi@alba.local' } });
  const mgrKpk = await prisma.user.findUnique({ where: { email: 'manager.kpk@alba.local' } });
  const incomeSales = await prisma.financialCategory.findUnique({ where: { code: 'INC-PEN' } });
  const incomeAdmin = await prisma.financialCategory.findUnique({ where: { code: 'INC-ADM' } });
  const incomeSavings = await prisma.financialCategory.findUnique({ where: { code: 'INC-TAB' } });
  const expensePurch = await prisma.financialCategory.findUnique({ where: { code: 'EXP-BEL' } });
  const expenseSalary = await prisma.financialCategory.findUnique({ where: { code: 'EXP-GAJ' } });

  // Idempotency guard — remove prior dummy rows before re-seeding
  const existingDummy = await prisma.transaction.findMany({ where: { description: { startsWith: '[dummy]' } } });
  if (existingDummy.length > 0) {
    await prisma.transaction.deleteMany({ where: { description: { startsWith: '[dummy]' } } });
  }

  const txns = [
    // KPAK — penerimaan tabungan & admin
    { unitCode: 'KPK-01', userId: mgrKpk!.id, categoryId: incomeSavings!.id, type: 'INCOME', amount: 5000000, desc: '[dummy] Setoran tabungan santri - Uang pangkal' },
    { unitCode: 'KPK-01', userId: mgrKpk!.id, categoryId: incomeAdmin!.id, type: 'INCOME', amount: 1500000, desc: '[dummy] Pembayaran administrasi pendaftaran' },
    // Koperasi — penjualan & pembelian
    { unitCode: 'KOP-01', userId: mgrKoperasi!.id, categoryId: incomeSales!.id, type: 'INCOME', amount: 750000, desc: '[dummy] Penjualan buku/cangkang buku' },
    { unitCode: 'KOP-01', userId: mgrKoperasi!.id, categoryId: expensePurch!.id, type: 'EXPENSE', amount: 300000, desc: '[dummy] Pembelian buku baku dari penerbit' },
    // Kantin Umi — penjualan & pengeluaran
    { unitCode: 'KNT-01', userId: staffKantin!.id, categoryId: incomeSales!.id, type: 'INCOME', amount: 420000, desc: '[dummy] Penjualan menu kantin (nasi goreng/mie)' },
    { unitCode: 'KNT-01', userId: staffKantin!.id, categoryId: expensePurch!.id, type: 'EXPENSE', amount: 180000, desc: '[dummy] Pembelian bahan baku masak' },
    { unitCode: 'KNT-01', userId: mgrKoperasi!.id, categoryId: expenseSalary!.id, type: 'EXPENSE', amount: 2000000, desc: '[dummy] Gaji karyawan kantin umi (2 orang)' },
    // Kantin Baru — penjualan & pengeluaran
    { unitCode: 'KNT-02', userId: staffKantin!.id, categoryId: incomeSales!.id, type: 'INCOME', amount: 510000, desc: '[dummy] Penjualan menu kantin baru' },
    { unitCode: 'KNT-02', userId: staffKantin!.id, categoryId: expensePurch!.id, type: 'EXPENSE', amount: 220000, desc: '[dummy] Pembelian bahan dan minuman' },
    { unitCode: 'KNT-02', userId: mgrKoperasi!.id, categoryId: expenseSalary!.id, type: 'EXPENSE', amount: 2500000, desc: '[dummy] Gaji karyawan kantin baru (3 orang)' },
  ];

  for (const t of txns) {
    const unit = (await prisma.unit.findUnique({ where: { code: t.unitCode } }))!;
    const txn = await prisma.transaction.create({
      data: {
        unitId: unit.id,
        type: t.type as any,
        amount: t.amount,
        description: t.desc.substring(t.desc.indexOf(']') + 2),
        reference: t.desc,
        date: new Date(),
        status: 'APPROVED',
        paymentMethod: t.type === 'INCOME' ? 'CASH' : 'CASH',
        isPimpinanNote: false,
        createdById: t.userId,
        categoryId: t.categoryId,
      },
    });
    console.log(`💸 Created transaction: ${t.desc.substring(t.desc.indexOf(']') + 2)} at ${unit!.name}`);
  }

  // Catatan keuangan pimpinan (revenue summary)
  const pimpinan = await prisma.user.findUnique({ where: { email: 'pimpinan@alba.local' } });
  if (pimpinan) {
    await prisma.financialNote.upsert({
      where: { id: 'dummy-revenue-summary' },
      update: { amount: 2435000 },
      create: {
        id: 'dummy-revenue-summary',
        title: 'Rekap Pemasukan Harian',
        description: '[dummy] Total pemasukan harian gabungan dari seluruh unit',
        amount: 2435000,
        type: 'INCOME',
        date: new Date(),
        createdById: pimpinan.id,
      },
    });
    console.log(`📝 Created pimpinan financial note: Rekap Pemasukan Harian`);
  }

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
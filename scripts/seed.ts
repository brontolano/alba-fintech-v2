import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const bcrypt = require('bcryptjs');

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
    await prisma.unitSetting.create({
      data: {
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
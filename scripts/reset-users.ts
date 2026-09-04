/**
 * Reset Users Script untuk Al-Basyariyah Financial Management System v3
 *
 * Script ini:
 * 1. Menghapus semua user (beserta data terkait untuk referential integrity)
 * 2. Memastikan entitas dasar (lembaga, unit, financial categories) ada
 * 3. Membuat akun superadmin baru: admin@brontolano.com / bismillah
 *
 * **PERINGATAN:** Script ini bersifat destruktif. Pastikan backup database tersedia.
 *
 * Penggunaan:
 *   npm run reset:users
 *
 * Environment:
 *   Script akan otomatis memakai variabel lingkungan dari .env.production
 *   jika NODE_ENV=production, atau .env.local untuk development.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 === Reset Users Script ===\n');
  console.log('⚠️  WARNING: Script ini akan MENGHAPUS SEMUA USER di database.');
  console.log('   Pastikan Anda memiliki backup database sebelum melanjutkan.\n');

  // ========================================
  // LANGKAH 1: Hapus data yang mereferensi User
  // ========================================
  console.log('🗑️  Menghapus data terkait user (referential integrity)...');

  // Hapus tabel-tabel child yang mereferensi User
  // Urutan penting untuk menghindari FK constraint error
  await prisma.pushSubscription.deleteMany({});
  console.log('   ✓ PushSubscription deleted');

  await prisma.notification.deleteMany({});
  console.log('   ✓ Notification deleted');

  await prisma.auditLog.deleteMany({});
  console.log('   ✓ AuditLog deleted');

  await prisma.broadcastRecipient.deleteMany({});
  console.log('   ✓ BroadcastRecipient deleted');

  await prisma.approval.deleteMany({});
  console.log('   ✓ Approval deleted');

  await prisma.financialNote.deleteMany({});
  console.log('   ✓ FinancialNote deleted');

  await prisma.transaction.deleteMany({});
  console.log('   ✓ Transaction deleted');

  await prisma.broadcastMessage.deleteMany({});
  console.log('   ✓ BroadcastMessage deleted');

  // ========================================
  // LANGKAH 2: Hapus semua user
  // ========================================
  console.log('\n🗑️  Menghapus semua user...');
  const deletedCount = await prisma.user.deleteMany({});
  console.log(`   ✓ ${deletedCount.count} user(s) deleted\n`);

  // ========================================
  // LANGKAH 3: Pastikan entitas dasar ada
  // ========================================
  console.log('🏗️  Memastikan entitas dasar tersedia...');

  // Lembaga
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
  console.log(`   ✓ Lembaga: ${lembaga.name}`);

  // Unit KPAK
  const unit = await prisma.unit.upsert({
    where: { code: 'KPK-01' },
    update: {},
    create: {
      name: 'KPAK',
      code: 'KPK-01',
      description:
        'Kantor Pelayanan Administrasi Keuangan - Penyimpanan Uang (Tabungan Santri)',
      type: 'KPAK',
      isRetail: false,
      lembagaId: lembaga.id,
    },
  });
  console.log(`   ✓ Unit: ${unit.name} (${unit.code})`);

  // Financial Categories (untuk keutuhan data)
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
      create: { ...cat, lembagaId: lembaga.id },
    });
  }
  console.log(`   ✓ ${categories.length} financial categories ensured\n`);

  // ========================================
  // LANGKAH 4: Buat akun superadmin baru
  // ========================================
  console.log('👤 Membuat akun superadmin baru...');
  const password = 'bismillah';
  const hashedPassword = await bcrypt.hash(password, 12);

  const superadmin = await prisma.user.create({
    data: {
      email: 'admin@brontolano.com',
      name: 'SuperAdmin',
      passwordHash: hashedPassword,
      role: 'SUPERADMIN',
      lembagaId: lembaga.id,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  console.log(`\n✅ Superadmin berhasil dibuat:`);
  console.log(`   Email:    ${superadmin.email}`);
  console.log(`   Name:     ${superadmin.name}`);
  console.log(`   Role:     ${superadmin.role}`);
  console.log(`   User ID:  ${superadmin.id}`);
  console.log(`   Created:  ${superadmin.createdAt}\n`);

  // ========================================
  // LANGKAH 5: Verifikasi akhir
  // ========================================
  const userCount = await prisma.user.count();
  const superadminExists = await prisma.user.findUnique({
    where: { email: 'admin@brontolano.com' },
  });

  console.log('📊 === Ringkasan ===');
  console.log(`   Total user di database: ${userCount}`);
  console.log(`   Superadmin ditemukan:   ${superadminExists ? '✅ Ya' : '❌ Tidak'}`);
  console.log(`   Total lembaga:          ${await prisma.lembaga.count()}`);
  console.log(`   Total unit:            ${await prisma.unit.count()}`);
  console.log(`   Total financial cat:   ${await prisma.financialCategory.count()}`);
  console.log('\n🎉 Reset users selesai!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

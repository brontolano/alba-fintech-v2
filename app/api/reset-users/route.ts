import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * API endpoint untuk reset semua user dan membuat superadmin baru.
 * Endpoint ini sengaja dibuka (tanpa auth) karena digunakan untuk setup awal.
 * SETELAH SETUP SELESAI, endpoint ini HARUS dihapus atau dikunci.
 *
 * POST /api/reset-users
 * { "confirm": true, "email": "admin@brontolano.com", "password": "bismillah" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.confirm) {
      return NextResponse.json(
        { error: 'Confirmation required. Send { "confirm": true }' },
        { status: 400 }
      );
    }

    // Validate credentials
    const email = body.email || 'admin@brontolano.com';
    const password = body.password || 'bismillah';

    console.log('🔄 Starting user reset...');

    // Step 1: Delete related data (referential integrity)
    await prisma.pushSubscription.deleteMany({});
    console.log('✓ pushSubscriptions deleted');

    await prisma.notification.deleteMany({});
    console.log('✓ notifications deleted');

    await prisma.auditLog.deleteMany({});
    console.log('✓ auditLogs deleted');

    await prisma.broadcastRecipient.deleteMany({});
    console.log('✓ broadcastRecipients deleted');

    await prisma.approval.deleteMany({});
    console.log('✓ approvals deleted');

    await prisma.financialNote.deleteMany({});
    console.log('✓ financialNotes deleted');

    await prisma.transaction.deleteMany({});
    console.log('✓ transactions deleted');

    await prisma.broadcastMessage.deleteMany({});
    console.log('✓ broadcastMessages deleted');

    // Step 2: Delete all users
    const deleted = await prisma.user.deleteMany({});
    console.log(`✓ ${deleted.count} users deleted`);

    // Step 3: Ensure lembaga exists
    const lembaga = await prisma.lembaga.upsert({
      where: { code: 'AL-BASYARIYAH' },
      update: {},
      create: {
        name: 'Pondok Pesantren Al-Basyariyah',
        code: 'AL-BASYARIYAH',
        description: 'Pondok Pesantren Al-Basyariyah',
        address: 'Jl. Mahmud, Rahayu, Kec. Margaasih, Kabupaten Bandung, Jawa Barat 40218',
        isActive: true,
      },
    });
    console.log('✓ Lembaga ensured');

    // Step 4: Ensure Unit KPAK exists
    const unit = await prisma.unit.upsert({
      where: { code: 'KPK-01' },
      update: {},
      create: {
        name: 'KPAK',
        code: 'KPK-01',
        description: 'Kantor Pelayanan Administrasi Keuangan',
        type: 'KPAK',
        isRetail: false,
        lembagaId: lembaga.id,
      },
    });
    console.log('✓ Unit ensured');

    // Step 5: Create financial categories
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
    console.log('✓ Financial categories ensured');

    // Step 6: Create superadmin
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
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

    const userCount = await prisma.user.count();

    console.log(`✅ Superadmin created: ${user.email}`);
    console.log(`📊 Total users: ${userCount}`);

    return NextResponse.json({
      success: true,
      message: 'All users reset and superadmin created',
      deletedUsers: deleted.count,
      superadmin: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      totalUsers: userCount,
    });
  } catch (error: any) {
    console.error('❌ Reset users error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}

// Allow GET untuk mengecek status (info saja, tidak reset)
export async function GET(request: NextRequest) {
  const userCount = await prisma.user.count();
  const users = await prisma.user.findMany({
    select: { email: true, name: true, role: true },
  });
  return NextResponse.json({
    message: 'Endpoint reset-users aktif. POST dengan { "confirm": true, "email": "...", "password": "..." } untuk reset.',
    userCount,
    users,
  });
}

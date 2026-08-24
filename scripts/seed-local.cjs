/* eslint-disable */
/**
 * Seed script untuk lokal SQLite dev DB.
 * Jalankan: node scripts/seed-local.cjs
 */
const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const db = new PrismaClient();

async function main() {
  // Wipe existing
  await db.user?.deleteMany?.().catch(() => {});

  const users = [
    { email: 'admin@brontolano.com', name: 'Super Admin', role: 'SUPERADMIN' },
    { email: 'pimpinan@brontolano.com', name: 'Pimpinan', role: 'PIMPINAN' },
    { email: 'manager@brontolano.com', name: 'Manager', role: 'MANAGER' },
    { email: 'staff@brontolano.com', name: 'Staff', role: 'STAFF' },
  ];

  for (const u of users) {
    const hash = await bcryptjs.hash('bismillah', 10);
    await db.user.upsert({
      where: { email: u.email },
      update: { password: hash, role: u.role, status: 'active' },
      create: {
        id: `usr_${u.role.toLowerCase()}_${Date.now()}`,
        email: u.email,
        name: u.name,
        password: hash,
        role: u.role,
        status: 'active',
      },
    });
    console.log(`✅ Seeded: ${u.email} (${u.role})`);
  }

  console.log('\n🎉 Seed complete!');
}

main()
  .catch(e => console.error(e))
  .finally(() => db.$disconnect());
